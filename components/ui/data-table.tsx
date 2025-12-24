"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    extraToolbarActions?: (table: any) => React.ReactNode
}

export function DataTable<TData, TValue>({
    columns,
    data,
    extraToolbarActions,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        state: {
            sorting,
            columnFilters,
        },
    })

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            (() => {
                                // Tính toán màu nền và viền cho từng nhóm dispatchId
                                const rows = table.getRowModel().rows
                                let currentDispatchId = ""
                                let groupIndex = 0
                                let positionInGroup = 0

                                // Đếm số lượng trong mỗi nhóm trước
                                const groupCounts: { [key: string]: number } = {}
                                rows.forEach(row => {
                                    const dispatchId = (row.original as any)?.dispatchId || ""
                                    groupCounts[dispatchId] = (groupCounts[dispatchId] || 0) + 1
                                })

                                // Màu viền trái xen kẽ
                                const borderColors = ["border-l-emerald-500", "border-l-blue-500"]
                                const bgColors = ["bg-emerald-50/40 dark:bg-emerald-900/10", "bg-blue-50/40 dark:bg-blue-900/10"]

                                return rows.map((row, index) => {
                                    const rowData = row.original as any
                                    const dispatchId = rowData?.dispatchId || ""

                                    // Khi gặp dispatchId mới, reset position và tăng groupIndex
                                    if (dispatchId !== currentDispatchId) {
                                        currentDispatchId = dispatchId
                                        groupIndex++
                                        positionInGroup = 1
                                    } else {
                                        positionInGroup++
                                    }

                                    const totalInGroup = groupCounts[dispatchId] || 1
                                    const bgColor = totalInGroup > 1 ? bgColors[groupIndex % 2] : ""

                                    // Kiểm tra xem row tiếp theo có cùng dispatchId không
                                    const nextRow = rows[index + 1]
                                    const nextDispatchId = (nextRow?.original as any)?.dispatchId || ""
                                    const isLastInGroup = nextDispatchId !== dispatchId
                                    const isFirstInGroup = positionInGroup === 1

                                        // Truyền thông tin vị trí cho cell
                                        ; (rowData as any)._groupInfo = {
                                            position: positionInGroup,
                                            total: totalInGroup,
                                            isFirst: isFirstInGroup,
                                            groupIndex: groupIndex
                                        }

                                    return (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className={`${bgColor} ${isLastInGroup && totalInGroup > 1 ? "border-b-2 border-b-border" : ""}`}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )
                                })
                            })()
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Không có dữ liệu.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Số dòng mỗi trang</p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 text-sm text-muted-foreground mr-4">
                    {table.getFilteredRowModel().rows.length} kết quả.
                </div>
                {extraToolbarActions && extraToolbarActions(table)}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
