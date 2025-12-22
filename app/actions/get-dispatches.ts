"use server"

import { db } from "@/lib/db"

export async function getImportDispatches() {
    try {
        const dispatches = await db.dispatch.findMany({
            where: {
                type: "IMPORT"
            },
            orderBy: {
                date: 'desc'
            },
            include: {
                transformers: true
            }
        })

        return dispatches.map(d => ({
            id: d.id,
            dispatchNumber: d.dispatchNumber,
            date: d.date,
            fileUrl: d.fileUrl,
            transformerCount: d.transformers.length
        }))
    } catch (error) {
        console.error("Error fetching import dispatches:", error)
        return []
    }
}

// Lấy danh sách các CV CBM (Export) để có thể chọn khi nhận máy thí nghiệm về
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
                transformers: true
            }
        })

        return dispatches.map(d => ({
            id: d.id,
            dispatchNumber: d.dispatchNumber,
            date: d.date,
            documentType: d.documentType,
            isCBM: d.isCBM,
            fileUrl: d.fileUrl,
            transformerCount: d.transformers.length,
            transformers: d.transformers.map(t => ({
                serialNumber: t.serialNumber,
                capacity: t.capacity,
                model: t.model,
                note: t.note,
            }))
        }))
    } catch (error) {
        console.error("Error fetching CBM export dispatches:", error)
        return []
    }
}
