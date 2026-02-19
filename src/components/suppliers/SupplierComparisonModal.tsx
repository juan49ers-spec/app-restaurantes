'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, Scale, TrendingUp, TrendingDown, Minus, Star } from "lucide-react"
import { getAllSupplierScores } from "@/app/actions/supplier-scorecard"

interface SupplierScore {
    supplierId: string
    name: string
    score: number
    trend: 'improving' | 'stable' | 'declining'
    totalSpend: number
}

export function SupplierComparisonModal() {
    const [open, setOpen] = useState(false)
    const [suppliers, setSuppliers] = useState<SupplierScore[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && suppliers.length === 0) {
            const fetchData = async () => {
                setLoading(true)
                try {
                    const data = await getAllSupplierScores()
                    setSuppliers(data)
                } finally {
                    setLoading(false)
                }
            }
            fetchData()
        }
    }, [open, suppliers.length])

    const toggle = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id))
        } else if (selected.length < 3) {
            setSelected([...selected, id])
        }
    }

    const selectedSuppliers = suppliers.filter(s => selected.includes(s.supplierId))
    const winner = selectedSuppliers.sort((a, b) => b.score - a.score)[0]

    const TrendIcon = (trend: string) => {
        switch (trend) {
            case 'improving': return <TrendingUp className="w-3 h-3 text-green-500" />
            case 'declining': return <TrendingDown className="w-3 h-3 text-red-500" />
            default: return <Minus className="w-3 h-3 text-slate-400" />
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Scale className="w-4 h-4" />
                    Comparar Proveedores
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5" />
                        Comparación de Proveedores
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="h-40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Selection Area */}
                        <div>
                            <p className="text-xs text-slate-500 mb-2">Selecciona hasta 3 proveedores para comparar:</p>
                            <div className="flex flex-wrap gap-2">
                                {suppliers.map(s => (
                                    <Badge
                                        key={s.supplierId}
                                        variant={selected.includes(s.supplierId) ? 'default' : 'outline'}
                                        className="cursor-pointer hover:border-blue-300 transition-colors"
                                        onClick={() => toggle(s.supplierId)}
                                    >
                                        {s.name} ({s.score})
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Comparison Grid */}
                        {selected.length > 1 && (
                            <div className="grid grid-cols-3 gap-4">
                                {selectedSuppliers.map(s => (
                                    <div
                                        key={s.supplierId}
                                        className={`p-4 rounded-lg border transition-all ${s.supplierId === winner?.supplierId
                                            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
                                            : 'border-slate-200 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-medium text-sm text-slate-900">{s.name}</span>
                                            {s.supplierId === winner?.supplierId && (
                                                <Crown className="w-4 h-4 text-amber-500" />
                                            )}
                                        </div>

                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Score</span>
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-amber-400" />
                                                    <span className="font-bold">{s.score}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Tendencia</span>
                                                {TrendIcon(s.trend)}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Gasto Total</span>
                                                <span className="font-medium">€{s.totalSpend.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selected.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                Selecciona al menos 2 proveedores para comparar
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
