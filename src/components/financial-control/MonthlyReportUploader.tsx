"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
    Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X,
    TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
    History, GitCompareArrows, Pencil, Plus, Files, CloudDownload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EXPENSE_CATEGORY_LABELS, type OperatingExpenseCategory } from "@/types/schema"
import type { ExtractedMonthlyReport } from "@/lib/report-extractor"
import type { ComparisonResult, Discrepancy } from "@/app/api/reports/compare/route"
import type { ReportImportRecord } from "@/app/api/reports/history/route"

// ─── Props & Types ───────────────────────────────────────────────────────────

interface MonthlyReportUploaderProps {
    restaurantId: string
}

type MainView = "upload" | "history"

interface QueuedReport {
    file: File
    fileName: string
    report: ExtractedMonthlyReport | null
    comparison: ComparisonResult | null
    status: "pending" | "extracting" | "ready" | "inserting" | "done" | "error"
    error?: string
    dbResult?: { expenses_inserted: number; sales_inserted: boolean; errors: string[] }
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n)

const fmtPct = (n: number) => `${n.toFixed(1)}%`

const categoryLabel = (cat: string) =>
    EXPENSE_CATEGORY_LABELS[cat as OperatingExpenseCategory] || cat.replace(/_/g, " ")

// ─── Main Component ──────────────────────────────────────────────────────────

