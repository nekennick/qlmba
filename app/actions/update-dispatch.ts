"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const transformerSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(1),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
})

const updateSchema = z.object({
    id: z.string().min(1),
    dispatchNumber: z.string().min(1),
    date: z.string().min(1),
    fileUrl: z.string().optional(),
    documentType: z.enum(["CV", "TTr"]).default("CV"),
    linkedTtrIds: z.array(z.string()).optional(),
    transformers: z.array(transformerSchema).min(1),
    // For TTr: CV info to create and link
    linkedCvNumber: z.string().optional(),
    linkedCvDate: z.string().optional(),
})

export async function updateDispatch(data: z.infer<typeof updateSchema>) {
    const result = updateSchema.safeParse(data)
    if (!result.success) {
        return { success: false, error: "Dữ liệu không hợp lệ" }
    }

    const { id, dispatchNumber, date, transformers, fileUrl, documentType, linkedTtrIds, linkedCvNumber, linkedCvDate } = result.data

    try {
        // Cập nhật dispatch
        await db.dispatch.update({
            where: { id },
            data: {
                dispatchNumber,
                date: new Date(date),
                documentType: documentType || "CV",
                fileUrl: fileUrl || "",
            }
        })

        // Xóa các transformers cũ và tạo mới
        await db.transformer.deleteMany({
            where: { dispatchId: id }
        })

        await db.transformer.createMany({
            data: transformers.map(t => ({
                dispatchId: id,
                serialNumber: t.serialNumber,
                capacity: t.capacity,
                model: t.model,
                note: t.note,
            }))
        })

        // Cập nhật liên kết TTr
        if (documentType === "CV") {
            // Xóa liên kết cũ
            await db.dispatch.updateMany({
                where: { linkedCvId: id },
                data: { linkedCvId: null }
            })

            // Thêm liên kết mới
            if (linkedTtrIds && linkedTtrIds.length > 0) {
                await db.dispatch.updateMany({
                    where: {
                        id: { in: linkedTtrIds },
                        documentType: "TTr",
                    },
                    data: {
                        linkedCvId: id
                    }
                })
            }
        }

        // Nếu là TTr và có thông tin CV chính thức, tạo CV và liên kết
        if (documentType === "TTr" && linkedCvNumber && linkedCvDate) {
            // Tạo CV mới với cùng transformers
            const newCv = await db.dispatch.create({
                data: {
                    dispatchNumber: linkedCvNumber,
                    date: new Date(linkedCvDate),
                    type: "IMPORT", // Cùng type với TTr
                    documentType: "CV",
                    fileUrl: fileUrl || "",
                    transformers: {
                        create: transformers.map(t => ({
                            serialNumber: t.serialNumber,
                            capacity: t.capacity,
                            model: t.model,
                            note: t.note,
                        }))
                    }
                }
            })

            // Liên kết TTr này với CV vừa tạo
            await db.dispatch.update({
                where: { id },
                data: { linkedCvId: newCv.id }
            })
        }

        revalidatePath("/import")
        revalidatePath("/export")
        revalidatePath("/")
        return { success: true }
    } catch (error) {
        console.error("Error updating dispatch:", error)
        return { success: false, error: "Lỗi cập nhật dữ liệu: " + (error as Error).message }
    }
}

