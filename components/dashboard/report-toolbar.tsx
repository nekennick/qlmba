"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Printer } from "lucide-react"
import { toast } from "sonner"
import { Table } from "@tanstack/react-table"

interface ReportToolbarProps {
    table: Table<any>
}

export function ReportToolbar({ table }: ReportToolbarProps) {
    const [unitName, setUnitName] = useState("Đội Quản lý điện Thanh Bình")

    const handlePrint = () => {
        // Get all filtered rows
        const filteredRows = table.getFilteredRowModel().rows

        if (filteredRows.length === 0) {
            toast.error("Không có dữ liệu để in")
            return
        }

        // Extract IDs using the accessor or original object
        // Assuming the data has 'id' field in original
        const ids = filteredRows.map(row => row.original.id)

        // Save to localStorage
        const config = {
            unitName,
            ids
        }
        localStorage.setItem("report_config", JSON.stringify(config))

        // Open report page
        window.open('/report', '_blank')
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap hidden md:inline">Đơn vị:</span>
                <Input
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-[250px] h-8 text-sm"
                    placeholder="Nhập tên đơn vị..."
                />
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
            >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất Báo Cáo</span>
            </Button>
        </div>
    )
}
