"use server"

import { db } from "@/lib/db"

export async function getDailyReportData(date: Date) {
    try {
        // Set start and end of the day
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const dispatches = await db.dispatch.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                transformers: true,
            },
            orderBy: {
                date: 'asc'
            }
        })

        const importDispatches = dispatches.filter(d => d.type === "IMPORT")
        const exportDispatches = dispatches.filter(d => d.type === "EXPORT")

        return {
            success: true,
            data: {
                imports: importDispatches,
                exports: exportDispatches
            }
        }
    } catch (error) {
        console.error("Error fetching report data:", error)
        return { success: false, error: "Failed to fetch report data" }
    }
}
