"use server"

import { db } from "@/lib/db"

export async function getDashboardStats(range?: { from?: Date, to?: Date }) {
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

        // Filter Recent Transactions
        const whereClause: any = {}
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
                        linkedCv: true
                    }
                }
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
            recentTransformers: recentTransformers.map((t: any) => ({
                id: t.id,
                dispatchId: t.dispatch.id,
                serialNumber: t.serialNumber,
                capacity: t.capacity,
                model: t.model,
                note: t.note,
                dispatchNumber: t.dispatch.dispatchNumber,
                date: t.dispatch.transactionDate || t.dispatch.date,
                type: t.dispatch.type,
                documentType: t.dispatch.documentType,
                isCBM: t.dispatch.isCBM,
                linkedCv: t.dispatch.linkedCv ? {
                    dispatchNumber: t.dispatch.linkedCv.dispatchNumber
                } : null
            }))
        }
    } catch (error) {
        console.error("Dashboard stats error:", error)
        return { success: false, error: "Failed to fetch stats" }
    }
}
