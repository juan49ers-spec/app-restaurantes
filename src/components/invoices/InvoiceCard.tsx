'use client'

import { Invoice, InvoiceStatus } from "@/types/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    FileText, Clock, AlertTriangle, CheckCircle, XCircle,
    Eye, RotateCw, Trash2, ExternalLink
} from "lucide-react"

function timeAgoEs(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `hace ${days}d`
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

interface InvoiceCardProps {
    invoice: Invoice
    isSelected: boolean
    onToggleSelect: (id: string) => void
    onReview: (id: string) => void
    onReprocess: (id: string) => void
    onDelete: (id: string) => void
}

const STATUS_CONFIG: Record<InvoiceStatus, {
    label: string; icon: React.ElementType; color: string; bgClass: string; borderClass: string
}> = {
    uploading: {
        label: 'Subiendo', icon: Clock,
        color: 'text-slate-500', bgClass: 'bg-slate-50', borderClass: 'border-slate-200'
    },
    processing: {
        label: 'Procesando', icon: Clock,
        color: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-200'
    },
    review_required: {
        label: 'Pendiente', icon: AlertTriangle,
        color: 'text-amber-600', bgClass: 'bg-amber-50', borderClass: 'border-amber-200'
    },
    completed: {
        label: 'Completada', icon: CheckCircle,
        color: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200'
    },
    error: {
        label: 'Error', icon: XCircle,
        color: 'text-red-600', bgClass: 'bg-red-50', borderClass: 'border-red-200'
    }
}

function getConfidenceBadge(score: number | null | undefined) {
    if (score == null) return null
    const pct = Math.round(score * 100)
    if (pct >= 85) return { label: `${pct}%`, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    if (pct >= 60) return { label: `${pct}%`, className: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { label: `${pct}%`, className: 'bg-red-100 text-red-700 border-red-200' }
}

export function InvoiceCard({ invoice, isSelected, onToggleSelect, onReview, onReprocess, onDelete }: InvoiceCardProps) {
    const status = invoice.status as InvoiceStatus
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.processing
    const StatusIcon = config.icon
    const confidence = getConfidenceBadge(invoice.confidence_score)
    const supplierName = invoice.scanned_data?.supplier?.name || 'Proveedor desconocido'

    const timeAgo = invoice.created_at ? timeAgoEs(invoice.created_at) : ''

    return (
        <div
            className={`
                group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer
                hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5
                ${isSelected
                    ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200/50 shadow-md'
                    : `${config.borderClass} bg-white hover:border-slate-300`
                }
            `}
            onClick={() => onToggleSelect(invoice.id!)}
        >
            {/* Checkbox — flotante top-left */}
            <div
                className={`absolute -top-2 -left-2 z-10 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={e => e.stopPropagation()}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(invoice.id!)}
                    className="h-5 w-5 bg-white border-slate-300 shadow-sm data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
            </div>

            {/* Header: Status + Confianza */}
            <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={`${config.bgClass} ${config.color} border-transparent text-[11px] font-medium gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                </Badge>
                {confidence && (
                    <Badge variant="outline" className={`${confidence.className} text-[10px] font-mono`}>
                        {confidence.label}
                    </Badge>
                )}
            </div>

            {/* Body: Proveedor + Total */}
            <div className="space-y-2">
                <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded-lg ${config.bgClass} shrink-0`}>
                        <FileText className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-800 truncate" title={supplierName}>
                            {supplierName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                            {invoice.invoice_number !== 'PENDING' ? invoice.invoice_number : '—'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{timeAgo}</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                        {invoice.total_amount ? `${Number(invoice.total_amount).toFixed(2)} €` : '—'}
                    </span>
                </div>
            </div>

            {/* Footer: Actions */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                {status === 'review_required' && (
                    <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs text-blue-600 hover:bg-blue-50 flex-1"
                        onClick={(e) => { e.stopPropagation(); onReview(invoice.id!) }}
                    >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Revisar
                    </Button>
                )}
                {status === 'completed' && (
                    <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 flex-1"
                        onClick={(e) => { e.stopPropagation(); onReview(invoice.id!) }}
                    >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver
                    </Button>
                )}
                {status === 'error' && (
                    <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs text-amber-600 hover:bg-amber-50 flex-1"
                        onClick={(e) => { e.stopPropagation(); onReprocess(invoice.id!) }}
                    >
                        <RotateCw className="w-3.5 h-3.5 mr-1" /> Reintentar
                    </Button>
                )}
                <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 p-0"
                    onClick={(e) => { e.stopPropagation(); onDelete(invoice.id!) }}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Processing indicator */}
            {status === 'processing' && (
                <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-xl bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 animate-pulse" />
            )}
        </div>
    )
}
