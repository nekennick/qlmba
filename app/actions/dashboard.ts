"use server"

import { db } from "@/lib/db"

export async function getDashboardStats() {
    try {
        const importCount = await db.transformer.count({
            where: {
                dispatch: {
                    type: "IMPORT"
                }
            }
        })

        const exportCount = await db.transformer.count({
            where: {
                dispatch: {
                    type: "EXPORT"
                }
            }
        })

        const recentTransformers = await db.transformer.findMany({
            take: 20,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                dispatch: true
            }
        })

        // Count unreturned MBA (imported but not exported yet)
        const unreturnedCount = importCount - exportCount

        return {
            success: true,
            stats: {
                totalImported: importCount,
                totalExported: exportCount,
                unreturned: unreturnedCount,
            },
            recentTransformers: recentTransformers.map(t => ({
                id: t.id,
                dispatchId: t.dispatch.id,
                serialNumber: t.serialNumber,
                capacity: t.capacity,
                model: t.model,
                note: t.note,
                dispatchNumber: t.dispatch.dispatchNumber,
                date: t.dispatch.date,
                type: t.dispatch.type,
            }))
        }
    } catch (error) {
        console.error("Dashboard stats error:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
