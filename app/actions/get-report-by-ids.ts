"use server"

import { db } from "@/lib/db"

export async function getReportDataByIds(transformerIds: string[]) {
    try {
        if (!transformerIds || transformerIds.length === 0) {
            return { success: true, data: { imports: [], exports: [] } }
        }

        // Find all transformers with these IDs, including their dispatch info
        const transformers = await db.transformer.findMany({
            where: {
                id: {
                    in: transformerIds
                }
            },
            include: {
                dispatch: true
            },
            orderBy: {
                dispatch: {
                    date: 'asc'
                }
            }
        })

        // We need to group these transformers back into Dispatches for the report format
        // The report format is: Dispatch -> List of Transformers
        // Since we filtered transformers, a Dispatch might only have some of its transformers shown if filtered by ID?
        // User said "lọc ra bất cứ dữ liệu gì và xuất theo dữ liệu đã lọc" -> Yes, show only filtered transformers.

        // Group by Dispatch ID
        const dispatchMap = new Map<string, any>()

        transformers.forEach(t => {
            const dispatchId = t.dispatchId
            if (!dispatchMap.has(dispatchId)) {
                dispatchMap.set(dispatchId, {
                    ...t.dispatch,
                    transformers: []
                })
            }
            dispatchMap.get(dispatchId).transformers.push(t)
        })

        const dispatches = Array.from(dispatchMap.values())

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
        console.error("Error fetching report data by IDs:", error)
        return { success: false, error: "Failed to fetch report data" }
    }
}
