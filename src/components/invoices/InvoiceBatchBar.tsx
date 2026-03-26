'use client'

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, RotateCw, Trash2, X } from "lucide-react"

interface InvoiceBatchBarProps {
    selectedCount: number
    onApproveAll: () => void
    onReprocessAll: () => void
    onDeleteAll: () => void
    onClearSelection: () => void
    loading?: boolean
}

export function InvoiceBatchBar({
    selectedCount, onApproveAll, onReprocessAll, onDeleteAll, onClearSelection, loading
}: InvoiceBatchBarProps) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl shadow-slate-900/30 border border-slate-700/50 flex items-center gap-4">
                <span className="font-semibold text-sm tabular-nums">
                    {selectedCount} factura{selectedCount !== 1 ? 's' : ''}
                </span>

                <Separator orientation="vertical" className="h-5 bg-slate-600" />

                <div className="flex items-center gap-2">
                    <Button
                        size="sm" variant="ghost"
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs font-medium"
                        onClick={onApproveAll}
                        disabled={loading}
                    >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Aprobar
                    </Button>
                    <Button
                        size="sm" variant="ghost"
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-8 text-xs font-medium"
                        onClick={onReprocessAll}
                        disabled={loading}
                    >
                        <RotateCw className="w-4 h-4 mr-1.5" />
                        Reprocesar
                    </Button>
                    <Button
                        size="sm" variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs font-medium"
                        onClick={onDeleteAll}
                        disabled={loading}
                    >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Eliminar
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-5 bg-slate-600" />

                <Button
                    size="sm" variant="ghost"
                    className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8 p-0"
                    onClick={onClearSelection}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
