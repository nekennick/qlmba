"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { UNITS } from "@/lib/constants"
import { useUnitStore } from "@/lib/store/unit-store"

export function UnitSwitcher() {
    const [open, setOpen] = useState(false)
    const { selectedUnit, setSelectedUnit } = useUnitStore()
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch by only rendering after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-[200px] h-9 bg-muted/20 animate-pulse rounded-md"></div>
    }

    // Find the label for the selected unit
    const selectedUnitLabel = UNITS.find((unit) => unit.value === selectedUnit)?.label

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full md:w-[280px] justify-between text-xs sm:text-sm h-9"
                >
                    <span className="truncate">
                        {selectedUnitLabel || "Chọn đơn vị..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
                <Command>
                    <CommandInput placeholder="Tìm đơn vị..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy đơn vị.</CommandEmpty>
                        <CommandGroup>
                            {UNITS.map((unit) => (
                                <CommandItem
                                    key={unit.value}
                                    value={unit.label}
                                    onSelect={() => {
                                        setSelectedUnit(unit.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedUnit === unit.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {unit.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
