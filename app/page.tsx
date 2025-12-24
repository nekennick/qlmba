// ... imports
// ... imports
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getDashboardStats, getUnreturnedTransformers } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpCircle, ArrowDownCircle, Package, CalendarIcon, Printer } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { columns, Transformer } from "@/app/dashboard/columns"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { ModeToggle } from "@/components/mode-toggle"
import { Calendar } from "@/components/ui/calendar"
import { ReportToolbar } from "@/components/dashboard/report-toolbar"
import { toast } from "sonner"
import { UnitSwitcher } from "@/components/dashboard/unit-switcher"
import { useUnitStore } from "@/lib/store/unit-store"
import { UNITS } from "@/lib/constants"
// ...

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({ totalImported: 0, totalExported: 0, unreturned: 0 })
  const [transformers, setTransformers] = useState<Transformer[]>([])
  const [allTransformers, setAllTransformers] = useState<Transformer[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState<DateRange | undefined>()
  const [filterMode, setFilterMode] = useState<'all' | 'import' | 'export' | 'unreturned' | null>(null)

  const { selectedUnit } = useUnitStore()

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getDashboardStats(date)
      if (data.success) {
        setStats(data.stats)
        const allData = data.recentTransformers as Transformer[] || []
        setAllTransformers(allData)
        // Apply filter if active
        if (filterMode) {
          setTransformers(allData.filter(t => t.type === filterMode.toUpperCase()))
        } else {
          setTransformers(allData)
        }
      }
    } catch (error) {
      console.error("Failed to load data", error)
      toast.error("Lỗi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = () => {
    if (!date?.from) {
      toast.error("Vui lòng chọn ngày để xuất báo cáo")
      return
    }

    // Use the 'from' date for the daily report
    const reportDate = date.from
    const unitLabel = UNITS.find(u => u.value === selectedUnit)?.label || ""
    const url = `/report?date=${reportDate.toISOString()}&unit=${encodeURIComponent(unitLabel)}`
    window.open(url, '_blank')
  }

  // Handle filter toggle
  const toggleFilter = (mode: 'import' | 'export') => {
    if (filterMode === mode) {
      setFilterMode(null)
      setTransformers(allTransformers)
    } else {
      setFilterMode(mode)
      setTransformers(allTransformers.filter(t => t.type === mode.toUpperCase()))
    }
  }

  // Handle unreturned filter (load từ action riêng)
  const toggleUnreturnedFilter = async () => {
    if (filterMode === 'unreturned') {
      setFilterMode(null)
      setTransformers(allTransformers)
    } else {
      setFilterMode('unreturned')
      const result = await getUnreturnedTransformers()
      if (result.success && result.data) {
        setTransformers(result.data as Transformer[])
      }
    }
  }

  useEffect(() => {
    loadData()
  }, [date])

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Quản Lý Giao Nhận MBA</h1>
        </div>
        <div className="flex items-center gap-3">
          <UnitSwitcher />
          <ModeToggle />
          <NotificationBell unreturnedCount={stats.unreturned} />

          <Button asChild variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
            <Link href="/import">
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Nhận MBA
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600">
            <Link href="/export">
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Trả MBA
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${filterMode === 'import' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => toggleFilter('import')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đã Nhận</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalImported}</div>
              <p className="text-xs text-muted-foreground">Click để lọc máy đã nhận</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${filterMode === 'export' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => toggleFilter('export')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đã Trả</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalExported}</div>
              <p className="text-xs text-muted-foreground">Click để lọc máy đã trả</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${filterMode === 'unreturned' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={toggleUnreturnedFilter}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tồn Kho (Ước tính)</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.unreturned || 0}</div>
              <p className="text-xs text-muted-foreground">Click để xem máy chưa trả</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transformers Table */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                Giao nhận gần đây
                {filterMode && (
                  <span
                    className={`text-xs font-normal px-2 py-0.5 rounded-full cursor-pointer ${filterMode === 'import'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : filterMode === 'export'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}
                    onClick={() => { setFilterMode(null); setTransformers(allTransformers); }}
                  >
                    {filterMode === 'import' ? '📥 Chỉ máy NHẬN' : filterMode === 'export' ? '📤 Chỉ máy TRẢ' : '📦 Máy chưa trả'} ✕
                  </span>
                )}
              </CardTitle>
              <CardDescription>Danh sách máy biến áp vừa được nhận hoặc trả.</CardDescription>
            </div>
            <div className={cn("grid gap-2 flex flex-row items-center")}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "dd/MM/yyyy")} -{" "}
                          {format(date.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(date.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Chọn khoảng thời gian</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
            ) : (
              <DataTable
                columns={columns}
                data={transformers}
                extraToolbarActions={(table) => <ReportToolbar table={table} />}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
