"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Initialize Prisma Client if not already done in lib/db.ts
// I will create lib/db.ts next.

const transformerSchema = z.object({
    serialNumber: z.string().min(1),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
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
        // Save to DB
        // Note: In real app, we would handle file upload url here too

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

        revalidatePath("/export")
        return { success: true }
    } catch (error) {
        console.error("Error creating dispatch:", error)
        return { success: false, error: "Lỗi lưu dữ liệu: " + (error as Error).message }
    }
}
