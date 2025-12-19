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
