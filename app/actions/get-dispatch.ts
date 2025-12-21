"use server"

import { db } from "@/lib/db"

export async function getDispatchById(id: string) {
    try {
        const dispatch = await db.dispatch.findUnique({
            where: { id },
            include: {
                transformers: true,
                linkedTtrs: true,
                linkedCv: true,
            }
        })

        if (!dispatch) {
            return { success: false, error: "Không tìm thấy phiếu" }
        }

        return {
            success: true,
            data: {
                id: dispatch.id,
                dispatchNumber: dispatch.dispatchNumber,
                date: dispatch.date.toISOString().split('T')[0],
                transactionDate: dispatch.transactionDate ? dispatch.transactionDate.toISOString().split('T')[0] : null,
                type: dispatch.type,
                documentType: dispatch.documentType,
                fileUrl: dispatch.fileUrl,
                linkedCvId: dispatch.linkedCvId,
                sourceDispatchId: dispatch.sourceDispatchId,
                linkedCvInfo: dispatch.linkedCv ? {
                    id: dispatch.linkedCv.id,
                    dispatchNumber: dispatch.linkedCv.dispatchNumber,
                } : null,
                transformers: dispatch.transformers.map(t => ({
                    id: t.id,
                    serialNumber: t.serialNumber,
                    capacity: t.capacity || "",
                    model: t.model || "",
                    note: t.note || "",
                })),
                linkedTtrIds: dispatch.linkedTtrs.map(ttr => ttr.id),
                linkedTtrsInfo: dispatch.linkedTtrs.map(ttr => ({
                    id: ttr.id,
                    dispatchNumber: ttr.dispatchNumber,
                    date: ttr.date.toISOString().split('T')[0],
                })),
            }
        }
    } catch (error) {
        console.error("Error fetching dispatch:", error)
        return { success: false, error: "Lỗi lấy dữ liệu" }
    }
}

