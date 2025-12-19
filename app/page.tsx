"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getDashboardStats } from "@/app/actions/dashboard"
import { deleteDispatch } from "@/app/actions/delete-dispatch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowUpCircle, ArrowDownCircle, Package, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({ totalImported: 0, totalExported: 0, unreturned: 0 })
  const [transformers, setTransformers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const data = await getDashboardStats()
    if (data.success) {
      setStats(data.stats)
      setTransformers(data.recentTransformers || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (dispatchId: string, dispatchNumber: string) => {
    if (!confirm(`Xác nhận xóa công văn "${dispatchNumber}"?`)) return

    const result = await deleteDispatch(dispatchId)
    if (result.success) {
      toast.success("Đã xóa giao dịch")
      loadData() // Reload data
    } else {
      toast.error(result.error || "Không thể xóa")
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-800">Quản Lý Giao Nhận MBA</h1>
        </div>
        <div className="flex gap-3">
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

        {/* Unreturned MBA Alert */}
        {stats.unreturned > 0 && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Cảnh báo: Có MBA cần trả</AlertTitle>
            <AlertDescription className="text-orange-700">
              Hiện có <strong>{stats.unreturned} MBA</strong> đã nhận nhưng chưa trả. Vui lòng kiểm tra và xử lý.
            </AlertDescription>
          </Alert>
        )}

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại GD</TableHead>
                  <TableHead>Số Công Văn</TableHead>
                  <TableHead>Số Máy (Serial)</TableHead>
                  <TableHead>Dung Lượng</TableHead>
                  <TableHead>Loại máy</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : transformers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      Chưa có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  transformers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.date).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'IMPORT' ? 'secondary' : 'default'} className={
                          item.type === 'IMPORT'
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        }>
                          {item.type === 'IMPORT' ? 'NHẬN' : 'TRẢ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.dispatchNumber}</TableCell>
                      <TableCell>{item.serialNumber}</TableCell>
                      <TableCell>{item.capacity}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.note || ""}>{item.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(item.dispatchId, item.dispatchNumber || 'N/A')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
