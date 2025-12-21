import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UNITS } from '@/lib/constants'

interface UnitState {
    selectedUnit: string
    setSelectedUnit: (unit: string) => void
}

export const useUnitStore = create<UnitState>()(
    persist(
        (set) => ({
            selectedUnit: UNITS[0].value,
            setSelectedUnit: (unit) => set({ selectedUnit: unit }),
        }),
        {
            name: 'unit-storage',
        }
    )
)
