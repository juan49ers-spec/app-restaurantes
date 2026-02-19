"use client"

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, Copy, Trash2 } from "lucide-react"
import { Shift } from "@/types/schema"

interface ShiftContextMenuProps {
    children: React.ReactNode
    shift: Shift
    onEdit: (shift: Shift) => void
    onDuplicate: (shift: Shift) => void
    onDelete: (shift: Shift) => void
}

export function ShiftContextMenu({
    children,
    shift,
    onEdit,
    onDuplicate,
    onDelete
}: ShiftContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
                <div className="px-2 py-1.5 flex flex-col gap-0.5 border-b mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Acciones del Turno</span>
                    <span className="text-xs font-bold text-primary">{shift.start_time} - {shift.end_time}</span>
                </div>
                <ContextMenuItem onClick={() => onEdit(shift)} className="gap-2 cursor-pointer font-bold text-xs uppercase tracking-tighter">
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    Editar
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDuplicate(shift)} className="gap-2 cursor-pointer font-bold text-xs uppercase tracking-tighter">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    Duplicar al día Siguiente
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                    onClick={() => onDelete(shift)}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer font-black text-xs uppercase tracking-tighter"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Turno
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
