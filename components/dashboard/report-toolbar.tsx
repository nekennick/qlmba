"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { toast } from "sonner"
import { Table } from "@tanstack/react-table"
import { useUnitStore } from "@/lib/store/unit-store"
import { UNITS } from "@/lib/constants"

interface ReportToolbarProps {
    table: Table<any>
}

export function ReportToolbar({ table }: ReportToolbarProps) {
    const { selectedUnit } = useUnitStore()

    const handlePrint = () => {
        // Get all filtered rows
        const filteredRows = table.getFilteredRowModel().rows

        if (filteredRows.length === 0) {
            toast.error("Không có dữ liệu để in")
            return
        }

        // Extract IDs
        const ids = filteredRows.map(row => row.original.id)

        // Get unit label
        const unitName = UNITS.find(u => u.value === selectedUnit)?.label || ""

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
