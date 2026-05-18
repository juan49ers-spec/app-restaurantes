"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmt, fmtPct } from "./types"

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">{title}</p>
            {children}
        </div>
    )
}

export function KPICell({ label, value, sub, trend, editable, onEdit }: {
    label: string
    value: string
    sub?: string
    trend?: "up" | "down" | "flat"
    editable?: boolean
    onEdit?: (v: number) => void
}) {
    return (
        <div className="bg-white dark:bg-neutral-900 p-3">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
            <div className="flex items-center gap-1.5 mt-1">
                {editable && onEdit ? (
                    <input
                        type="number"
                        step="0.01"
                        title={`Editar ${label}`}
                        defaultValue={parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."))}
                        onBlur={(e) => onEdit(parseFloat(e.target.value) || 0)}
                        className="w-full text-sm font-bold px-1.5 py-0.5 border rounded-lg bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-800 text-neutral-800 dark:text-neutral-200"
                    />
                ) : (
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{value}</p>
                )}
                {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                {trend === "flat" && <Minus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
            </div>
            {sub && <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>}
        </div>
    )
}

export function RatioBadge({ label, value, target }: { label: string; value: number; target: number }) {
    const diff = value - target
    const isOver = diff > 2
    const isOk = Math.abs(diff) <= 2

    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
            isOver ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400" :
                isOk ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" :
                    "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
        )}>
            {label}: {fmtPct(value)}
            <span className="opacity-50">/{target}%</span>
        </span>
    )
}

export function EditableMiniKPI({ label, value, editable, onEdit }: {
    label: string
    value: number
    editable?: boolean
    onEdit?: (v: number) => void
}) {
    return (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-neutral-500">{label}</p>
            {editable && onEdit ? (
                <input
                    type="number"
                    step="0.01"
                    title={`Editar ${label}`}
                    defaultValue={value}
                    onBlur={(e) => onEdit(parseFloat(e.target.value) || 0)}
                    className="w-full font-mono text-xs font-medium px-1 py-0.5 mt-0.5 border rounded bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-800"
                />
            ) : (
                <p className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{fmt(value)}</p>
            )}
        </div>
    )
}
