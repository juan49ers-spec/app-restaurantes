'use client'

import { useState, useCallback } from "react"
import { Invoice, InvoiceStatus } from "@/types/schema"
import { InvoiceCard } from "@/components/invoices/InvoiceCard"
import { InvoiceBatchBar } from "@/components/invoices/InvoiceBatchBar"
import { InvoiceDropzone } from "@/components/invoices/InvoiceDropzone"
import { batchUpdateInvoiceStatus, deleteInvoice, reprocessInvoice } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Clock, AlertTriangle, CheckCircle, XCircle,
    Upload, InboxIcon, Sparkles
} from "lucide-react"

interface InvoiceDashboardProps {
    invoices: Invoice[]
}

// ── KPI Card ──
function KpiCard({ label, value, icon: Icon, color, bgColor }: {
    label: string; value: number; icon: React.ElementType; color: string; bgColor: string
}) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-3xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
            {/* Decorative gradient line */}
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${bgColor}`} />
        </div>
    )
}

// ── Column Header ──
function ColumnHeader({ title, count, color }: { title: string; count: number; color: string }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
                {count}
            </span>
        </div>
    )
}

// ── Empty State ──
function EmptyColumn({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-slate-50 mb-3">
                <Icon className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 max-w-[160px]">{message}</p>
        </div>
    )
}

export function InvoiceDashboard({ invoices }: InvoiceDashboardProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)

    // ── Grouping by status ──
    const processing = invoices.filter(i => i.status === 'uploading' || i.status === 'processing')
    const review = invoices.filter(i => i.status === 'review_required')
    const completed = invoices.filter(i => i.status === 'completed')
    const errors = invoices.filter(i => i.status === 'error')

    // ── KPI stats ──
    const avgConfidence = invoices.filter(i => i.confidence_score != null)
    const avgConfPct = avgConfidence.length > 0
        ? Math.round((avgConfidence.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / avgConfidence.length) * 100)
        : 0

    // ── Selection handlers ──
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

    // ── Batch actions ──
    const handleBatchApprove = async () => {
        setLoading(true)
        const result = await batchUpdateInvoiceStatus(
            Array.from(selectedIds),
            'completed' as InvoiceStatus
        )
        if (result.success) {
            toast.success(`${result.count} factura(s) aprobada(s)`)
            clearSelection()
            router.refresh()
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    const handleBatchReprocess = async () => {
        setLoading(true)
        const ids = Array.from(selectedIds)
        let successCount = 0
        for (const id of ids) {
            const result = await reprocessInvoice(id)
            if (result.success) successCount++
        }
        toast.success(`${successCount}/${ids.length} factura(s) reprocesada(s)`)
        clearSelection()
        router.refresh()
        setLoading(false)
    }

    const handleBatchDelete = async () => {
        setLoading(true)
        const ids = Array.from(selectedIds)
        let successCount = 0
        for (const id of ids) {
            const result = await deleteInvoice(id)
            if (result.success) successCount++
        }
        toast.success(`${successCount} factura(s) eliminada(s)`)
        clearSelection()
        router.refresh()
        setLoading(false)
    }

    const handleReview = (id: string) => router.push(`/invoices/${id}/review`)
    const handleReprocess = async (id: string) => {
        const result = await reprocessInvoice(id)
        if (result.success) {
            toast.success("Reprocesando factura...")
            router.refresh()
        } else {
            toast.error(result.error)
        }
    }
    const handleDelete = async (id: string) => {
        const result = await deleteInvoice(id)
        if (result.success) {
            toast.success("Factura eliminada")
            selectedIds.delete(id)
            setSelectedIds(new Set(selectedIds))
            router.refresh()
        } else {
            toast.error(result.error)
        }
    }

    return (
        <div className="space-y-6">
            {/* ── Header + Dropzone ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-blue-500" />
                        Dashboard OCR
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Gestión visual de facturas escaneadas
                    </p>
                </div>
                <div className="w-full sm:w-auto">
                    <InvoiceDropzone />
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                    label="Pendientes"
                    value={review.length}
                    icon={AlertTriangle}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                />
                <KpiCard
                    label="En Proceso"
                    value={processing.length}
                    icon={Clock}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <KpiCard
                    label="Completadas"
                    value={completed.length}
                    icon={CheckCircle}
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                />
                <KpiCard
                    label="Confianza OCR"
                    value={avgConfPct}
                    icon={Sparkles}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
            </div>

            {/* ── Kanban Columns ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Col 1: En Proceso */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 min-h-[300px]">
                    <ColumnHeader title="En Proceso" count={processing.length} color="bg-blue-100 text-blue-700" />
                    {processing.length === 0 ? (
                        <EmptyColumn icon={Upload} message="Sube una factura para comenzar" />
                    ) : (
                        <div className="space-y-3">
                            {processing.map(inv => (
                                <InvoiceCard key={inv.id} invoice={inv}
                                    isSelected={selectedIds.has(inv.id!)}
                                    onToggleSelect={toggleSelect}
                                    onReview={handleReview}
                                    onReprocess={handleReprocess}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Col 2: Revisión Pendiente */}
                <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-100/50 min-h-[300px]">
                    <ColumnHeader title="Revisión Pendiente" count={review.length} color="bg-amber-100 text-amber-700" />
                    {review.length === 0 ? (
                        <EmptyColumn icon={InboxIcon} message="No hay facturas pendientes de revisión" />
                    ) : (
                        <div className="space-y-3">
                            {review.map(inv => (
                                <InvoiceCard key={inv.id} invoice={inv}
                                    isSelected={selectedIds.has(inv.id!)}
                                    onToggleSelect={toggleSelect}
                                    onReview={handleReview}
                                    onReprocess={handleReprocess}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Col 3: Completadas + Errores */}
                <div className="bg-emerald-50/20 rounded-2xl p-4 border border-emerald-100/50 min-h-[300px]">
                    <ColumnHeader title="Completadas" count={completed.length + errors.length} color="bg-emerald-100 text-emerald-700" />

                    {/* Errores primero (prominentes) */}
                    {errors.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Con Error ({errors.length})
                            </p>
                            <div className="space-y-3">
                                {errors.map(inv => (
                                    <InvoiceCard key={inv.id} invoice={inv}
                                        isSelected={selectedIds.has(inv.id!)}
                                        onToggleSelect={toggleSelect}
                                        onReview={handleReview}
                                        onReprocess={handleReprocess}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {completed.length === 0 && errors.length === 0 ? (
                        <EmptyColumn icon={CheckCircle} message="Las facturas completadas aparecerán aquí" />
                    ) : (
                        <div className="space-y-3">
                            {completed.map(inv => (
                                <InvoiceCard key={inv.id} invoice={inv}
                                    isSelected={selectedIds.has(inv.id!)}
                                    onToggleSelect={toggleSelect}
                                    onReview={handleReview}
                                    onReprocess={handleReprocess}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Batch Bar ── */}
            <InvoiceBatchBar
                selectedCount={selectedIds.size}
                onApproveAll={handleBatchApprove}
                onReprocessAll={handleBatchReprocess}
                onDeleteAll={handleBatchDelete}
                onClearSelection={clearSelection}
                loading={loading}
            />
        </div>
    )
}
