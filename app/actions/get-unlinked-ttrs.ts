"use server"

import { db } from "@/lib/db"

/**
 * Lấy danh sách các Tờ Trình (TTr) loại IMPORT chưa được liên kết với CV nào
 */
export async function getUnlinkedTtrs() {
    try {
        const ttrs = await db.dispatch.findMany({
            where: {
                documentType: "TTr",
                type: "IMPORT",
                linkedCvId: null, // Chưa liên kết với CV nào
            },
            select: {
                id: true,
                dispatchNumber: true,
                date: true,
                fileUrl: true,
                transformers: true,
            },
            orderBy: {
                date: 'desc',
            }
        })
        return { success: true, data: ttrs }
    } catch (error) {
        console.error("Error getting unlinked TTrs:", error)
        return { success: false, error: "Lỗi lấy danh sách Tờ Trình", data: [] }
    }
}
