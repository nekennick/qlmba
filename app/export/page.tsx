"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Upload, Plus, Trash2, Save, Check, ChevronsUpDown, ArrowLeft, Camera } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createExportDispatch } from "@/app/actions/export-dispatch"
import { getImportDispatches, getFailedCBMTransformers, markTransformerProcessed } from "@/app/actions/get-dispatches"
import { getDispatchById } from "@/app/actions/get-dispatch"
import { updateDispatch } from "@/app/actions/update-dispatch"
import { checkDuplicateSerials } from "@/app/actions/validate-serial"
import { uploadTransformerImage } from "@/app/actions/upload-transformer-image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { UNITS, CV_SUFFIX } from "@/lib/constants"
import { useUnitStore } from "@/lib/store/unit-store"

const transformerSchema = z.object({
    serialNumber: z.string().min(1, "Bắt buộc"),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
    imageUrl: z.string().optional(), // URL hình ảnh máy biến áp
})

const formSchema = z.object({
    dispatchNumber: z.string().min(1, "Số công văn là bắt buộc"),
    date: z.string().min(1, "Ngày là bắt buộc"),
    transactionDate: z.string().optional(),
    documentType: z.enum(["CV", "TTr"]),
    isCBM: z.boolean().optional(),
    transformers: z.array(transformerSchema).min(1, "Cần ít nhất 1 máy"),
})

