"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Upload, Plus, Trash2, Save, Check, ChevronsUpDown, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createExportDispatch } from "@/app/actions/export-dispatch"
import { getImportDispatches } from "@/app/actions/get-dispatches"

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
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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
})

export default function ExportPage() {
    const [pdfFile, setPdfFile] = useState<string | null>(null)
    // List of existing import dispatches for reference
    const [importDispatches, setImportDispatches] = useState<any[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const [selectedImportId, setSelectedImportId] = useState<string>("")

    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dispatchNumber: "",
            date: new Date().toISOString().split('T')[0],
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
        fetchImports()
    }, [])

    const handleSelectImport = (dispatch: any) => {
        setSelectedImportId(dispatch.id === selectedImportId ? "" : dispatch.id)
        if (dispatch.id !== selectedImportId && dispatch.fileUrl) {
            setPdfFile(dispatch.fileUrl)
            toast.info(`Đã chọn nguồn: ${dispatch.dispatchNumber}`)
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
            const result = await createExportDispatch(values)
            if (result.success) {
                toast.success("Đã lưu văn bản xuất thành công!")
                router.push('/')
                router.refresh()
            } else {
                toast.error(result.error || "Có lỗi xảy ra")
            }
        } catch (error) {
            toast.error("Lỗi kết nối")
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* LEFT PANE: PDF Viewer */}
            <div className="w-1/2 h-full border-r bg-muted/30 flex flex-col">
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
                    {pdfFile ? (
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

            {/* RIGHT PANE: Form */}
            <div className="w-1/2 h-full flex flex-col bg-background">
                <div className="p-4 border-b h-16 flex items-center justify-between">
                    <h2 className="font-semibold text-lg text-primary">Nhập số liệu MBA trả</h2>
                    <Button onClick={form.handleSubmit(onSubmit)} className="gap-2">
                        <Save className="w-4 h-4" /> Lưu thông tin
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">

                            {/* Thông tin chung */}
                            <Card className="bg-card">
                                <CardHeader className="py-3 bg-muted/40 border-b">
                                    <CardTitle className="text-sm font-medium">Thông tin chung</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4 pt-4">
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Chọn công văn nhập (nguồn)</FormLabel>
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
                                                <FormLabel>Số công văn trả</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="VD: 123/CV-P4" {...field} />
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
                                                <FormLabel>Ngày văn bản</FormLabel>
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
                                    ))}

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
                </ScrollArea>
            </div>
        </div>
    )
}
