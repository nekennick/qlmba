"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Upload, Plus, Trash2, Save, Search, FileText, ArrowLeft, Link2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createImportDispatch, searchDispatches } from "@/app/actions/import-dispatch"
import { uploadFile } from "@/app/actions/upload"
import { getUnlinkedTtrs } from "@/app/actions/get-unlinked-ttrs"
import { getDispatchById } from "@/app/actions/get-dispatch"
import { updateDispatch } from "@/app/actions/update-dispatch"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"


import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { UNITS, CV_SUFFIX } from "@/lib/constants"
import { useUnitStore } from "@/lib/store/unit-store"

const transformerSchema = z.object({
    serialNumber: z.string().min(1, "Bắt buộc"),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
})

const formSchema = z.object({
    dispatchNumber: z.string().min(1, "Số công văn là bắt buộc"),
    date: z.string().min(1, "Ngày là bắt buộc"),
    documentType: z.enum(["CV", "TTr"]),
    linkedTtrIds: z.array(z.string()).optional(),
    transformers: z.array(transformerSchema).min(1, "Cần ít nhất 1 máy"),
    fileUrl: z.string().optional(),
    // CV info for linking TTr to CV
    linkedCvNumber: z.string().optional(),
    linkedCvDate: z.string().optional(),
})

