"use server"

import { db } from "@/lib/db"
import { getTeamId } from "@/lib/auth-utils"

export async function getDashboardStats(range?: { from?: Date, to?: Date }) {
    try {
        const teamId = await getTeamId()

        // Tạo điều kiện lọc theo team
        const teamFilter = teamId ? { dispatch: { teamId } } : {}
        const dispatchTeamFilter = teamId ? { teamId } : {}

        const importCount = await db.transformer.count({
            where: {
                dispatch: {
                    type: "IMPORT",
                    ...dispatchTeamFilter
                }
            }
        })

        const exportCount = await db.transformer.count({
            where: {
                dispatch: {
                    type: "EXPORT",
                    ...dispatchTeamFilter
                }
            }
        })

        // Filter Recent Transactions
        const whereClause: any = { ...teamFilter }
        if (range?.from || range?.to) {
            const dateFilter: any = {}
            if (range.from) {
                const fromDate = new Date(range.from)
                fromDate.setHours(0, 0, 0, 0)
                dateFilter.gte = fromDate
            }
            if (range.to) {
                const toDate = new Date(range.to)
                toDate.setHours(23, 59, 59, 999)
                dateFilter.lte = toDate
            }

            whereClause.dispatch = {
                ...dispatchTeamFilter,
                OR: [
                    { transactionDate: dateFilter },
                    { transactionDate: null, date: dateFilter }
                ]
            }
        }

        const recentTransformers = await db.transformer.findMany({
            take: range?.from || range?.to ? 1000 : 20, // Increase limit if filtering
            where: whereClause,
            orderBy: {
                // If filtering by date, maybe order by dispatch date?
                // But createdAt is fine for "recent within range"
                dispatch: {
                    date: 'desc'
                }
            },
            include: {
                dispatch: {
                    include: {
                        linkedCv: true,
                        linkedTtrs: true // Thêm danh sách TTr liên kết với CV này
                    }
                }
            }
        })

        // Count unreturned MBA - đếm thực tế máy chưa hoàn thành vòng đời
        // Thay vì chỉ tính Import - Export, ta đếm dựa trên logic chi tiết
        const unreturnedResult = await getUnreturnedTransformers()
        const unreturnedCount = unreturnedResult.success ? unreturnedResult.data?.length || 0 : (importCount - exportCount)

        return {
            success: true,
            stats: {
                totalImported: importCount,
                totalExported: exportCount,
                unreturned: unreturnedCount,
            },
            recentTransformers: recentTransformers.map((t: any) => ({
                id: t.id,
                dispatchId: t.dispatch.id,
                serialNumber: t.serialNumber,
                capacity: t.capacity,
                model: t.model,
                note: t.note,
                imageUrl: t.imageUrl, // URL hình ảnh máy biến áp
                dispatchNumber: t.dispatch.dispatchNumber,
                date: t.dispatch.transactionDate || t.dispatch.date,
                type: t.dispatch.type,
                documentType: t.dispatch.documentType,
                isCBM: t.dispatch.isCBM,
                linkedCv: t.dispatch.linkedCv ? {
                    dispatchNumber: t.dispatch.linkedCv.dispatchNumber
                } : null,
                linkedTtrs: t.dispatch.linkedTtrs?.map((ttr: any) => ({
                    dispatchNumber: ttr.dispatchNumber
                })) || []
            }))
        }
    } catch (error) {
        console.error("Dashboard stats error:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}

// Lấy các transformers từ các CV/TTr chưa hoàn thành vòng đời
// Logic: Xét theo CV (không phải CBM)
// - CV Import có Export liên kết (exportedDispatches) = đã hoàn thành, loại trừ
// - CV Import không có Export liên kết = chưa trả
// - CV Export không có sourceDispatchId = trả lẻ  
// CBM xử lý riêng theo relation
export async function getUnreturnedTransformers() {
    try {
        const teamId = await getTeamId()
        const teamFilter = teamId ? { teamId } : {}

        const result: any[] = []

        // === PHẦN 1: CV/TTr thường (không phải CBM) - xét theo CV ===

        // Lấy Import (không CBM) kèm Export liên kết và linkedTtrs
        const allImports = await db.dispatch.findMany({
            where: {
                type: "IMPORT",
                isCBM: false,
                ...teamFilter
            },
            include: {
                transformers: true,
                linkedCv: true,
                linkedTtrs: true, // Để kiểm tra CV có TTr liên kết không
                exportedDispatches: true
            }
        })

        // Lọc: loại trừ TTr đã có CV liên kết VÀ CV đã có TTr liên kết
        const filteredImports = allImports.filter(dispatch => {
            // Nếu là TTr và đã có CV liên kết → loại trừ
            if (dispatch.documentType === "TTr" && dispatch.linkedCvId) {
                return false
            }
            // Nếu là CV và đã có TTr liên kết → loại trừ
            if (dispatch.documentType === "CV" && dispatch.linkedTtrs && dispatch.linkedTtrs.length > 0) {
                return false
            }
            return true
        })

        // 1.1: CV Import - xét từng máy theo capacity
        // So sánh capacity map giữa Import và Export liên kết
        for (const dispatch of filteredImports) {
            // Tạo capacity map từ Import (đếm số lượng mỗi loại)
            const importCapacityMap: Record<string, number> = {}
            for (const t of dispatch.transformers) {
                const cap = t.capacity || "unknown"
                importCapacityMap[cap] = (importCapacityMap[cap] || 0) + 1
            }

            // Tạo capacity map từ tất cả Export liên kết
            const exportCapacityMap: Record<string, number> = {}
            for (const exp of dispatch.exportedDispatches) {
                // Cần load transformers của Export
                const expWithTransformers = await db.dispatch.findUnique({
                    where: { id: exp.id },
                    include: { transformers: true }
                })
                if (expWithTransformers) {
                    for (const t of expWithTransformers.transformers) {
                        const cap = t.capacity || "unknown"
                        exportCapacityMap[cap] = (exportCapacityMap[cap] || 0) + 1
                    }
                }
            }

            // Tính số lượng chưa trả cho mỗi capacity
            const unreturnedByCapacity: Record<string, number> = {}
            for (const cap of Object.keys(importCapacityMap)) {
                const imported = importCapacityMap[cap] || 0
                const exported = exportCapacityMap[cap] || 0
                const unreturned = imported - exported
                if (unreturned > 0) {
                    unreturnedByCapacity[cap] = unreturned
                }
            }

            // Thêm từng máy chưa trả vào result
            // Duyệt qua transformers và đếm theo capacity
            const addedByCapacity: Record<string, number> = {}
            for (const t of dispatch.transformers) {
                const cap = t.capacity || "unknown"
                const needToAdd = unreturnedByCapacity[cap] || 0
                const alreadyAdded = addedByCapacity[cap] || 0

                if (alreadyAdded < needToAdd) {
                    result.push({
                        id: t.id,
                        dispatchId: dispatch.id,
                        serialNumber: t.serialNumber,
                        capacity: t.capacity,
                        model: t.model,
                        note: `📥 Chưa trả: ${t.note || ''}`.trim(),
                        dispatchNumber: dispatch.dispatchNumber,
                        date: dispatch.transactionDate || dispatch.date,
                        type: dispatch.type,
                        documentType: dispatch.documentType,
                        isCBM: dispatch.isCBM,
                        linkedCv: dispatch.linkedCv ? {
                            dispatchNumber: dispatch.linkedCv.dispatchNumber
                        } : null
                    })
                    addedByCapacity[cap] = alreadyAdded + 1
                }
            }
        }

        // 1.2: CV Export KHÔNG có sourceDispatchId = trả lẻ
        // Loại trừ TTr đã có CV liên kết
        const unlinkedExports = await db.dispatch.findMany({
            where: {
                type: "EXPORT",
                isCBM: false,
                sourceDispatchId: null,
                ...teamFilter,
                // Loại trừ TTr đã có CV liên kết
                OR: [
                    { documentType: "CV" },
                    { documentType: "TTr", linkedCvId: null }
                ]
            },
            include: {
                transformers: true
            }
        })

        for (const dispatch of unlinkedExports) {
            for (const t of dispatch.transformers) {
                result.push({
                    id: t.id,
                    dispatchId: dispatch.id,
                    serialNumber: t.serialNumber,
                    capacity: t.capacity,
                    model: t.model,
                    note: `📤 Export không có CV nhận liên kết: ${t.note || ''}`.trim(),
                    dispatchNumber: dispatch.dispatchNumber,
                    date: dispatch.transactionDate || dispatch.date,
                    type: dispatch.type,
                    documentType: dispatch.documentType,
                    isCBM: dispatch.isCBM,
                    linkedCv: null
                })
            }
        }

        // === PHẦN 2: Máy CBM đã TRẢ nhưng chưa NHẬN lại ===
        const cbmExports = await db.dispatch.findMany({
            where: {
                type: "EXPORT",
                isCBM: true,
                ...teamFilter
            },
            include: {
                transformers: true,
                sourceDispatch: true
            }
        })

        // Lấy tất cả Export IDs đã được nhận lại
        const returnedExportIds = new Set(
            (await db.dispatch.findMany({
                where: {
                    type: "IMPORT",
                    sourceDispatchId: { not: null }
                },
                select: { sourceDispatchId: true }
            })).map(d => d.sourceDispatchId)
        )

        for (const dispatch of cbmExports) {
            if (!returnedExportIds.has(dispatch.id)) {
                for (const t of dispatch.transformers) {
                    result.push({
                        id: t.id,
                        dispatchId: dispatch.id,
                        serialNumber: t.serialNumber,
                        capacity: t.capacity,
                        model: t.model,
                        note: `📤 CBM chưa nhận lại: ${t.note || ''}`.trim(),
                        dispatchNumber: dispatch.dispatchNumber,
                        date: dispatch.transactionDate || dispatch.date,
                        type: dispatch.type,
                        documentType: dispatch.documentType,
                        isCBM: dispatch.isCBM,
                        linkedCv: dispatch.sourceDispatch ? {
                            dispatchNumber: dispatch.sourceDispatch.dispatchNumber
                        } : null
                    })
                }
            }
        }

        return { success: true, data: result }
    } catch (error) {
        console.error("Error getting unreturned transformers:", error)
        return { success: false, error: "Lỗi lấy danh sách máy chưa hoàn thành", data: [] }
    }
}
