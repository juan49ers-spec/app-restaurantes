"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, CloudDownload } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReportImportRecord } from "./types"
import { fmtPct } from "./types"

export function HistoryRow({ record }: { record: ReportImportRecord }) {
    const [expanded, setExpanded] = useState(false)
    const date = new Date(record.created_at)

    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        record.status === "completed" ? "bg-emerald-500" :
                            record.status === "partial" ? "bg-amber-500" : "bg-red-500"
                    )} />
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {record.month_key} — {record.file_name}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                            {date.toLocaleDateString("es-ES")} {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}{record.source === "drive" ? (
                                <><CloudDownload className="w-3 h-3 inline" /> Drive</>
                            ) : "Upload manual"}
                            {" · "}{record.expenses_inserted} gastos
                            {record.sales_inserted && " + ventas"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-400">{fmtPct((record.confidence || 0) * 100)}</span>
                    {expanded ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-3 space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                    {record.discrepancies && record.discrepancies.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Discrepancias detectadas</p>
                            {record.discrepancies.map((d: { label: string; severity: "ok" | "warn" | "error"; diff_pct: number }, i: number) => (
                                <div key={i} className="flex items-center justify-between text-[11px]">
                                    <span className="text-neutral-500">{d.label}</span>
                                    <span className={cn(
                                        "font-mono",
                                        d.severity === "ok" ? "text-emerald-500" :
                                            d.severity === "warn" ? "text-amber-500" : "text-red-500"
                                    )}>
                                        {d.diff_pct}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {record.errors && record.errors.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Errores</p>
                            {record.errors.map((e: string, i: number) => (
                                <p key={i} className="text-[11px] text-red-400">{e}</p>
                            ))}
                        </div>
                    )}
                    {!record.discrepancies?.length && !record.errors?.length && (
                        <p className="text-[11px] text-neutral-400">Importación limpia, sin incidencias.</p>
                    )}
                </div>
            )}
        </div>
    )
}
