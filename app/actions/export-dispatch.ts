"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuth } from "@/lib/auth-utils"

// Initialize Prisma Client if not already done in lib/db.ts
// I will create lib/db.ts next.

const transformerSchema = z.object({
    serialNumber: z.string().min(1),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
    imageUrl: z.string().optional(), // URL hình ảnh máy biến áp
})

const formSchema = z.object({
    dispatchNumber: z.string().min(1),
    date: z.string().min(1),
    transactionDate: z.string().optional(),
    documentType: z.enum(["CV", "TTr"]).optional(),
    isCBM: z.boolean().optional(),
    unit: z.string().optional(),
    transformers: z.array(transformerSchema).min(1),
    sourceDispatchId: z.string().optional(),
})

export async function createExportDispatch(data: z.infer<typeof formSchema>) {
    // Validate data
    const result = formSchema.safeParse(data)
    if (!result.success) {
        return { success: false, error: "Dữ liệu không hợp lệ" }
    }

    const { dispatchNumber, date, documentType, transformers, sourceDispatchId, transactionDate, isCBM } = result.data

    try {
        // Lấy user từ session
        const sessionUser = await requireAuth()

        // Lấy teamId từ database để đảm bảo chính xác
        const dbUser = await db.user.findUnique({
            where: { id: sessionUser.id },
            select: { teamId: true, role: true }
        })

        const teamId = dbUser?.role === "ADMIN" ? null : dbUser?.teamId
        console.log("[createExportDispatch] User:", sessionUser.id, "TeamId:", teamId)

        await db.dispatch.create({
            data: {
                dispatchNumber,
                date: new Date(date),
                transactionDate: transactionDate ? new Date(transactionDate) : undefined,
                type: "EXPORT",
                documentType: documentType || "CV",
                isCBM: isCBM || false,
                sourceDispatchId: result.data.sourceDispatchId,
                fileUrl: "", // TODO: Handle file upload
                teamId: teamId || undefined, // Gán teamId
                transformers: {
                    create: transformers.map(t => ({
                        serialNumber: t.serialNumber,
                        capacity: t.capacity,
                        model: t.model,
                        note: t.note,
                        imageUrl: t.imageUrl, // Lưu URL hình ảnh
                    }))
                }
            }
        })

        revalidatePath("/export")
        return { success: true }
    } catch (error) {
        console.error("Error creating dispatch:", error)
        return { success: false, error: "Lỗi lưu dữ liệu: " + (error as Error).message }
    }
}
