"use server"

import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export async function uploadTransformerImage(formData: FormData) {
    try {
        const file = formData.get("file") as File
        if (!file) {
            return { success: false, error: "Không có file" }
        }

        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if (!validTypes.includes(file.type)) {
            return { success: false, error: "Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)" }
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: "File quá lớn (tối đa 5MB)" }
        }

        // Create uploads directory if not exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", "transformers")
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const ext = file.name.split(".").pop()
        const filename = `transformer_${timestamp}.${ext}`
        const filePath = path.join(uploadDir, filename)

        // Write file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Return URL
        const url = `/uploads/transformers/${filename}`
        return { success: true, url }
    } catch (error) {
        console.error("Upload error:", error)
        return { success: false, error: "Lỗi upload file" }
    }
}
