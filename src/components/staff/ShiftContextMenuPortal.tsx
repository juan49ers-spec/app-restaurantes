"use client"

import React, { useLayoutEffect, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Copy, Trash2, X } from "lucide-react" // Added X for close button
import { Shift } from "@/types/schema"

interface ShiftContextMenuPortalProps {
    x: number;
    y: number;
    shift: Shift;
    onClose: () => void;
    onEdit: (shift: Shift) => void;
    onDuplicate: (shift: Shift) => void;
    onDelete: (shift: Shift) => void;
}

export const ShiftContextMenuPortal: React.FC<ShiftContextMenuPortalProps> = ({
    x,
    y,
    shift,
    onClose,
    onEdit,
    onDuplicate,
    onDelete
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Adjust position to keep within viewport
    useLayoutEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let finalX = x;
            let finalY = y;

            if (x + rect.width > vw) finalX = x - rect.width;
            if (y + rect.height > vh) finalY = y - rect.height;

            // Prevent going off left/top if viewport is too small
            finalX = Math.max(10, finalX);
            finalY = Math.max(10, finalY);

            menuRef.current.style.top = `${finalY}px`;
            menuRef.current.style.left = `${finalX}px`;
        }
    }, [x, y]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] w-64 bg-background border border-border rounded-md shadow-lg p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1"
        >
            <div className="px-2 py-1.5 flex flex-col gap-0.5 border-b border-border/50 mb-1">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Acciones del Turno</span>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Cerrar menú"
                        title="Cerrar menú"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
                <span className="text-xs font-bold text-primary">{shift.start_time} - {shift.end_time}</span>
            </div>

            <button
                onClick={() => { onEdit(shift); onClose(); }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left"
            >
                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">Editar</span>
            </button>

            <button
                onClick={() => { onDuplicate(shift); onClose(); }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left"
            >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">Duplicar al día Siguiente</span>
            </button>

            <div className="h-px bg-border/50 my-1" />

            <button
                onClick={() => { onDelete(shift); onClose(); }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-sm transition-colors text-left"
            >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="font-medium">Eliminar Turno</span>
            </button>
        </div>,
        document.body
    );
};
