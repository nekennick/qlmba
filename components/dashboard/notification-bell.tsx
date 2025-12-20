"use client"

import { Bell, AlertTriangle } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface NotificationBellProps {
    unreturnedCount: number
}

export function NotificationBell({ unreturnedCount }: NotificationBellProps) {
    const hasNotifications = unreturnedCount > 0

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {hasNotifications && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b bg-gray-50/50">
                    <h4 className="font-medium leading-none">Thông báo</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        Bạn có {hasNotifications ? 1 : 0} thông báo mới
                    </p>
                </div>
                <div className="p-4">
                    {hasNotifications ? (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-900">
                            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Cảnh báo tồn kho</p>
                                <p className="text-xs text-orange-700">
                                    Hiện có <span className="font-bold">{unreturnedCount} MBA</span> đã nhận nhưng chưa trả lại. Lưu ý nhé.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            Không có thông báo nào.
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
