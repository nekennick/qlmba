"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { deleteDispatch } from "@/app/actions/delete-dispatch"

// Define the shape of our data
export type Transformer = {
    id: string
    dispatchId: string
    dispatchNumber: string | null
    serialNumber: string
    model: string | null
    capacity: string | null
    note: string | null
    date: Date
    type: "IMPORT" | "EXPORT"
}

// Function to handle delete (we'll need to pass a callback or use server action directly if possible,
// but for now let's keep the logic simple or just expose the button)
// Since we are inside a client component (Table), we can call server actions.

export const columns: ColumnDef<Transformer>[] = [
    {
        accessorKey: "date",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="px-0 hover:bg-transparent"
                >
                    Ngày
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("date"))
            return <div>{date.toLocaleDateString("vi-VN")}</div>
        },
    },
    {
        accessorKey: "type",
        header: "Loại GD",
        cell: ({ row }) => {
            const type = row.getValue("type") as string
            return (
                <Badge
                    variant={type === "IMPORT" ? "secondary" : "default"}
                    className={
                        type === "IMPORT"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                    }
                >
                    {type === "IMPORT" ? "NHẬN" : "TRẢ"}
                </Badge>
            )
        },
    },
    {
        accessorKey: "dispatchNumber",
        header: ({ column }) => {
            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="px-0 h-auto font-semibold hover:bg-transparent"
                    >
                        Số Công Văn
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                    <Input
                        placeholder="Lọc số CV..."
                        value={(column.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            column.setFilterValue(event.target.value)
                        }
                        className="h-8 w-[120px]"
                    />
                </div>
            )
        },
    },
    {
        accessorKey: "serialNumber",
        header: ({ column }) => {
            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="px-0 h-auto font-semibold hover:bg-transparent"
                    >
                        Số Máy (Serial)
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                    <Input
                        placeholder="Lọc số máy..."
                        value={(column.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            column.setFilterValue(event.target.value)
                        }
                        className="h-8 w-[120px]"
                    />
                </div>
            )
        },
    },
    {
        accessorKey: "capacity",
        header: "Dung Lượng",
    },
    {
        accessorKey: "model",
        header: "Loại máy",
    },
    {
        accessorKey: "note",
        header: ({ column }) => {
            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="px-0 h-auto font-semibold hover:bg-transparent"
                    >
                        Ghi chú
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                    <Input
                        placeholder="Lọc ghi chú..."
                        value={(column.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            column.setFilterValue(event.target.value)
                        }
                        className="h-8 w-[150px]"
                    />
                </div>
            )
        },
        cell: ({ row }) => {
            const note = row.getValue("note") as string
            return (
                <div className="max-w-[150px] truncate" title={note || ""}>
                    {note || "-"}
                </div>
            )
        }
    },
    {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
            const transformer = row.original

            // We need a way to refresh the page/data after delete. 
            // Ideally we pass a function or context, but for simplicity we can use the window.location.reload() 
            // or rely on the parent component handling state if we pass an action up.
            // However, since we defined columns here, passing props is tricky.
            // A better way is to define the columns inside the component or use a wrapper.
            // For now, I will define the action here using the server action.

            const handleDelete = async () => {
                if (!confirm(`Xác nhận xóa công văn "${transformer.dispatchNumber || 'N/A'}"?`)) return

                const result = await deleteDispatch(transformer.dispatchId)
                if (result.success) {
                    toast.success("Đã xóa giao dịch")
                    // This is a bit dirty but effective to refresh server components/client state
                    window.location.reload()
                } else {
                    toast.error(result.error || "Không thể xóa")
                }
            }

            return (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        },
    },
]