export default function ImportPage() {
    const [pdfFile, setPdfFile] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [unlinkedTtrs, setUnlinkedTtrs] = useState<any[]>([])
    const [isEditMode, setIsEditMode] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [linkedCvInfo, setLinkedCvInfo] = useState<{ id: string; dispatchNumber: string } | null>(null)
    const [selectedTtrIds, setSelectedTtrIds] = useState<string[]>([])
    const [previewTtr, setPreviewTtr] = useState<{ id: string; dispatchNumber: string; date: string; fileUrl: string | null; transformers: any[] } | null>(null)
    const [linkedTtrsInfo, setLinkedTtrsInfo] = useState<{ id: string; dispatchNumber: string; date: string }[]>([])
    const router = useRouter()
    const searchParams = useSearchParams()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dispatchNumber: "",
            date: new Date().toISOString().split('T')[0],
            documentType: "CV",
            linkedTtrIds: [],
            transformers: [{ serialNumber: "", capacity: "", model: "", note: "" }],
        },
    })

    // Use state for documentType to avoid re-render on every form change from form.watch()
    const [documentType, setDocumentType] = useState<"CV" | "TTr">("CV")
    // Unit state is now managed globally by useUnitStore

    const hasLoadedEditData = useRef(false)

    // Check if in edit mode - run only once on mount
    useEffect(() => {
        const editParam = searchParams.get("edit")
        if (editParam && !hasLoadedEditData.current) {
            hasLoadedEditData.current = true
            setIsEditMode(true)
            setEditId(editParam)
            // Load dispatch data
            getDispatchById(editParam).then((result) => {
                if (result.success && result.data) {
                    const data = result.data
                    form.reset({
                        dispatchNumber: data.dispatchNumber || "",
                        date: data.date,
                        documentType: (data.documentType as "CV" | "TTr") || "CV",
                        linkedTtrIds: data.linkedTtrIds || [],
                        transformers: data.transformers.map(t => ({
                            serialNumber: t.serialNumber,
                            capacity: t.capacity,
                            model: t.model,
                            note: t.note,
                        })),
                    })
                    // Sync documentType state
                    setDocumentType((data.documentType as "CV" | "TTr") || "CV")
                    // Sync selectedTtrIds state
                    setSelectedTtrIds(data.linkedTtrIds || [])
                    if (data.fileUrl) {
                        setPdfFile(data.fileUrl)
                    }
                    // Set linked CV info if exists
                    if (data.linkedCvInfo && data.linkedCvInfo.dispatchNumber) {
                        setLinkedCvInfo({
                            id: data.linkedCvInfo.id,
                            dispatchNumber: data.linkedCvInfo.dispatchNumber
                        })
                    }
                    // Set linked TTrs info (for CV edit mode)
                    if (data.linkedTtrsInfo) {
                        setLinkedTtrsInfo(
                            data.linkedTtrsInfo
                                .filter((t: any) => t.dispatchNumber)
                                .map((t: any) => ({ id: t.id, dispatchNumber: t.dispatchNumber as string, date: t.date }))
                        )
                    }
                } else {
                    toast.error(result.error || "Không tìm thấy phiếu")
                    router.push("/")
                }
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const hasFetchedTtrs = useRef(false)

    // Fetch unlinked TTrs when documentType is CV (only once)
    useEffect(() => {
        if (documentType === "CV" && !hasFetchedTtrs.current) {
            hasFetchedTtrs.current = true
            getUnlinkedTtrs().then((result) => {
                if (result.success && result.data) {
                    setUnlinkedTtrs(result.data)
                }
            })
        }
    }, [documentType])

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "transformers",
    })

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPdfFile(url)
        }
    }

    const handleSearch = async () => {
        const results = await searchDispatches(searchQuery)
        setSearchResults(results)
    }

    const handleSelectDispatch = (dispatch: any) => {
        // Populate transformers from selected dispatch
        const loadedTransformers = dispatch.transformers.map((t: any) => ({
            serialNumber: t.serialNumber,
            capacity: t.capacity,
            model: t.model || ""
        }))

        replace(loadedTransformers)
        toast.success(`Đã tải ${loadedTransformers.length} máy từ công văn ${dispatch.dispatchNumber}`)
        setIsSearchOpen(false)

        // Optionally set PDF if we had a real URL
        if (dispatch.fileUrl) {
            // setPdfFile(dispatch.fileUrl)
        }
    }

    // Filter unlinked TTrs: if any TTr is already selected/linked, hide others
    const visibleUnlinkedTtrs = unlinkedTtrs.filter(ttr =>
        selectedTtrIds.length === 0 || selectedTtrIds.includes(ttr.id)
    )

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            let uploadedFileUrl = ""

            if (selectedFile) {
                const formData = new FormData()
                formData.append("file", selectedFile)
                const uploadResult = await uploadFile(formData)
                if (uploadResult.success && uploadResult.url) {
                    uploadedFileUrl = uploadResult.url
                } else {
                    toast.error("Lỗi upload file PDF")
                    return
                }
            }

            // Tự động thêm hậu tố vào số công văn
            let dispatchNumberWithSuffix = values.dispatchNumber
            if (values.documentType === "CV") {
                // CV hậu tố: /PCĐT-KT+KHVT
                if (!dispatchNumberWithSuffix.includes(CV_SUFFIX)) {
                    dispatchNumberWithSuffix = `${values.dispatchNumber}${CV_SUFFIX}`
                }
            } else if (values.documentType === "TTr") {
                // TTr hậu tố theo đơn vị (Global setting)
                const currentUnit = useUnitStore.getState().selectedUnit
                const selectedUnitObj = UNITS.find(u => u.value === currentUnit)
                if (selectedUnitObj && !dispatchNumberWithSuffix.includes(selectedUnitObj.suffix)) {
                    dispatchNumberWithSuffix = `${values.dispatchNumber}${selectedUnitObj.suffix}`
                }
            }

            const payload = {
                ...values,
                dispatchNumber: dispatchNumberWithSuffix,
                fileUrl: uploadedFileUrl || pdfFile || "",
                linkedTtrIds: values.linkedTtrIds || [],
            }

            let result
            if (isEditMode && editId) {
                // Update existing dispatch
                result = await updateDispatch({ id: editId, ...payload })
            } else {
                // Create new dispatch
                result = await createImportDispatch(payload)
            }

            if (result.success) {
                const docTypeName = values.documentType === "CV" ? "Công Văn" : "Tờ Trình"
                const action = isEditMode ? "cập nhật" : "lưu"
                toast.success(`Đã ${action} ${docTypeName} NHẬN thành công!`)
                router.push('/')
                router.refresh()
            } else {
                toast.error(result.error || "Có lỗi xảy ra")
            }
        } catch (error) {
            console.error(error)
            toast.error("Lỗi kết nối: " + (error as Error).message)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* LEFT PANE: PDF & Info */}
            <div className="w-1/2 h-full border-r bg-muted/30 flex flex-col">
                <div className="p-4 border-b bg-card shadow-sm flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h2 className="font-semibold text-lg">Văn bản / Nguồn</h2>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="gap-2">
                                    <Search className="w-4 h-4" /> Tìm công văn cũ
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Tìm kiếm công văn</DialogTitle>
                                </DialogHeader>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Nhập số công văn..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button onClick={handleSearch}>Tìm</Button>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {searchResults.map(result => (
                                        <div key={result.id} className="p-3 border rounded hover:bg-accent cursor-pointer flex justify-between items-center" onClick={() => handleSelectDispatch(result)}>
                                            <div>
                                                <div className="font-medium">{result.dispatchNumber}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(result.date).toLocaleDateString("vi-VN")} - {result.transformers.length} máy</div>
                                            </div>
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && searchQuery && (
                                        <div className="text-center text-muted-foreground py-4">Không tìm thấy kết quả</div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            className="hidden"
                            id="file-upload-import"
                            onChange={handleFileChange}
                        />
                        <Button asChild variant="outline" size="sm">
                            <label htmlFor="file-upload-import" className="cursor-pointer flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span>Upload File</span>
                            </label>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-muted/50 dark:bg-muted/10">
                    {previewTtr ? (
                        // Preview TTr được chọn
                        <div className="w-full h-full flex flex-col">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-blue-700 dark:text-blue-400">
                                            Tờ Trình: {previewTtr.dispatchNumber}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Ngày: {new Date(previewTtr.date).toLocaleDateString("vi-VN")} - {previewTtr.transformers.length} MBA
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewTtr(null)}
                                    >
                                        ✕ Đóng
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                {previewTtr.fileUrl ? (
                                    previewTtr.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) ? (
                                        <img
                                            src={previewTtr.fileUrl}
                                            alt="Preview"
                                            className="max-w-full max-h-full object-contain shadow-md mx-auto"
                                        />
                                    ) : (
                                        <object
                                            data={previewTtr.fileUrl}
                                            type="application/pdf"
                                            className="w-full h-full min-h-[400px]"
                                        >
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                <p>Không thể hiển thị PDF. <a href={previewTtr.fileUrl} target="_blank" className="text-blue-600 underline">Tải xuống</a></p>
                                            </div>
                                        </object>
                                    )
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-center mb-4">Tờ trình không có file đính kèm</p>
                                        <div className="bg-muted/50 rounded-lg p-4">
                                            <h4 className="font-medium mb-2">Danh sách MBA:</h4>
                                            {previewTtr.transformers.map((t: any, idx: number) => (
                                                <div key={idx} className="text-sm py-1 border-b last:border-0">
                                                    <span className="font-mono">{t.serialNumber}</span>
                                                    <span className="text-muted-foreground ml-2">({t.capacity} - {t.model || 'N/A'})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : pdfFile ? (
                        <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                            {pdfFile.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/) || (selectedFile?.type.startsWith('image/')) ? (
                                <img
                                    src={pdfFile}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain shadow-md"
                                />
                            ) : (
                                <object
                                    data={pdfFile}
                                    type="application/pdf"
                                    className="w-full h-full"
                                >
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <p>Trình duyệt không hỗ trợ xem trực tiếp.</p>
                                    </div>
                                </object>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <Upload className="w-12 h-12 mb-2 opacity-50 mx-auto" />
                                <p>Upload PDF/Ảnh hoặc chọn công văn cũ <br /> để xem thông tin</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANE: Form */}
            <div className="w-1/2 h-full flex flex-col bg-background">
                <div className="p-4 border-b h-16 flex items-center justify-between bg-green-50/50 dark:bg-green-900/10">
                    <h2 className="font-semibold text-lg text-green-700 dark:text-green-400">
                        {isEditMode ? "Chỉnh sửa MBA nhận" : "Nhập số liệu MBA nhận"}
                    </h2>
                    <Button onClick={form.handleSubmit(onSubmit)} className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-white">
                        <Save className="w-4 h-4" /> {isEditMode ? "Cập nhật" : "Lưu thông tin"}
                    </Button>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">

                            {/* Thông tin chung */}
                            <Card className="bg-card">
                                <CardHeader className="py-3 bg-muted/40 border-b">
                                    <CardTitle className="text-sm font-medium">Thông tin công văn nhập</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4 pt-4">
                                    <FormField
                                        control={form.control}
                                        name="dispatchNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Số công văn NHẬN</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="VD: 999/CV-Nhan" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ngày nhập</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="documentType"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Loại chứng từ</FormLabel>
                                                <FormControl>
                                                    <select
                                                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={field.value}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value)
                                                            setDocumentType(e.target.value as "CV" | "TTr")
                                                        }}
                                                        disabled={isEditMode}
                                                    >
                                                        <option value="CV">Công Văn (CV) - Chứng từ chính thức</option>
                                                        <option value="TTr">Tờ Trình (TTr) - Chứng từ tạm thời</option>
                                                    </select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Đơn vị: Sử dụng cài đặt chung từ Dashboard */}
                                </CardContent>
                            </Card>

                            {/* Hiển thị TTr đã liên kết (khi edit CV) */}
                            {isEditMode && documentType === "CV" && linkedTtrsInfo.length > 0 && (
                                <Card className="bg-card border-green-200 dark:border-green-800">
                                    <CardHeader className="py-3 bg-green-50/50 dark:bg-green-900/20 border-b">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Link2 className="w-4 h-4 text-green-600" />
                                            Tờ Trình đã liên kết ({linkedTtrsInfo.length})
                                        </CardTitle>
                                        <CardDescription>
                                            Các Tờ Trình đã được liên kết với Công Văn này
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        {linkedTtrsInfo.map((ttr) => (
                                            <div
                                                key={ttr.id}
                                                className="flex items-center gap-3 p-3 border rounded-md bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-green-700 dark:text-green-400">{ttr.dispatchNumber}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(ttr.date).toLocaleDateString("vi-VN")}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Liên kết TTr (chỉ hiển thị khi loại chứng từ là CV) */}
                            {documentType === "CV" && visibleUnlinkedTtrs.length > 0 && (
                                <Card className="bg-card border-blue-200 dark:border-blue-800">
                                    <CardHeader className="py-3 bg-blue-50/50 dark:bg-blue-900/20 border-b">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Link2 className="w-4 h-4 text-blue-600" />
                                            Liên kết Tờ Trình ({visibleUnlinkedTtrs.filter(t => selectedTtrIds.includes(t.id)).length} đã chọn)
                                        </CardTitle>
                                        <CardDescription>
                                            Chọn các Tờ Trình đã nhận trước đó để liên kết với Công Văn này
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        {visibleUnlinkedTtrs.map((ttr) => (
                                            <div
                                                key={ttr.id}
                                                className={`flex items-center gap-3 p-3 border rounded-md transition-colors ${selectedTtrIds.includes(ttr.id)
                                                    ? "bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700"
                                                    : "hover:bg-muted/50"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTtrIds.includes(ttr.id)}
                                                    onChange={() => {
                                                        const newIds = selectedTtrIds.includes(ttr.id)
                                                            ? selectedTtrIds.filter((id) => id !== ttr.id)
                                                            : [...selectedTtrIds, ttr.id]
                                                        setSelectedTtrIds(newIds)
                                                        form.setValue("linkedTtrIds", newIds, { shouldValidate: true })
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium">{ttr.dispatchNumber}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(ttr.date).toLocaleDateString("vi-VN")} - {ttr.transformers.length} MBA
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant={previewTtr?.id === ttr.id ? "default" : "ghost"}
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setPreviewTtr(previewTtr?.id === ttr.id ? null : ttr)}
                                                    title="Xem preview"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Liên kết CV chính thức (chỉ hiển thị khi đang edit TTr) */}
                            {isEditMode && documentType === "TTr" && (
                                <Card className="bg-card border-green-200 dark:border-green-800">
                                    <CardHeader className="py-3 bg-green-50/50 dark:bg-green-900/20 border-b">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-green-600" />
                                            Liên kết Công Văn chính thức
                                        </CardTitle>
                                        <CardDescription>
                                            {linkedCvInfo
                                                ? `Đã liên kết với: ${linkedCvInfo.dispatchNumber}`
                                                : "Nhập thông tin CV chính thức để liên kết với Tờ Trình này"
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {!linkedCvInfo && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="linkedCvNumber"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Số Công Văn chính thức</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="VD: 123/CV-PC07" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="linkedCvDate"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Ngày Công Văn</FormLabel>
                                                            <FormControl>
                                                                <Input type="date" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-3">
                                            Khi lưu, hệ thống sẽ tự động tạo CV chính thức và liên kết với TTr này
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Danh sách máy */}
                            <Card className="bg-card">
                                <CardHeader className="py-3 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-medium">Danh sách Máy biến áp ({fields.length})</CardTitle>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => append({ serialNumber: "", capacity: "", model: "" })}
                                        className="gap-1 h-8"
                                    >
                                        <Plus className="w-3 h-3" /> Thêm dòng
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-start p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                                            <div className="w-8 pt-2 text-center text-sm text-muted-foreground font-medium">{index + 1}</div>

                                            <FormField
                                                control={form.control}
                                                name={`transformers.${index}.serialNumber`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input placeholder="Số máy (Serial No)" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`transformers.${index}.capacity`}
                                                render={({ field }) => (
                                                    <FormItem className="w-32">
                                                        <FormControl>
                                                            <select
                                                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                value={field.value || ""}
                                                                onChange={(e) => field.onChange(e.target.value)}
                                                            >
                                                                <option value="">Dung lượng</option>
                                                                {["25kVA", "37.5kVA", "50kVA", "75kVA", "100kVA", "160kVA", "250kVA"].map((cap) => (
                                                                    <option key={cap} value={cap}>{cap}</option>
                                                                ))}
                                                            </select>
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`transformers.${index}.model`}
                                                render={({ field }) => (
                                                    <FormItem className="w-32">
                                                        <FormControl>
                                                            <select
                                                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                value={field.value || ""}
                                                                onChange={(e) => field.onChange(e.target.value)}
                                                            >
                                                                <option value="">Loại/Hãng</option>
                                                                <option value="1P">1P</option>
                                                                <option value="3P">3P</option>
                                                            </select>
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`transformers.${index}.note`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input placeholder="Ghi chú" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>

                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                                        onClick={() => append({ serialNumber: "", capacity: "", model: "" })}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Thêm máy tiếp theo
                                    </Button>

                                </CardContent>
                            </Card>

                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}
