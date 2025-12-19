"use server"

import { writeFile } from "fs/promises"
import { join } from "path"

export async function uploadFile(formData: FormData) {
    const file = formData.get("file") as File
    if (!file) {
        return { success: false, error: "No file uploaded" }
    }

    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_')

        // Save to public/uploads
        const path = join(process.cwd(), "public", "uploads", filename)
        await writeFile(path, buffer)

        // Return the public URL
        const url = `/uploads/${filename}`
        return { success: true, url }
    } catch (error) {
        console.error("Upload error:", error)
        return { success: false, error: "Upload failed" }
    }
}
