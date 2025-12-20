"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const updateTransformerSchema = z.object({
    id: z.string(),
    serialNumber: z.string().min(1, "Số máy không được để trống"),
    capacity: z.string().nullable(),
    model: z.string().nullable(),
    note: z.string().nullable(),
})

export async function updateTransformer(data: z.infer<typeof updateTransformerSchema>) {
    const result = updateTransformerSchema.safeParse(data)

    if (!result.success) {
        return { success: false, error: "Dữ liệu không hợp lệ" }
    }

    try {
        await db.transformer.update({
            where: { id: data.id },
            data: {
                serialNumber: data.serialNumber,
                capacity: data.capacity,
                model: data.model,
                note: data.note,
            },
        })

        revalidatePath("/")
        revalidatePath("/dashboard")

        return { success: true }
    } catch (error) {
        console.error("Failed to update transformer:", error)
        return { success: false, error: "Lỗi khi cập nhật thông tin máy biến áp" }
    }
}
