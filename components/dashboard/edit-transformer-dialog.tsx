"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Transformer } from "@/app/dashboard/columns"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateTransformer } from "@/app/actions/update-transformer"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    serialNumber: z.string().min(1, "Số máy không được để trống"),
    capacity: z.string().nullable(),
    model: z.string().nullable(),
    note: z.string().nullable(),
})

interface EditTransformerDialogProps {
    transformer: Transformer
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditTransformerDialog({
    transformer,
    open,
    onOpenChange,
}: EditTransformerDialogProps) {
    const [loading, setLoading] = useState(false)
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            serialNumber: transformer.serialNumber,
            capacity: transformer.capacity || "",
            model: transformer.model || "",
            note: transformer.note || "",
        },
    })

    const onSubmit = async (data: any) => {
        setLoading(true)
        try {
            const result = await updateTransformer({
                id: transformer.id,
                ...data,
            })

            if (result.success) {
                toast.success("Cập nhật thành công")
                onOpenChange(false)
                // Refresh data might be needed if not handled by server action revalidation
                window.location.reload()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa thông tin máy biến áp</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin cho máy {transformer.serialNumber}. Nhấn lưu để hoàn tất.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Ngày
                            </Label>
                            <div className="col-span-3 text-sm font-medium">
                                {new Date(transformer.date).toLocaleDateString("vi-VN")}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="serialNumber" className="text-right">
                                Số máy
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="serialNumber"
                                    {...register("serialNumber")}
                                    className="col-span-3"
                                />
                                {errors.serialNumber && (
                                    <span className="text-red-500 text-xs">{errors.serialNumber.message as string}</span>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="capacity" className="text-right">
                                Dung lượng
                            </Label>
                            <Input
                                id="capacity"
                                {...register("capacity")}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="model" className="text-right">
                                Loại máy
                            </Label>
                            <Input
                                id="model"
                                {...register("model")}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="note" className="text-right">
                                Ghi chú
                            </Label>
                            <Input
                                id="note"
                                {...register("note")}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
