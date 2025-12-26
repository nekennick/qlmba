// ... imports
// ... imports
"use client"

import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { getDashboardStats, getUnreturnedTransformers } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpCircle, ArrowDownCircle, Package, CalendarIcon, Printer } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { columns, Transformer, getColumnsWithImagePreview } from "@/app/dashboard/columns"
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
  const [isMobile, setIsMobile] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null) // Preview ảnh máy biến áp

  // Tạo columns với callback xem ảnh
  const tableColumns = useMemo(
    () => getColumnsWithImagePreview((url) => setPreviewImage(url)),
    []
  )

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      <header className="min-h-14 md:h-16 border-b bg-card flex flex-wrap md:flex-nowrap items-center justify-between px-3 md:px-6 py-2 md:py-0 gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          <h1 className="text-base md:text-xl font-bold text-foreground hidden sm:block">Quản Lý Giao Nhận MBA</h1>
          <h1 className="text-sm font-bold text-foreground sm:hidden">QL MBA</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
          <UnitSwitcher />
          <ModeToggle />
          <NotificationBell unreturnedCount={stats.unreturned} />
          {/* Buttons Nhận/Trả - Ẩn trên mobile (dùng bottom bar thay thế) */}
          <Button asChild variant="outline" size="sm" className="hidden md:flex h-10 border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
            <Link href="/import">
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Nhận MBA
            </Link>
          </Button>
          <Button asChild size="sm" className="hidden md:flex h-10 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600">
            <Link href="/export">
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Trả MBA
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-3 md:p-6 pb-14 md:pb-6 space-y-4 md:space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${filterMode === 'import' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => toggleFilter('import')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-6 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Tổng Đã Nhận</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-2 md:pb-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.totalImported}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Click để lọc máy đã nhận</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${filterMode === 'export' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => toggleFilter('export')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-6 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Tổng Đã Trả</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-2 md:pb-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.totalExported}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Click để lọc máy đã trả</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md col-span-2 lg:col-span-1 ${filterMode === 'unreturned' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={toggleUnreturnedFilter}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-6 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Tồn Kho (Ước tính)</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-2 md:pb-6">
              <div className="text-xl md:text-2xl font-bold">{stats?.unreturned || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">Click để xem máy chưa trả</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transformers Table */}
        <Card className="flex-1">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 pb-2 px-3 md:px-6">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-1 md:gap-2 text-sm md:text-base">
                <span className="hidden md:inline">Giao nhận gần đây</span>
                <span className="md:hidden">Giao nhận</span>
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
                    {filterMode === 'import' ? '📥' : filterMode === 'export' ? '📤' : '📦'} ✕
                  </span>
                )}
              </CardTitle>
              <CardDescription className="hidden md:block">Danh sách máy biến áp vừa được nhận hoặc trả.</CardDescription>
            </div>
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    size="sm"
                    className={cn(
                      "w-auto md:w-[260px] justify-start text-left font-normal h-9",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 md:mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <span className="text-xs md:text-sm">
                          {format(date.from, "dd/MM")} - {format(date.to, "dd/MM/yy")}
                        </span>
                      ) : (
                        <span className="text-xs md:text-sm">{format(date.from, "dd/MM/yyyy")}</span>
                      )
                    ) : (
                      <span className="text-xs md:text-sm">Chọn ngày</span>
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
                    numberOfMonths={isMobile ? 1 : 2}
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
                columns={tableColumns}
                data={transformers}
                extraToolbarActions={(table) => <ReportToolbar table={table} />}
              />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Mobile Bottom Navigation - Chỉ hiện trên mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t p-3 flex gap-3 z-50 shadow-lg">
        <Button asChild variant="outline" className="flex-1 h-12 border-green-600 text-green-700 dark:text-green-400">
          <Link href="/import">
            <ArrowDownCircle className="mr-2 h-5 w-5" />
            Nhận MBA
          </Link>
        </Button>
        <Button asChild className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/export">
            <ArrowUpCircle className="mr-2 h-5 w-5" />
            Trả MBA
          </Link>
        </Button>
      </div>

      {/* Image Preview Overlay */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Ảnh máy biến áp"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
