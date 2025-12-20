// ... imports
// ... imports
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getDashboardStats } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpCircle, ArrowDownCircle, Package } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { columns, Transformer } from "@/app/dashboard/columns"
import { NotificationBell } from "@/components/dashboard/notification-bell"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({ totalImported: 0, totalExported: 0, unreturned: 0 })
  const [transformers, setTransformers] = useState<Transformer[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const data = await getDashboardStats()
    if (data.success) {
      setStats(data.stats)
      setTransformers(data.recentTransformers as Transformer[] || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Giao Nhận MBA</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell unreturnedCount={stats.unreturned} />

          <Button asChild variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
            <Link href="/import">
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Nhận MBA
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đã Nhận</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalImported}</div>
              <p className="text-xs text-muted-foreground">Máy biến áp được nhận về</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đã Trả</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalExported}</div>
              <p className="text-xs text-muted-foreground">Máy biến áp đã gửi đi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tồn Kho (Ước tính)</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.unreturned || 0}</div>
              <p className="text-xs text-muted-foreground">Chênh lệch Nhận - Trả</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transformers Table */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Giao dịch gần đây</CardTitle>
            <CardDescription>Danh sách máy biến áp vừa được nhận hoặc trả.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
            ) : (
              <DataTable columns={columns} data={transformers} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
