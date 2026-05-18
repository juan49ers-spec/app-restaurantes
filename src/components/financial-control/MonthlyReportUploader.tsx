"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Upload, Loader2, History, Plus, Files } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExtractedMonthlyReport } from "@/lib/report-extractor"
import type { ComparisonResult } from "@/app/api/reports/compare/route"
import type { ReportImportRecord } from "@/app/api/reports/history/route"
import type { QueuedReport } from "./report-uploader/types"
import { ReportCard } from "./report-uploader/ReportCard"
import { HistoryRow } from "./report-uploader/HistoryRow"

interface MonthlyReportUploaderProps {
    restaurantId: string
}

type MainView = "upload" | "history"

export function MonthlyReportUploader({ restaurantId }: MonthlyReportUploaderProps) {
    const [view, setView] = useState<MainView>("upload")
    const [queue, setQueue] = useState<QueuedReport[]>([])
    const [history, setHistory] = useState<ReportImportRecord[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const processFile = useCallback(async (item: QueuedReport, idx: number) => {
        setQueue(q => q.map((r, i) => i === idx ? { ...r, status: "extracting" as const } : r))

        try {
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

        const startIdx = queue.length
        for (let i = 0; i < newItems.length; i++) {
            await processFile(newItems[i], startIdx + i)
        }
    }, [queue.length, processFile])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

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

            {view === "upload" && (
                <div className="space-y-3">
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
                                e.target.value = ""
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

                    {queue.length > 1 && (
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-neutral-500">
                                <Files className="w-3.5 h-3.5 inline mr-1" />
                                {queue.length} archivos · {readyCount} listos · {doneCount} importados
                            </span>
                            <div className="flex gap-2">
                                {readyCount > 1 && (
                                    <button type="button" onClick={handleInsertAll} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                                        Importar todos ({readyCount})
                                    </button>
                                )}
                                <button type="button" onClick={clearQueue} className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    )}

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
