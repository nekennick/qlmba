"use client"

import { useEffect, useState, useRef } from "react"
import { getReportDataByIds } from "@/app/actions/get-report-by-ids"
import { format } from "date-fns"
import { Loader2, Camera } from "lucide-react"
import html2canvas from "html2canvas"
import { toast } from "sonner"

export default function ReportPage() {
    const [data, setData] = useState<{ imports: any[], exports: any[] } | null>(null)
    const [config, setConfig] = useState<{ unitName: string, ids: string[] } | null>(null)
    const [loading, setLoading] = useState(true)
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const storedConfig = localStorage.getItem("report_config")
        if (storedConfig) {
            const parsed = JSON.parse(storedConfig)
            setConfig(parsed)

            getReportDataByIds(parsed.ids)
                .then((result) => {
                    if (result.success && result.data) {
                        setData(result.data)
                    }
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const handleScreenshot = async () => {
        if (!reportRef.current) return

        try {
            // Use html2canvas but override colors to avoid oklch errors while PRESERVING layout
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    // Do NOT remove stylesheets (breaks layout)
                    // Instead, inject a style tag to override oklch variables with hex
                    const styleOverride = clonedDoc.createElement('style')
                    styleOverride.textContent = `
                        :root {
                            --background: #ffffff !important;
                            --foreground: #000000 !important;
                            --card: #ffffff !important;
                            --card-foreground: #000000 !important;
                            --popover: #ffffff !important;
                            --popover-foreground: #000000 !important;
                            --primary: #000000 !important;
                            --primary-foreground: #ffffff !important;
                            --secondary: #f5f5f5 !important;
                            --secondary-foreground: #000000 !important;
                            --muted: #f5f5f5 !important;
                            --muted-foreground: #6b7280 !important;
                            --accent: #f5f5f5 !important;
                            --accent-foreground: #000000 !important;
                            --destructive: #ef4444 !important;
                            --border: #e5e7eb !important;
                            --input: #e5e7eb !important;
                            --ring: #000000 !important;
                        }
                        /* Restore report container dimensions if lost */
                        .report-container {
                            width: 210mm !important;
                            min-height: 297mm !important;
                            padding: 2rem !important;
                            box-sizing: border-box !important;
                            background-color: white !important;
                        }
                    `
                    clonedDoc.head.appendChild(styleOverride)
                }
            })

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error("Không thể tạo ảnh")
                    return
                }

                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            "image/png": blob
                        })
                    ])
                    toast.success("Đã copy ảnh vào clipboard!")
                } catch (err) {
                    console.error("Clipboard write error:", err)
                    const image = canvas.toDataURL("image/png")
                    const link = document.createElement("a")
                    link.href = image
                    link.download = `Bao_cao_MBA_${format(new Date(), "dd-MM-yyyy_HH-mm")}.png`
                    link.click()
                    toast.success("Đã tải ảnh xuống (Copy thất bại)")
                }
            }, "image/png")

        } catch (error: any) {
            console.error("Screenshot error:", error)
            toast.error(`Lỗi: ${error?.message || "Không xác định"}`)
        }
    }

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Đang chuẩn bị báo cáo...</p>
                </div>
            </div>
        )
    }

    if (!config || !data) {
        return <div className="p-10 text-center">Không tìm thấy dữ liệu báo cáo. Vui lòng quay lại và thử lại.</div>
    }

    const { imports, exports } = data
    const { unitName } = config

    type GroupedData = {
        dateStr: string
        originalDate: Date
        dispatches: any[]
    }

    const groupByDate = (list: any[]) => {
        const groups = new Map<string, GroupedData>()
        list.forEach(item => {
            const d = new Date(item.date)
            const dateStr = format(d, "dd/MM/yyyy")
            if (!groups.has(dateStr)) {
                groups.set(dateStr, { dateStr, originalDate: d, dispatches: [] })
            }
            groups.get(dateStr)!.dispatches.push(item)
        })
        return Array.from(groups.values()).sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime())
    }

    const importGroups = groupByDate(imports)
    const exportGroups = groupByDate(exports)

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center py-8 print:bg-white print:p-0 print:block">
            <div
                ref={reportRef}
                className="report-container p-8 w-[210mm] bg-white text-black shadow-lg print:shadow-none print:w-full print:p-0"
                style={{
                    fontFamily: 'Tahoma, sans-serif',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    width: '210mm',
                    minHeight: '297mm'
                }}
            >
                <style type="text/css" media="print">
                    {`
                        @page { size: A4; margin: 20mm; }
                        body { -webkit-print-color-adjust: exact; background-color: white !important; }
                        .no-print { display: none !important; }
                        
                        .report-container * {
                            border-color: #e5e7eb !important;
                            outline-color: transparent !important;
                            box-shadow: none !important;
                        }
                    `}
                </style>

                {/* Header Section */}
                <div
                    className="flex justify-between items-start mb-8 font-[Times_New_Roman]"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '2rem',
                        fontFamily: '"Times New Roman", Times, serif'
                    }}
                >
                    <div className="text-center" style={{ textAlign: 'center' }}>
                        <div className="font-bold" style={{ fontWeight: 'bold' }}>CÔNG TY</div>
                        <div className="font-bold" style={{ fontWeight: 'bold' }}>ĐIỆN LỰC ĐỒNG THÁP</div>
                        <div
                            className="font-bold border-b border-black inline-block pb-1 uppercase"
                            style={{
                                fontWeight: 'bold',
                                borderBottom: '1px solid black',
                                paddingBottom: '0.25rem',
                                display: 'inline-block',
                                textTransform: 'uppercase'
                            }}
                        >
                            {unitName || "..."}
                        </div>
                    </div>
                    <div className="text-center" style={{ textAlign: 'center' }}>
                        <div className="font-bold" style={{ fontWeight: 'bold' }}>CỘNG HỘI XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div
                            className="font-bold border-b border-black inline-block pb-1"
                            style={{
                                fontWeight: 'bold',
                                borderBottom: '1px solid black',
                                paddingBottom: '0.25rem',
                                display: 'inline-block'
                            }}
                        >
                            Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="mt-2 italic" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                            Đồng Tháp, ngày {format(new Date(), "dd")} tháng {format(new Date(), "MM")} năm {format(new Date(), "yyyy")}
                        </div>
                    </div>
                </div>

                <div className="text-center mb-8" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1
                        className="text-2xl font-bold uppercase"
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            margin: 0
                        }}
                    >
                        BIÊN BẢN GIAO NHẬN MÁY BIẾN ÁP
                    </h1>
                </div>

                {importGroups.map(group => (
                    <div key={`import-${group.dateStr}`} className="mb-8">
                        <div className="text-lg font-bold mb-4">
                            Ngày {group.dateStr} "{unitName}" có nhận MBA như sau:
                        </div>
                        {group.dispatches.map((dispatch) => (
                            <div key={dispatch.id} className="mb-4">
                                <div className="italic font-semibold mb-2">
                                    *Theo CV {dispatch.dispatchNumber || "..."} ngày {format(new Date(dispatch.date), "dd/MM/yyyy")}
                                </div>
                                <div className="pl-4">
                                    {dispatch.transformers.map((t: any, index: number) => (
                                        <div key={t.id} className="mb-2">
                                            <div className="font-semibold">{index + 1}/ MBA 1P-{t.capacity || "..."}</div>
                                            <div className="pl-4">- No: {t.serialNumber}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {exportGroups.map(group => (
                    <div key={`export-${group.dateStr}`} className="mb-8">
                        <div className="text-lg font-bold mb-4">
                            Ngày {group.dateStr} "{unitName}" có trả MBA như sau:
                        </div>
                        {group.dispatches.map((dispatch) => (
                            <div key={dispatch.id} className="mb-4">
                                <div className="italic font-semibold mb-2">
                                    *Theo CV {dispatch.dispatchNumber || "..."} ngày {format(new Date(dispatch.date), "dd/MM/yyyy")}
                                </div>
                                <div className="pl-4">
                                    {dispatch.transformers.map((t: any, index: number) => (
                                        <div key={t.id} className="mb-2">
                                            <div className="font-semibold">{index + 1}/ MBA 1P-{t.capacity || "..."}</div>
                                            <div className="pl-4">- No: {t.serialNumber}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {imports.length === 0 && exports.length === 0 && (
                    <div className="text-center italic text-gray-500">
                        Không có dữ liệu báo cáo.
                    </div>
                )}
            </div>

            <div className="print:hidden fixed top-4 right-4 flex gap-2 no-print z-50">
                <button
                    onClick={handleScreenshot}
                    className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-sans flex items-center gap-2"
                    title="Copy ảnh vào clipboard"
                >
                    <Camera className="h-4 w-4" />
                    Copy Ảnh
                </button>
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-sans"
                >
                    In Báo Cáo
                </button>
            </div>
        </div >
    )
}
