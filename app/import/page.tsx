"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Upload, Plus, Trash2, Save, Search, FileText } from "lucide-react"
import { toast } from "sonner"
import { createImportDispatch, searchDispatches } from "@/app/actions/import-dispatch"
import { uploadFile } from "@/app/actions/upload"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { useRouter } from "next/navigation"

const transformerSchema = z.object({
    serialNumber: z.string().min(1, "Bắt buộc"),
    capacity: z.string().min(1, "Bắt buộc"),
    model: z.string().optional(),
    note: z.string().optional(),
})

const formSchema = z.object({
    dispatchNumber: z.string().min(1, "Số công văn là bắt buộc"),
    date: z.string().min(1, "Ngày là bắt buộc"),
    transformers: z.array(transformerSchema).min(1, "Cần ít nhất 1 máy"),
    fileUrl: z.string().optional(),
})

export default function ImportPage() {
    const [pdfFile, setPdfFile] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dispatchNumber: "",
            date: new Date().toISOString().split('T')[0],
            transformers: [{ serialNumber: "", capacity: "", model: "", note: "" }],
        },
    })


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

            const payload = {
                ...values,
                fileUrl: uploadedFileUrl
            }

            const result = await createImportDispatch(payload)
            if (result.success) {
                toast.success("Đã lưu văn bản NHẬN thành công!")
                router.push('/')
                router.refresh()
            } else {
                toast.error(result.error || "Có lỗi xảy ra")
            }
        } catch (error) {
            console.error(error)
            toast.error("Lỗi kết nối")
        }
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* LEFT PANE: PDF & Info */}
            <div className="w-1/2 h-full border-r bg-gray-100 flex flex-col">
                <div className="p-4 border-b bg-white shadow-sm flex items-center justify-between h-16">
                    <h2 className="font-semibold text-lg">Văn bản / Nguồn</h2>
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
                                        <div key={result.id} className="p-3 border rounded hover:bg-slate-50 cursor-pointer flex justify-between items-center" onClick={() => handleSelectDispatch(result)}>
                                            <div>
                                                <div className="font-medium">{result.dispatchNumber}</div>
                                                <div className="text-xs text-gray-500">{new Date(result.date).toLocaleDateString("vi-VN")} - {result.transformers.length} máy</div>
                                            </div>
                                            <FileText className="w-4 h-4 text-gray-400" />
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && searchQuery && (
                                        <div className="text-center text-gray-500 py-4">Không tìm thấy kết quả</div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            id="file-upload-import"
                            onChange={handleFileChange}
                        />
                        <Button asChild variant="outline" size="sm">
                            <label htmlFor="file-upload-import" className="cursor-pointer flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span>Upload PDF</span>
                            </label>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-gray-200">
                    {pdfFile ? (
                        <object
                            data={pdfFile}
                            type="application/pdf"
                            className="w-full h-full"
                        >
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p>Trình duyệt không hỗ trợ xem trực tiếp.</p>
                            </div>
                        </object>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                                <Upload className="w-12 h-12 mb-2 opacity-50 mx-auto" />
                                <p>Upload PDF hoặc chọn công văn cũ <br /> để xem thông tin</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANE: Form */}
            <div className="w-1/2 h-full flex flex-col bg-white">
                <div className="p-4 border-b h-16 flex items-center justify-between bg-green-50/50">
                    <h2 className="font-semibold text-lg text-green-700">Nhập số liệu MBA nhận</h2>
                    <Button onClick={form.handleSubmit(onSubmit)} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4" /> Lưu thông tin
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">

                            {/* Thông tin chung */}
                            <Card>
                                <CardHeader className="py-3 bg-slate-50">
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
                                </CardContent>
                            </Card>

                            {/* Danh sách máy */}
                            <Card>
                                <CardHeader className="py-3 bg-slate-50 flex flex-row items-center justify-between space-y-0">
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
                                        <div key={field.id} className="flex gap-3 items-start p-3 border rounded-md bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            <div className="w-8 pt-2 text-center text-sm text-gray-400 font-medium">{index + 1}</div>

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
                                                className="text-red-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>

                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-dashed text-gray-500 hover:text-primary hover:border-primary"
                                        onClick={() => append({ serialNumber: "", capacity: "", model: "" })}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Thêm máy tiếp theo
                                    </Button>

                                </CardContent>
                            </Card>

                        </form>
                    </Form>
                </ScrollArea>
            </div>
        </div>
    )
}
