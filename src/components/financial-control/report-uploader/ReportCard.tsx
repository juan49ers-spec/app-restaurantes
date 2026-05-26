"use client"

import { useState } from "react"
import {
    FileText, CheckCircle2, AlertTriangle, Loader2, X,
    ChevronDown, ChevronUp, GitCompareArrows, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EXPENSE_CATEGORY_LABELS, type OperatingExpenseCategory } from "@/types/schema"
import type { Discrepancy } from "./types"
import type { QueuedReport } from "./types"
import { fmt, fmtPct } from "./types"
import { DetailSection, KPICell, RatioBadge, EditableMiniKPI } from "./shared-components"

const categoryLabel = (cat: string) =>
    EXPENSE_CATEGORY_LABELS[cat as OperatingExpenseCategory] || cat.replace(/_/g, " ")

function DiscrepancyRow({ d }: { d: Discrepancy }) {
    return (
        <div className="flex items-center gap-2 text-[11px]">
            <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                d.severity === "ok" ? "bg-emerald-500" :
                    d.severity === "warn" ? "bg-amber-500" : "bg-red-500"
            )} />
            <span className="flex-1 text-neutral-600 dark:text-neutral-400 truncate">{d.label}</span>
            <span className="font-mono text-neutral-500 tabular-nums">{fmt(d.pdf_value)}</span>
            <span className="text-neutral-300">vs</span>
            <span className="font-mono text-neutral-500 tabular-nums">{fmt(d.db_value)}</span>
            <span className={cn(
                "font-mono font-bold tabular-nums min-w-[3rem] text-right",
                d.severity === "ok" ? "text-emerald-500" :
                    d.severity === "warn" ? "text-amber-500" : "text-red-500"
            )}>
                {d.diff > 0 ? "+" : ""}{fmtPct(d.diff_pct)}
            </span>
        </div>
    )
}

interface ReportCardProps {
    item: QueuedReport
    onInsert: () => void
    onRemove: () => void
    onEditField: (path: string, value: number) => void
}

