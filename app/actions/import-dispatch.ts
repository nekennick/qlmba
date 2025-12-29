"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getTeamId, requireAuth } from "@/lib/auth-utils"

const transformerSchema = z.object({
    serialNumber: z.string().min(1),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
    testResult: z.enum(["PASS", "FAIL"]).nullish(), // Chấp nhận PASS, FAIL, null, undefined
    imageUrl: z.string().optional(), // URL hình ảnh máy biến áp
})

const formSchema = z.object({
    dispatchNumber: z.string().min(1),
    date: z.string().min(1),
    transactionDate: z.string().optional(),
    fileUrl: z.string().optional(),
    documentType: z.enum(["CV", "TTr"]).default("CV"),
    linkedTtrIds: z.array(z.string()).optional(), // IDs của các TTr cần liên kết (chỉ dùng khi documentType = CV)
    sourceDispatchId: z.string().optional(), // ID của CBM đang nhận về
    isCBM: z.boolean().optional(), // True nếu nhận CBM về
    transformers: z.array(transformerSchema).min(1),
})

export async function searchDispatches(query: string) {
    if (!query || query.length < 2) return []

    try {
        const teamId = await getTeamId()

        const dispatches = await db.dispatch.findMany({
            where: {
                dispatchNumber: {
                    contains: query,
                },
                ...(teamId && { teamId }),
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

    const { dispatchNumber, date, transformers, fileUrl, documentType, linkedTtrIds, transactionDate, sourceDispatchId, isCBM } = result.data

    try {
        // Lấy user từ session
        const sessionUser = await requireAuth()

        // Lấy teamId từ database để đảm bảo chính xác
        const dbUser = await db.user.findUnique({
            where: { id: sessionUser.id },
            select: { teamId: true, role: true }
        })

        const teamId = dbUser?.role === "ADMIN" ? null : dbUser?.teamId
        console.log("[createImportDispatch] User:", sessionUser.id, "TeamId:", teamId)

        // Tạo dispatch mới
        const newDispatch = await db.dispatch.create({
            data: {
                dispatchNumber,
                date: new Date(date),
                transactionDate: transactionDate ? new Date(transactionDate) : undefined,
                type: "IMPORT",
                documentType: documentType || "CV",
                isCBM: isCBM || !!sourceDispatchId, // Đánh dấu CBM nếu nhận CBM về
                fileUrl: fileUrl || "",
                sourceDispatchId: sourceDispatchId || undefined, // Liên kết với CBM nếu nhận CBM về
                teamId: teamId || undefined, // Gán teamId nếu có
                transformers: {
                    create: transformers.map(t => ({
                        serialNumber: t.serialNumber,
                        capacity: t.capacity,
                        model: t.model,
                        note: t.note,
                        testResult: t.testResult, // Lưu kết quả thí nghiệm
                        imageUrl: t.imageUrl, // Lưu URL hình ảnh
                    }))
                }
            }
        })

        // Nếu là CV và có linkedTtrIds, cập nhật các TTr để trỏ đến CV này
        if (documentType === "CV" && linkedTtrIds && linkedTtrIds.length > 0) {
            await db.dispatch.updateMany({
                where: {
                    id: { in: linkedTtrIds },
                    documentType: "TTr", // Đảm bảo chỉ cập nhật TTr
                },
                data: {
                    linkedCvId: newDispatch.id
                }
            })
        }

        revalidatePath("/import")
        revalidatePath("/")
        return { success: true }
    } catch (error) {
        console.error("Error creating import dispatch:", error)
        return { success: false, error: "Lỗi lưu dữ liệu: " + (error as Error).message }
    }
}