export default function ExportPage() {
    const [pdfFile, setPdfFile] = useState<string | null>(null)
    // List of existing import dispatches for reference
    const [importDispatches, setImportDispatches] = useState<any[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const [selectedImportId, setSelectedImportId] = useState<string>("")
    const [documentType, setDocumentType] = useState<"CV" | "TTr">("CV")
    const [isCBM, setIsCBM] = useState(false)
    const [failedCbmMachines, setFailedCbmMachines] = useState<any[]>([]) // Máy CBM không đạt thí nghiệm
    const [previewImage, setPreviewImage] = useState<string | null>(null) // Preview ảnh máy biến áp
    // Unit state is now managed globally by useUnitStore

    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get("edit")
    const isEditMode = !!editId

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dispatchNumber: "",
            date: new Date().toISOString().split('T')[0],
            transactionDate: new Date().toISOString().split('T')[0],
            documentType: "CV",
            isCBM: false,
            transformers: [{ serialNumber: "", capacity: "", model: "", note: "" }],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "transformers",
    })

    useEffect(() => {
        const fetchImports = async () => {
            const data = await getImportDispatches()
            setImportDispatches(data)
        }
        const fetchFailedMachines = async () => {
            const data = await getFailedCBMTransformers()
            setFailedCbmMachines(data)
        }
        fetchImports()
        fetchFailedMachines()
    }, [])

    useEffect(() => {
        if (editId) {
            getDispatchById(editId).then((result) => {
                if (result.success && result.data) {
                    const data = result.data
                    form.reset({
                        dispatchNumber: data.dispatchNumber || "",
                        date: data.date,
                        transactionDate: data.transactionDate || new Date().toISOString().split('T')[0],
                        documentType: (data.documentType as "CV" | "TTr") || "CV",
                        isCBM: data.isCBM || false,
                        transformers: data.transformers.map(t => ({
                            serialNumber: t.serialNumber,
                            capacity: t.capacity,
                            model: t.model || "",
                            note: t.note || "",
                            imageUrl: t.imageUrl || undefined, // Load imageUrl từ DB
                        })),
                    })
                    setDocumentType((data.documentType as "CV" | "TTr") || "CV")
                    setIsCBM(data.isCBM || false)
                    if (data.fileUrl) {
                        setPdfFile(data.fileUrl)
                    }
                    if (data.sourceDispatchId) {
                        setSelectedImportId(data.sourceDispatchId)
                    }
                } else {
                    toast.error("Không tìm thấy dữ liệu")
                }
            })
        }
    }, [editId, form])

    const handleSelectImport = (dispatch: any) => {
        const isSelected = dispatch.id !== selectedImportId
        setSelectedImportId(isSelected ? dispatch.id : "")
        if (isSelected) {
            // Auto-fill from source
            form.setValue("dispatchNumber", dispatch.dispatchNumber)
            form.setValue("date", new Date(dispatch.date).toISOString().split('T')[0])
            const docType = (dispatch.documentType as "CV" | "TTr") || "CV"
            form.setValue("documentType", docType)
            setDocumentType(docType)

            if (dispatch.fileUrl) {
                setPdfFile(dispatch.fileUrl)
                toast.info(`Đã chọn nguồn: ${dispatch.dispatchNumber}`)
            }
        }
        setOpenCombobox(false)
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setPdfFile(url)
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            // Kiểm tra serial number trùng lặp (chỉ kiểm tra khi tạo mới, không kiểm tra CBM)
            if (!isEditMode && !isCBM) {
                const serials = values.transformers.map(t => t.serialNumber)
                const { duplicates } = await checkDuplicateSerials(serials, "EXPORT", false)
                if (duplicates.length > 0) {
                    const dupList = duplicates.map(d => `${d.serialNumber} (${d.dispatchNumber})`).join(", ")
                    const proceed = confirm(`Cảnh báo: Các số máy sau đã tồn tại trong hệ thống:\n${dupList}\n\nBạn có muốn tiếp tục lưu không?`)
                    if (!proceed) return
                }
            }

            // Tự động thêm hậu tố vào số công văn (chỉ khi không chọn nguồn từ CV có sẵn)
            let dispatchNumberWithSuffix = values.dispatchNumber
            if (!selectedImportId) {
                const currentUnit = useUnitStore.getState().selectedUnit
                const selectedUnitObj = UNITS.find(u => u.value === currentUnit)

                if (isCBM) {
                    // CBM hậu tố theo đơn vị: /ĐTB-KT
                    if (selectedUnitObj && !dispatchNumberWithSuffix.includes(selectedUnitObj.cbmSuffix)) {
                        dispatchNumberWithSuffix = `${values.dispatchNumber}${selectedUnitObj.cbmSuffix}`
                    }
                } else if (values.documentType === "CV") {
                    // CV hậu tố: /PCĐT-KT+KHVT
                    if (!dispatchNumberWithSuffix.includes(CV_SUFFIX)) {
                        dispatchNumberWithSuffix = `${values.dispatchNumber}${CV_SUFFIX}`
                    }
                } else if (values.documentType === "TTr") {
                    // TTr hậu tố theo đơn vị (Global setting)
                    if (selectedUnitObj && !dispatchNumberWithSuffix.includes(selectedUnitObj.suffix)) {
                        dispatchNumberWithSuffix = `${values.dispatchNumber}${selectedUnitObj.suffix}`
                    }
                }
            }

            const payload = {
                ...values,
                dispatchNumber: dispatchNumberWithSuffix,
                sourceDispatchId: selectedImportId || undefined,
                isCBM: isCBM,
            }

            if (isEditMode && editId) {
                // Update
                const updatePayload = {
                    ...payload,
                    id: editId,
                    fileUrl: pdfFile || undefined,
                    sourceDispatchId: selectedImportId || undefined,
                }
                const result = await updateDispatch(updatePayload)
                if (result.success) {
                    toast.success("Cập nhật thành công!")
                    router.push('/')
                    router.refresh()
                } else {
                    toast.error(result.error || "Có lỗi xảy ra")
                }
            } else {
                // Create
                const result = await createExportDispatch(payload)
                if (result.success) {
                    const docTypeName = values.documentType === "CV" ? "Công Văn" : "Tờ Trình"
                    toast.success(`Đã lưu ${docTypeName} TRẢ thành công!`)
                    router.push('/')
                    router.refresh()
                } else {
                    toast.error(result.error || "Có lỗi xảy ra")
                }
            }
        } catch (error) {
            toast.error("Lỗi kết nối")
        }
    }

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
            {/* LEFT PANE: PDF Viewer - Hidden on mobile */}
            <div className="hidden md:flex md:w-1/2 h-full border-r bg-muted/30 flex-col">
                <div className="p-4 border-b bg-card shadow-sm flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h2 className="font-semibold text-lg">Văn bản đính kèm</h2>
                    </div>
                    <div>
                        <Input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileChange}
                        />
                        <Button asChild variant="outline" size="sm">
                            <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span>Chọn File</span>
                            </label>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-muted/50 dark:bg-muted/10">
                    {previewImage ? (
                        /* Preview ảnh máy biến áp */
                        <div className="w-full h-full flex flex-col">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-b">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-blue-700 dark:text-blue-400">
                                        Ảnh máy biến áp
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setPreviewImage(null)}>
                                        ✕ Đóng
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
                                <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />
                            </div>
                        </div>
                    ) : pdfFile ? (
                        <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                            {pdfFile.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)/) ? (
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
                            <Upload className="w-12 h-12 mb-2 opacity-50" />
                            <p>Chưa có file nào được chọn</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANE: Form - Full width on mobile */}
            <div className="w-full md:w-1/2 h-full flex flex-col bg-background">
                <div className="p-3 md:p-4 border-b min-h-14 md:h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {/* Back button - chỉ hiện trên mobile */}
                        <Button asChild variant="ghost" size="icon" className="h-10 w-10 md:hidden">
                            <Link href="/">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <h2 className="font-semibold text-base md:text-lg text-primary">
                            {isEditMode ? "Cập nhật số liệu MBA trả" : "Nhập số liệu MBA trả"}
                        </h2>
                    </div>
                    <Button onClick={form.handleSubmit(onSubmit)} size="sm" className="h-10 gap-2">
                        <Save className="w-4 h-4" /> {isEditMode ? "Cập nhật" : "Lưu"}
                    </Button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">

                            {/* Thông tin chung */}
                            <Card className="bg-card">
                                <CardHeader className="py-3 bg-muted/40 border-b">
                                    <CardTitle className="text-sm font-medium">Thông tin chung</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Tải từ CV đã nhập (tùy chọn)</FormLabel>
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCombobox}
                                                    className="justify-between"
                                                >
                                                    {selectedImportId
                                                        ? importDispatches.find((framework) => framework.id === selectedImportId)?.dispatchNumber
                                                        : "Chọn công văn..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Tìm số công văn..." />
                                                    <CommandGroup>
                                                        {importDispatches.map((framework) => (
                                                            <CommandItem
                                                                key={framework.id}
                                                                value={framework.dispatchNumber}
                                                                onSelect={() => handleSelectImport(framework)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedImportId === framework.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {framework.dispatchNumber} - {new Date(framework.date).toLocaleDateString("vi-VN")}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>

                                    <FormField
                                        control={form.control}
                                        name="dispatchNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Số công văn TRẢ</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="VD: 123" {...field} />
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
                                                <FormLabel>Ngày công văn</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="transactionDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ngày trả MBA</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value || new Date().toISOString().split('T')[0]} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="documentType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Loại chứng từ</FormLabel>
                                                <FormControl>
                                                    <select
                                                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={field.value}
                                                        onChange={(e) => {
                                                            field.onChange(e.target.value)
                                                            setDocumentType(e.target.value as "CV" | "TTr")
                                                        }}
                                                    >
                                                        <option value="CV">Công Văn (CV) - Chứng từ chính thức</option>
                                                        <option value="TTr">Tờ Trình (TTr) - Chứng từ tạm thời</option>
                                                    </select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Checkbox CBM - Gửi máy đi thí nghiệm */}
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-amber-50 dark:bg-amber-950/30">
                                        <input
                                            type="checkbox"
                                            id="cbm-checkbox"
                                            checked={isCBM}
                                            onChange={(e) => {
                                                setIsCBM(e.target.checked)
                                                form.setValue("isCBM", e.target.checked)
                                            }}
                                            className="h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                                        />
                                        <div className="space-y-1 leading-none">
                                            <label htmlFor="cbm-checkbox" className="text-sm font-medium cursor-pointer text-amber-800 dark:text-amber-200">
                                                CBM - Đề nghị thí nghiệm
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Gửi máy đi thí nghiệm (hậu tố: /ĐỘI-KT)
                                            </p>
                                        </div>
                                    </FormItem>
                                    {/* Đơn vị: Sử dụng cài đặt chung từ Dashboard */}
                                </CardContent>
                            </Card>

                            {/* Máy CBM không đạt - gợi ý thêm vào danh sách trả */}
                            {failedCbmMachines.length > 0 && (
                                <Card className="bg-card border-red-200 dark:border-red-800">
                                    <CardHeader className="py-3 bg-red-50/50 dark:bg-red-900/20 border-b">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            Máy CBM không đạt thí nghiệm ({failedCbmMachines.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        <p className="text-xs text-muted-foreground mb-3">
                                            Những máy này đã thí nghiệm CBM nhưng không đạt. Click để thêm vào danh sách trả:
                                        </p>
                                        {failedCbmMachines.map((machine) => (
                                            <div
                                                key={machine.id}
                                                className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-md bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">
                                                        {machine.serialNumber}
                                                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-500 text-white rounded">FAIL</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {machine.capacity} - {machine.model || "Không xác định"} |
                                                        <span className="ml-1 text-red-600 dark:text-red-400">
                                                            CV: {machine.dispatchNumber}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 h-7 text-xs border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                    onClick={async () => {
                                                        append({
                                                            serialNumber: machine.serialNumber,
                                                            capacity: machine.capacity || "",
                                                            model: machine.model || "",
                                                            note: `CBM FAIL - ${machine.dispatchNumber}`,
                                                        })
                                                        // Đánh dấu máy đã được xử lý trong DB
                                                        await markTransformerProcessed(machine.id)
                                                        // Remove from list after adding
                                                        setFailedCbmMachines(prev => prev.filter(m => m.id !== machine.id))
                                                        toast.success(`Đã thêm máy ${machine.serialNumber} vào danh sách trả`)
                                                    }}
                                                >
                                                    <Plus className="w-3 h-3" /> Thêm
                                                </Button>
                                            </div>
                                        ))}
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
                                        onClick={() => append({ serialNumber: "", capacity: "", model: "", note: "" })}
                                        className="gap-1 h-8"
                                    >
                                        <Plus className="w-3 h-3" /> Thêm dòng
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    {fields.map((field, index) => {
                                        const imageUrl = form.watch(`transformers.${index}.imageUrl`)

                                        const handleImageDrop = async (e: React.DragEvent) => {
                                            e.preventDefault()
                                            const file = e.dataTransfer.files[0]
                                            if (file && file.type.startsWith("image/")) {
                                                const formData = new FormData()
                                                formData.append("file", file)
                                                const result = await uploadTransformerImage(formData)
                                                if (result.success && result.url) {
                                                    form.setValue(`transformers.${index}.imageUrl`, result.url)
                                                    toast.success("Đã upload ảnh")
                                                } else {
                                                    toast.error(result.error || "Lỗi upload")
                                                }
                                            }
                                        }

                                        const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = e.target.files?.[0]
                                            if (file && file.type.startsWith("image/")) {
                                                const formData = new FormData()
                                                formData.append("file", file)
                                                const result = await uploadTransformerImage(formData)
                                                if (result.success && result.url) {
                                                    form.setValue(`transformers.${index}.imageUrl`, result.url)
                                                    toast.success("Đã upload ảnh")
                                                } else {
                                                    toast.error(result.error || "Lỗi upload")
                                                }
                                            }
                                            e.target.value = "" // reset input
                                        }

                                        const handleImageClick = () => {
                                            if (imageUrl) {
                                                setPreviewImage(imageUrl)
                                            }
                                        }

                                        return (
                                            <div key={field.id} className="flex flex-col md:flex-row gap-2 md:gap-3 items-start p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                                                {/* Drop zone / Thumbnail */}
                                                <div className="relative">
                                                    {/* File input - chỉ hiện khi chưa có ảnh */}
                                                    {!imageUrl && (
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileSelect}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            title="Chọn ảnh từ thiết bị"
                                                        />
                                                    )}
                                                    <div
                                                        className={`w-14 h-14 md:w-16 md:h-16 border-2 border-dashed rounded-md flex items-center justify-center transition-all cursor-pointer ${imageUrl ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20' : 'border-muted-foreground/30 hover:border-primary/50'
                                                            }`}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={handleImageDrop}
                                                        onClick={imageUrl ? handleImageClick : undefined}
                                                        title={imageUrl ? "Click để xem ảnh lớn" : "Kéo thả hoặc click để chọn ảnh"}
                                                    >
                                                        {imageUrl ? (
                                                            <img src={imageUrl} alt="MBA" className="w-full h-full object-cover rounded" />
                                                        ) : (
                                                            <Camera className="w-5 h-5 text-muted-foreground/50" />
                                                        )}
                                                    </div>
                                                    {/* Nút đổi ảnh - chỉ hiện khi đã có ảnh */}
                                                    {imageUrl && (
                                                        <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors z-10" title="Đổi ảnh">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleFileSelect}
                                                                className="hidden"
                                                            />
                                                            <Camera className="w-3 h-3 text-primary-foreground" />
                                                        </label>
                                                    )}
                                                </div>

                                                <div className="w-8 pt-2 text-center text-sm text-muted-foreground font-medium hidden md:block">{index + 1}</div>

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
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Dung lượng" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {["25kVA", "37.5kVA", "50kVA", "75kVA", "100kVA", "160kVA", "250kVA"].map((cap) => (
                                                                        <SelectItem key={cap} value={cap}>
                                                                            {cap}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name={`transformers.${index}.model`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-32">
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Loại/Hãng" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="1P">1P</SelectItem>
                                                                    <SelectItem value="3P">3P</SelectItem>
                                                                </SelectContent>
                                                            </Select>
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
                                        )
                                    })}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                                        onClick={() => append({ serialNumber: "", capacity: "", model: "", note: "" })}
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
