"use client"

import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import type { Shift, Employee } from "@/types/schema"
import { ShiftCard } from "./ShiftCard"

interface ShiftBoardCellProps {
    employee: Employee
    day: Date
    shifts: Shift[]
    checkConflict: (shift: Shift, dayShifts: Shift[]) => boolean
    onAddShift: (date: Date, employeeId: string) => void
    onContextMenu: (event: React.MouseEvent, shift: Shift) => void
}

export function ShiftBoardCell({
    employee,
    day,
    shifts,
    checkConflict,
    onAddShift,
    onContextMenu
}: ShiftBoardCellProps) {
    const dayStr = format(day, 'yyyy-MM-dd')
    const cellId = `${employee.id}::${dayStr}`

    const { setNodeRef, isOver } = useDroppable({
        id: cellId,
        data: {
            employeeId: employee.id,
            date: dayStr
        }
    })

    return (
        <div
            ref={setNodeRef}
            className={`
                p-1 min-h-[50px] border-r last:border-r-0 flex flex-col justify-center gap-1 relative group/cell transition-colors
                ${isOver ? 'bg-primary/10 ring-inset ring-2 ring-primary/40' : ''}
            `}
        >
            {shifts.map(shift => {
                const hasConflict = checkConflict(shift, shifts)
                return (
                    <ShiftCard
                        key={shift.id}
                        shift={shift}
                        employeeColor={employee.color_code}
                        hasConflict={hasConflict}
                        onContextMenu={onContextMenu}
                    />
                )
            })}
            <button
                onClick={() => onAddShift(day, employee.id!)}
                className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center bg-primary/5 transition-all text-primary z-0"
                title={`Añadir turno`}
            >
                <Plus className="w-3 h-3" />
            </button>
        </div>
    )
}
