"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from "lucide-react"
import React from "react"
import { EditTransformerDialog } from "@/components/dashboard/edit-transformer-dialog"

import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter"

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
            const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
                .map((date) => new Date(date))
                .sort((a, b) => b.getTime() - a.getTime())
                .map((date) => date.toLocaleDateString("vi-VN"))

            // Deduplicate after formatting
            const options = Array.from(new Set(uniqueValues)).map(dateStr => ({
                label: dateStr,
                value: dateStr
            }))

            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="px-0 hover:bg-transparent font-semibold"
                    >
                        Ngày
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                    <DataTableFacetedFilter title="Ngày" column={column} options={options} />
                </div>
            )
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("date"))
            return <div>{date.toLocaleDateString("vi-VN")}</div>
        },
        filterFn: (row, id, value) => {
            const date = new Date(row.getValue(id))
            const formatted = date.toLocaleDateString("vi-VN")
            return value.includes(formatted)
        },
    },
    {
        accessorKey: "type",
        header: ({ column }) => {
            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <div className="font-semibold px-0 h-9 flex items-center">Loại GD</div>
                    <DataTableFacetedFilter
                        title="Loại"
                        column={column}
                        options={[
                            { label: "NHẬN", value: "IMPORT" },
                            { label: "TRẢ", value: "EXPORT" },
                        ]}
                    />
                </div>
            )
        },
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
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "dispatchNumber",
        header: ({ column }) => {
            // Values might be null, handle that
            const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
                .filter(Boolean) as string[]

            const options = uniqueValues.map(val => ({
                label: val,
                value: val
            }))

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
                    <DataTableFacetedFilter title="Số CV" column={column} options={options} />
                </div>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
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
        header: ({ column }) => {
            const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
                .filter(Boolean) as string[]

            const options = uniqueValues.map(val => ({
                label: val,
                value: val
            }))

            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="px-0 h-auto font-semibold hover:bg-transparent"
                    >
                        Dung Lượng
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                    <DataTableFacetedFilter title="Dung lượng" column={column} options={options} />
                </div>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "model",
        header: ({ column }) => {
            const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
                .filter(Boolean) as string[]

            const options = uniqueValues.map(val => ({
                label: val,
                value: val
            }))

            return (
                <div className="flex flex-col gap-2 items-start py-2">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="px-0 h-auto font-semibold hover:bg-transparent"
                    >
                        Loại máy
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                    <DataTableFacetedFilter title="Loại máy" column={column} options={options} />
                </div>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
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
            const [editOpen, setEditOpen] = React.useState(false)

            const handleDelete = async () => {
                if (!confirm(`Xác nhận xóa công văn "${transformer.dispatchNumber || 'N/A'}"?`)) return

                const result = await deleteDispatch(transformer.dispatchId)
                if (result.success) {
                    toast.success("Đã xóa giao dịch")
                    window.location.reload()
                } else {
                    toast.error(result.error || "Không thể xóa")
                }
            }

            return (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setEditOpen(true)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <EditTransformerDialog
                        transformer={transformer}
                        open={editOpen}
                        onOpenChange={setEditOpen}
                    />

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
