"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function deleteDispatch(dispatchId: string) {
    try {
        // Prisma will cascade delete transformers automatically
        await db.dispatch.delete({
            where: { id: dispatchId }
        })

        revalidatePath("/")
        return { success: true }
    } catch (error) {
        console.error("Error deleting dispatch:", error)
        return { success: false, error: "Không thể xóa giao dịch" }
    }
}
