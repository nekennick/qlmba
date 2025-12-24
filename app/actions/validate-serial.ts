"use server"

import { db } from "@/lib/db"

/**
 * Kiểm tra serial number trùng lặp với logic thông minh:
 * - CHỈ cảnh báo khi trùng trong CÙNG loại dispatch (IMPORT-IMPORT hoặc EXPORT-EXPORT)
 * - KHÔNG cảnh báo cho CBM flow (Export CBM -> Import CBM là bình thường)
 * - KHÔNG cảnh báo cho máy FAIL (nhận về rồi trả là bình thường)
 */
export async function checkDuplicateSerials(
    serials: string[],
    currentType: "IMPORT" | "EXPORT",
    isCBM: boolean = false
): Promise<{
    duplicates: { serialNumber: string; dispatchNumber: string | null; type: string }[]
}> {
    // Nếu là CBM, không cần kiểm tra trùng (CBM flow luôn trùng serial)
    if (isCBM) {
        return { duplicates: [] }
    }

    try {
        // Tìm các transformer có serial number trùng trong CÙNG loại dispatch và KHÔNG phải CBM
        const existingTransformers = await db.transformer.findMany({
            where: {
                serialNumber: {
                    in: serials
                },
                dispatch: {
                    type: currentType, // Chỉ kiểm tra cùng loại (IMPORT-IMPORT hoặc EXPORT-EXPORT)
                    isCBM: false, // Không kiểm tra CBM dispatch
                },
                // Không kiểm tra máy đã đánh dấu FAIL đã xử lý
                OR: [
                    { testResult: null },
                    { testResult: "PASS" },
                    { isProcessed: false }
                ]
            },
            include: {
                dispatch: {
                    select: {
                        dispatchNumber: true,
                        type: true
                    }
                }
            }
        })

        const duplicates = existingTransformers.map(t => ({
            serialNumber: t.serialNumber,
            dispatchNumber: t.dispatch.dispatchNumber,
            type: t.dispatch.type
        }))

        return { duplicates }
    } catch (error) {
        console.error("Error checking duplicate serials:", error)
        return { duplicates: [] }
    }
}