export function MonthlyReportUploader({ restaurantId }: MonthlyReportUploaderProps) {
    const [view, setView] = useState<MainView>("upload")
    const [queue, setQueue] = useState<QueuedReport[]>([])
    const [history, setHistory] = useState<ReportImportRecord[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ─── History ─────────────────────────────────────────────────────────────

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true)
        try {
            const res = await fetch(`/api/reports/history?restaurant_id=${restaurantId}&limit=20`)
            const json = await res.json()
            setHistory(json.imports || [])
        } catch {
            setHistory([])
        }
        setLoadingHistory(false)
    }, [restaurantId])

    useEffect(() => {
        if (view === "history") loadHistory()
    }, [view, loadHistory])

    // ─── File Processing (bulk support) ──────────────────────────────────────

    const processFile = useCallback(async (item: QueuedReport, idx: number) => {
        setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "extracting" as const } : r))

        try {
            // 1. Extract
            const formData = new FormData()
            formData.append("file", item.file)
            formData.append("restaurant_id", restaurantId)
            const res = await fetch("/api/reports/extract", { method: "POST", body: formData })
            const json = await res.json()

            if (!res.ok || !json.success) {
                setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "error" as const, error: json.error } : r))
                return
            }

            const report = json.report as ExtractedMonthlyReport

            // 2. Compare with existing DB data
            let comparison: ComparisonResult | null = null
            try {
                const cmpRes = await fetch("/api/reports/compare", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ report, restaurant_id: restaurantId }),
                })
                if (cmpRes.ok) {
                    comparison = await cmpRes.json()
                }
            } catch { /* comparison is optional */ }

            setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "ready" as const, report, comparison } : r))
        } catch (err) {
            setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "error" as const, error: (err as Error).message } : r))
        }
    }, [restaurantId])

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".pdf"))
        if (pdfFiles.length === 0) return

        const newItems: QueuedReport[] = pdfFiles.map(f => ({
            file: f,
            fileName: f.name,
            report: null,
            comparison: null,
            status: "pending" as const,
        }))

        setQueue(prev => [...prev, ...newItems])
        setView("upload")

        // Process each file
        const startIdx = queue.length
        for (let i = 0; i < newItems.length; i++) {
            await processFile(newItems[i], startIdx + i)
        }
    }, [queue.length, processFile])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

    // ─── Edit Report (inline) ────────────────────────────────────────────────

    const updateReportField = useCallback((idx: number, path: string, value: number) => {
        setQueue(q => q.map((r, i) => {
            if (i !== idx || !r.report) return r
            const updated = JSON.parse(JSON.stringify(r.report)) as ExtractedMonthlyReport
            const parts = path.split(".")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let obj: any = updated
            for (let j = 0; j < parts.length - 1; j++) obj = obj[parts[j]]
            obj[parts[parts.length - 1]] = value
            return { ...r, report: updated }
        }))
    }, [])

    // ─── Insert ──────────────────────────────────────────────────────────────

    const handleInsert = useCallback(async (idx: number) => {
        const item = queue[idx]
        if (!item?.report) return
        setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "inserting" as const } : r))

        try {
            const res = await fetch("/api/reports/insert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    report: item.report,
                    restaurant_id: restaurantId,
                    file_name: item.fileName,
                    source: "upload",
                    discrepancies: item.comparison?.discrepancies || null,
                }),
            })
            const json = await res.json()
            setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "done" as const, dbResult: json.db_result } : r))
        } catch {
            setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "done" as const } : r))
        }
    }, [queue, restaurantId])

    const handleInsertAll = useCallback(async () => {
        const readyIdxs = queue.map((r, i) => r.status === "ready" ? i : -1).filter(i => i >= 0)
        for (const idx of readyIdxs) {
            await handleInsert(idx)
        }
    }, [queue, handleInsert])

    const removeFromQueue = useCallback((idx: number) => {
        setQueue(q => q.filter((_, i) => i !== idx))
    }, [])

    const clearQueue = useCallback(() => setQueue([]), [])

    const readyCount = queue.filter(r => r.status === "ready").length
    const doneCount = queue.filter(r => r.status === "done").length

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="w-full space-y-4">
            {/* Tab bar */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setView("upload")}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        view === "upload"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                >
                    <Upload className="w-3.5 h-3.5" />
                    Importar
                    {queue.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">{queue.length}</span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setView("history")}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        view === "history"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                >
                    <History className="w-3.5 h-3.5" />
                    Historial
                </button>
            </div>

            {/* ─── UPLOAD VIEW ────────────────────────────────────────────────── */}
            {view === "upload" && (
                <div className="space-y-3">
                    {/* Drop zone (always visible) */}
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="relative border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors cursor-pointer group"
                    >
                        <label className="sr-only" htmlFor="report-pdf-upload">Seleccionar archivos PDF</label>
                        <input
                            ref={fileInputRef}
                            id="report-pdf-upload"
                            type="file"
                            accept=".pdf"
                            multiple
                            title="Seleccionar informes PDF"
                            onChange={(e) => {
                                if (e.target.files) handleFiles(e.target.files)
                                e.target.value = "" // Allow re-selecting same file
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                {queue.length === 0 ? <Upload className="w-5 h-5 text-emerald-500" /> : <Plus className="w-5 h-5 text-emerald-500" />}
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                                    {queue.length === 0 ? "Subir Informes Mensuales" : "Añadir más PDFs"}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    Arrastra uno o varios PDFs · Se comparan automáticamente con datos existentes
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bulk actions */}
                    {queue.length > 1 && (
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-neutral-500">
                                <Files className="w-3.5 h-3.5 inline mr-1" />
                                {queue.length} archivos · {readyCount} listos · {doneCount} importados
                            </span>
                            <div className="flex gap-2">
                                {readyCount > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleInsertAll}
                                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                    >
                                        Importar todos ({readyCount})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={clearQueue}
                                    className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Queue items */}
                    {queue.map((item, idx) => (
                        <ReportCard
                            key={`${item.fileName}-${idx}`}
                            item={item}
                            onInsert={() => handleInsert(idx)}
                            onRemove={() => removeFromQueue(idx)}
                            onEditField={(path, value) => updateReportField(idx, path, value)}
                        />
                    ))}
                </div>
            )}

            {/* ─── HISTORY VIEW ───────────────────────────────────────────────── */}
            {view === "history" && (
                <div>
                    {loadingHistory ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mx-auto" />
                            <p className="text-xs text-neutral-500 mt-2">Cargando historial...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Sin importaciones previas</p>
                            <p className="text-xs mt-1">Los informes importados aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((rec) => (
                                <HistoryRow key={rec.id} record={rec} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Report Card (per file in queue) ─────────────────────────────────────────

function ReportCard({ item, onInsert, onRemove, onEditField }: {
    item: QueuedReport
    onInsert: () => void
    onRemove: () => void
    onEditField: (path: string, value: number) => void
}) {
    const [showDetails, setShowDetails] = useState(false)
    const [showComparison, setShowComparison] = useState(false)
    const [editMode, setEditMode] = useState(false)

    const report = item.report
    const cmp = item.comparison

    // ── Loading / Error states ──
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

    // ── Main card (ready / inserting / done) ──
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
                    {/* Comparison badge */}
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
                <KPICell
                    label="Facturación"
                    value={fmt(report.billing.total_revenue)}
                    sub={`${report.billing.days_open} días`}
                    editable={editMode}
                    onEdit={(v) => onEditField("billing.total_revenue", v)}
                />
                <KPICell
                    label="Gastos"
                    value={fmt(report.expenses.total)}
                    sub={`${report.expenses.breakdown.length} cat.`}
                    editable={editMode}
                    onEdit={(v) => onEditField("expenses.total", v)}
                />
                <KPICell
                    label="Resultado"
                    value={fmt(report.pnl.profit_loss)}
                    sub={fmtPct(report.pnl.profit_margin_pct)}
                    trend={report.pnl.profit_loss > 0 ? "up" : report.pnl.profit_loss < 0 ? "down" : "flat"}
                />
                <KPICell
                    label="IVA"
                    value={fmt(report.taxes.iva_a_pagar)}
                    sub={`Rep: ${fmt(report.taxes.iva_repercutido)}`}
                />
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
                        {cmp.discrepancies.map((d, i) => (
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
                    {/* Delivery */}
                    <DetailSection title="Delivery">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <EditableMiniKPI label="Uber Eats" value={report.billing.delivery_uber_eats} editable={editMode} onEdit={(v) => onEditField("billing.delivery_uber_eats", v)} />
                            <EditableMiniKPI label="Just Eat" value={report.billing.delivery_just_eat} editable={editMode} onEdit={(v) => onEditField("billing.delivery_just_eat", v)} />
                            <EditableMiniKPI label="Al Punto" value={report.billing.delivery_al_punto} editable={editMode} onEdit={(v) => onEditField("billing.delivery_al_punto", v)} />
                            <EditableMiniKPI label="Glovo" value={report.billing.delivery_glovo} editable={editMode} onEdit={(v) => onEditField("billing.delivery_glovo", v)} />
                        </div>
                    </DetailSection>

                    {/* Expenses */}
                    <DetailSection title="Gastos por Categoría">
                        <div className="space-y-1.5">
                            {report.expenses.breakdown.map((exp, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-neutral-600 dark:text-neutral-400">{categoryLabel(exp.category)}</span>
                                    {editMode ? (
                                        <input
                                            type="number"
                                            step="0.01"
                                            title={`Editar ${categoryLabel(exp.category)}`}
                                            defaultValue={exp.amount}
                                            onBlur={(e) => {
                                                const newBreakdown = [...report.expenses.breakdown]
                                                newBreakdown[i] = { ...newBreakdown[i], amount: parseFloat(e.target.value) || 0 }
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

                    {/* Payment */}
                    <DetailSection title="Pagos">
                        <div className="flex gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                            <span>Tarjeta: {report.billing.card_pct}%</span>
                            <span>Efectivo: {report.billing.cash_pct}%</span>
                            <span>Media diaria: {fmt(report.billing.avg_daily_revenue)}</span>
                        </div>
                    </DetailSection>

                    {/* Conclusions */}
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
                    <button
                        type="button"
                        onClick={onRemove}
                        className="flex-1 py-2 rounded-xl text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                        Descartar
                    </button>
                    <button
                        type="button"
                        onClick={onInsert}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                    >
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

// ─── History Row ─────────────────────────────────────────────────────────────

function HistoryRow({ record }: { record: ReportImportRecord }) {
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
                            {record.discrepancies.map((d, i) => (
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
                            {record.errors.map((e, i) => (
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

// ─── Comparison Row ──────────────────────────────────────────────────────────

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">{title}</p>
            {children}
        </div>
    )
}

function KPICell({ label, value, sub, trend, editable, onEdit }: {
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

function RatioBadge({ label, value, target }: { label: string; value: number; target: number }) {
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

function EditableMiniKPI({ label, value, editable, onEdit }: {
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