export function ReportCard({ item, onInsert, onRemove, onEditField }: ReportCardProps) {
    const [showDetails, setShowDetails] = useState(false)
    const [showComparison, setShowComparison] = useState(false)
    const [editMode, setEditMode] = useState(false)

    const report = item.report
    const cmp = item.comparison

    if (item.status === "pending" || item.status === "extracting") {
        return (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{item.fileName}</p>
                    <p className="text-xs text-neutral-500">
                        {item.status === "pending" ? "En cola..." : "Extrayendo datos del PDF..."}
                    </p>
                </div>
            </div>
        )
    }

    if (item.status === "error") {
        return (
            <div className="border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 truncate">{item.fileName}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{item.error}</p>
                    </div>
                    <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600" aria-label="Eliminar">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    if (!report) return null

    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className={cn(
                "p-4 flex items-center justify-between",
                item.status === "done"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                    : "bg-gradient-to-r from-neutral-50 to-neutral-50/50 dark:from-neutral-800/50 dark:to-neutral-900/30"
            )}>
                <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200 truncate">
                            {report.month_name}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                            {fmtPct(report.confidence * 100)} confianza · {item.fileName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {cmp?.has_existing_data && (
                        <button
                            type="button"
                            onClick={() => setShowComparison(!showComparison)}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                                cmp.summary.errors > 0
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                                    : cmp.summary.warnings > 0
                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                        : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                            )}
                            title="Ver comparativa con datos existentes"
                        >
                            <GitCompareArrows className="w-3 h-3" />
                            {cmp.summary.errors > 0 ? `${cmp.summary.errors} disc.` : cmp.summary.warnings > 0 ? `${cmp.summary.warnings} dif.` : "OK"}
                        </button>
                    )}
                    {cmp && !cmp.has_existing_data && (
                        <span className="text-[10px] text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            Sin datos previos
                        </span>
                    )}
                    {item.status === "done" && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                    )}
                    {item.status !== "done" && (
                        <button type="button" onClick={onRemove} className="text-neutral-400 hover:text-neutral-600 ml-1" aria-label="Eliminar de la cola">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-100 dark:bg-neutral-800">
                <KPICell label="Facturación" value={fmt(report.billing.total_revenue)} sub={`${report.billing.days_open} días`} editable={editMode} onEdit={(v) => onEditField("billing.total_revenue", v)} />
                <KPICell label="Gastos" value={fmt(report.expenses.total)} sub={`${report.expenses.breakdown.length} cat.`} editable={editMode} onEdit={(v) => onEditField("expenses.total", v)} />
                <KPICell label="Resultado" value={fmt(report.pnl.profit_loss)} sub={fmtPct(report.pnl.profit_margin_pct)} trend={report.pnl.profit_loss > 0 ? "up" : report.pnl.profit_loss < 0 ? "down" : "flat"} />
                <KPICell label="IVA" value={fmt(report.taxes.iva_a_pagar)} sub={`Rep: ${fmt(report.taxes.iva_repercutido)}`} />
            </div>

            {/* Ratios */}
            <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3 flex-wrap">
                <RatioBadge label="Personal" value={report.ratios.personal_pct} target={33} />
                <RatioBadge label="MP" value={report.ratios.materia_prima_pct} target={33} />
                <RatioBadge label="Sumin." value={report.ratios.suministros_pct} target={10} />
            </div>

            {/* Comparison Panel */}
            {showComparison && cmp?.has_existing_data && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Comparativa PDF vs Base de Datos
                    </p>
                    <div className="space-y-1">
                        {cmp.discrepancies.map((d: Discrepancy, i: number) => (
                            <DiscrepancyRow key={i} d={d} />
                        ))}
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] text-neutral-400">
                        <span className="text-emerald-500">{cmp.summary.ok} coinciden</span>
                        {cmp.summary.warnings > 0 && <span className="text-amber-500">{cmp.summary.warnings} diferencias</span>}
                        {cmp.summary.errors > 0 && <span className="text-red-500">{cmp.summary.errors} discrepancias</span>}
                    </div>
                </div>
            )}

            {/* Detail Toggle + Edit */}
            <div className="border-t border-neutral-100 dark:border-neutral-800 flex">
                <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex-1 flex items-center justify-between px-4 py-2.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                    <span>Desglose</span>
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {item.status === "ready" && (
                    <button
                        type="button"
                        onClick={() => setEditMode(!editMode)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-l border-neutral-100 dark:border-neutral-800 transition-colors",
                            editMode
                                ? "text-amber-600 bg-amber-50/50 dark:bg-amber-500/10"
                                : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        )}
                    >
                        <Pencil className="w-3 h-3" />
                        {editMode ? "Editando" : "Editar"}
                    </button>
                )}
            </div>

            {showDetails && (
                <div className="px-4 pb-4 space-y-4">
                    <DetailSection title="Delivery">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <EditableMiniKPI label="Uber Eats" value={report.billing.delivery_uber_eats} editable={editMode} onEdit={(v) => onEditField("billing.delivery_uber_eats", v)} />
                            <EditableMiniKPI label="Just Eat" value={report.billing.delivery_just_eat} editable={editMode} onEdit={(v) => onEditField("billing.delivery_just_eat", v)} />
                            <EditableMiniKPI label="Al Punto" value={report.billing.delivery_al_punto} editable={editMode} onEdit={(v) => onEditField("billing.delivery_al_punto", v)} />
                            <EditableMiniKPI label="Glovo" value={report.billing.delivery_glovo} editable={editMode} onEdit={(v) => onEditField("billing.delivery_glovo", v)} />
                        </div>
                    </DetailSection>

                    <DetailSection title="Gastos por Categoría">
                        <div className="space-y-1.5">
                            {report.expenses.breakdown.map((exp: { category: string; amount: number }, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-neutral-600 dark:text-neutral-400">{categoryLabel(exp.category)}</span>
                                    {editMode ? (
                                        <input
                                            type="number"
                                            step="0.01"
                                            title={`Editar ${categoryLabel(exp.category)}`}
                                            defaultValue={exp.amount}
                                            onBlur={(e) => {
                                                onEditField(`expenses.breakdown.${i}.amount`, parseFloat(e.target.value) || 0)
                                            }}
                                            className="w-24 text-right font-mono text-xs px-2 py-1 border rounded-lg bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-800"
                                        />
                                    ) : (
                                        <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{fmt(exp.amount)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DetailSection>

                    <DetailSection title="Pagos">
                        <div className="flex gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                            <span>Tarjeta: {report.billing.card_pct}%</span>
                            <span>Efectivo: {report.billing.cash_pct}%</span>
                            <span>Media diaria: {fmt(report.billing.avg_daily_revenue)}</span>
                        </div>
                    </DetailSection>

                    {report.conclusions && (
                        <DetailSection title="Conclusiones">
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                                {report.conclusions.substring(0, 600)}
                            </p>
                        </DetailSection>
                    )}
                </div>
            )}

            {/* DB Result */}
            {item.dbResult && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Insertados: {item.dbResult.expenses_inserted} gastos
                        {item.dbResult.sales_inserted && " + resumen ventas"}
                        {item.dbResult.errors.length > 0 && (
                            <span className="text-red-500"> · {item.dbResult.errors.length} errores</span>
                        )}
                    </p>
                </div>
            )}

            {/* Actions */}
            {item.status === "ready" && (
                <div className="flex gap-2 p-3 border-t border-neutral-100 dark:border-neutral-800">
                    <button type="button" onClick={onRemove} className="flex-1 py-2 rounded-xl text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        Descartar
                    </button>
                    <button type="button" onClick={onInsert} className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                        Importar a DB
                    </button>
                </div>
            )}

            {item.status === "inserting" && (
                <div className="flex items-center justify-center gap-2 p-3 border-t border-neutral-100 dark:border-neutral-800">
                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span className="text-xs text-neutral-500">Insertando...</span>
                </div>
            )}
        </div>
    )
}
