"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { AlertCircle } from "lucide-react"
import type { Shift } from "@/types/schema"

interface ShiftCardProps {
    shift: Shift
    employeeColor: string
    hasConflict?: boolean
    onContextMenu: (event: React.MouseEvent, shift: Shift) => void
    isOverlay?: boolean
}

export function ShiftCard({
    shift,
    employeeColor,
    hasConflict,
    onContextMenu,
    isOverlay
}: ShiftCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: shift.id!,
        data: { shift }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
        touchAction: 'none', // Critical for PointerSensor
    }

    if (isOverlay) {
        const overlayStyle = { borderLeftColor: hasConflict ? 'var(--destructive)' : employeeColor } as React.CSSProperties;
        return (

            <div
                className={`
                    bg-white border rounded-[4px] px-1.5 py-1 shadow-lg border-l-[3px] text-left w-[80px] opacity-90 cursor-grabbing
                    ${hasConflict ? 'ring-1 ring-destructive ring-offset-0 bg-destructive/5' : ''}
                `}
                style={overlayStyle}
            >
                <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold tabular-nums tracking-tight leading-none text-foreground/90">
                        {shift.start_time}-{shift.end_time}
                    </span>
                    {hasConflict && (
                        <AlertCircle className="w-2 h-2 text-destructive" />
                    )}
                </div>
            </div>
        )
    }

    const cardWrapperStyle = {
        borderLeftColor: hasConflict ? 'var(--destructive)' : employeeColor
    } as React.CSSProperties;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            // Add onContextMenu handler here
            onContextMenu={(e) => onContextMenu(e, shift)}
            className={`outline-none`} // Minimal wrapper
        >
            <div
                className={`
                        bg-white border rounded-[4px] px-1.5 py-1 shadow-sm border-l-[3px] hover:shadow transition-all cursor-grab active:cursor-grabbing group/shift relative text-left select-none z-10
                        ${hasConflict ? 'ring-1 ring-destructive ring-offset-0 bg-destructive/5' : ''}
                        ${isDragging ? 'opacity-30' : 'hover:-translate-y-px active:translate-y-0'}
                    `}
                style={cardWrapperStyle}
            >
                <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold tabular-nums tracking-tight leading-none text-foreground/90">
                        {shift.start_time}-{shift.end_time}
                    </span>
                    {hasConflict && (
                        <AlertCircle className="w-2 h-2 text-destructive animate-pulse" />
                    )}
                </div>
            </div>
        </div>
    )
}
