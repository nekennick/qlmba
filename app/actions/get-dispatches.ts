"use server"

import { db } from "@/lib/db"

// Helper: Tạo capacity map từ danh sách transformers
function createCapacityMap(transformers: { capacity: string | null }[]): Record<string, number> {
    const map: Record<string, number> = {}
    for (const t of transformers) {
        const cap = t.capacity || "unknown"
        map[cap] = (map[cap] || 0) + 1
    }
    return map
}

// Helper: So sánh 2 capacity maps
function isCapacityMapEqual(map1: Record<string, number>, map2: Record<string, number>): boolean {
    const keys1 = Object.keys(map1)
    const keys2 = Object.keys(map2)

    if (keys1.length !== keys2.length) return false

    for (const key of keys1) {
        if (map1[key] !== map2[key]) return false
    }
    return true
}

// Lấy danh sách CV IMPORT chưa hoàn thành vòng đời
// CV hoàn thành khi đã trả đủ số máy với cùng dung lượng
export async function getImportDispatches() {
    try {
        const dispatches = await db.dispatch.findMany({
            where: {
                type: "IMPORT",
                documentType: "CV", // Chỉ lấy CV, không lấy TTr
            },
            orderBy: {
                date: 'desc'
            },
            include: {
                transformers: true,
                // Include các Export đã liên kết với CV này
                exportedDispatches: {
                    include: {
                        transformers: true
                    }
                }
            }
        })

        // Filter CV chưa hoàn thành vòng đời
        const incompleteDispatches = dispatches.filter(d => {
            // Tính capacity map từ Import
            const importCapacityMap = createCapacityMap(d.transformers)

            // Tính capacity map từ tất cả Exports liên kết
            const allExportTransformers = d.exportedDispatches.flatMap(exp => exp.transformers)
            const exportCapacityMap = createCapacityMap(allExportTransformers)

            // CV chưa hoàn thành nếu capacity maps khác nhau
            return !isCapacityMapEqual(importCapacityMap, exportCapacityMap)
        })

        return incompleteDispatches.map(d => ({
            id: d.id,
            dispatchNumber: d.dispatchNumber,
            date: d.date,
            fileUrl: d.fileUrl,
            transformerCount: d.transformers.length,
            // Thêm info về số máy đã trả
            returnedCount: d.exportedDispatches.reduce((sum, exp) => sum + exp.transformers.length, 0)
        }))
    } catch (error) {
        console.error("Error fetching import dispatches:", error)
        return []
    }
}

// Lấy danh sách các CV CBM (Export) chưa được nhận về
// CBM hoàn thành khi có Import liên kết với sourceDispatchId = CBM.id
export async function getExportCBMDispatches() {
    try {
        const dispatches = await db.dispatch.findMany({
            where: {
                type: "EXPORT",
                isCBM: true,
            },
            orderBy: {
                date: 'desc'
            },
            include: {
                transformers: true,
            }
        })

        // Lấy danh sách CBM IDs đã có Import nhận về
        const cbmIdsWithImport = await db.dispatch.findMany({
            where: {
                type: "IMPORT",
                sourceDispatchId: {
                    in: dispatches.map(d => d.id)
                }
            },
            select: {
                sourceDispatchId: true
            }
        })

        const completedCbmIds = new Set(cbmIdsWithImport.map(d => d.sourceDispatchId))

        // Filter CBM chưa được nhận về
        const incompleteDispatches = dispatches.filter(d => !completedCbmIds.has(d.id))

        return incompleteDispatches.map(d => ({
            id: d.id,
            dispatchNumber: d.dispatchNumber,
            date: d.date,
            documentType: d.documentType,
            isCBM: d.isCBM,
            fileUrl: d.fileUrl,
            transformerCount: d.transformers.length,
            transformers: d.transformers.map((t: any) => ({
                serialNumber: t.serialNumber,
                capacity: t.capacity,
                model: t.model,
                note: t.note,
                testResult: t.testResult,
            }))
        }))
    } catch (error) {
        console.error("Error fetching CBM export dispatches:", error)
        return []
    }
}

// Lấy danh sách máy CBM không đạt thí nghiệm (FAIL) chưa được xử lý
export async function getFailedCBMTransformers() {
    try {
        const transformers = await db.transformer.findMany({
            where: {
                testResult: "FAIL",
                isProcessed: false, // Chỉ lấy máy chưa được xử lý
                dispatch: {
                    type: "IMPORT",
                    isCBM: true,
                }
            },
            include: {
                dispatch: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return transformers.map(t => ({
            id: t.id,
            serialNumber: t.serialNumber,
            capacity: t.capacity,
            model: t.model,
            note: t.note,
            testResult: t.testResult,
            dispatchNumber: t.dispatch.dispatchNumber,
            dispatchDate: t.dispatch.date,
        }))
    } catch (error) {
        console.error("Error fetching failed CBM transformers:", error)
        return []
    }
}

// Đánh dấu máy FAIL đã được xử lý (thêm vào Export khác)
export async function markTransformerProcessed(transformerId: string) {
    try {
        await db.transformer.update({
            where: { id: transformerId },
            data: { isProcessed: true }
        })
        return { success: true }
    } catch (error) {
        console.error("Error marking transformer as processed:", error)
        return { success: false, error: "Lỗi cập nhật trạng thái máy" }
    }
}
