"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const transformerSchema = z.object({
    serialNumber: z.string().min(1),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
})

const formSchema = z.object({
    dispatchNumber: z.string().min(1),
    date: z.string().min(1),
    fileUrl: z.string().optional(),
    transformers: z.array(transformerSchema).min(1),
})

export async function searchDispatches(query: string) {
    if (!query || query.length < 2) return []

    try {
        const dispatches = await db.dispatch.findMany({
            where: {
                dispatchNumber: {
                    contains: query,
                },
            },
            include: {
                transformers: true,
            },
            take: 5,
            orderBy: {
                createdAt: 'desc',
            }
        })
        return dispatches
    } catch (error) {
        console.error("Error searching dispatches:", error)
        return []
    }
}

export async function createImportDispatch(data: z.infer<typeof formSchema>) {
    const result = formSchema.safeParse(data)
    if (!result.success) {
        return { success: false, error: "Dữ liệu không hợp lệ" }
    }

    const { dispatchNumber, date, transformers, fileUrl } = result.data

    try {
        await db.dispatch.create({
            data: {
                dispatchNumber,
                date: new Date(date),
                type: "IMPORT",
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

        revalidatePath("/import")
        return { success: true }
    } catch (error) {
        console.error("Error creating import dispatch:", error)
        return { success: false, error: "Lỗi lưu dữ liệu: " + (error as Error).message }
    }
}
