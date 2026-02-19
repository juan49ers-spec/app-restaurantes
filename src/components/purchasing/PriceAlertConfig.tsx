'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, AlertTriangle, Settings2, Trash2, Plus } from "lucide-react"
import { getPriceAlertRules, checkAlertViolations, deletePriceAlertRule } from "@/app/actions/price-alerts"
import { PriceAlertRule } from "@/types/schema"

interface AlertViolation {
    id: string
    ingredientName: string
    currentPrice: number
    basePrice: number
    variance: number
    ruleThreshold: number
    date: string
}

export function PriceAlertConfig() {
    const [rules, setRules] = useState<PriceAlertRule[]>([])
    const [violations, setViolations] = useState<AlertViolation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getPriceAlertRules(),
            checkAlertViolations()
        ]).then(([r, v]) => {
            setRules(r)
            setViolations(v)
        }).finally(() => setLoading(false))
    }, [])

    const handleDelete = async (id: string) => {
        await deletePriceAlertRule(id)
        setRules(rules.filter(r => r.id !== id))
    }

    if (loading) return <div className="animate-pulse h-40 bg-slate-100 rounded-xl" />

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Alertas de Precio
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                    <Plus className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Violations */}
                {violations.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Alertas Recientes</p>
                        {violations.map(v => (
                            <div key={v.id} className="flex items-center gap-3 p-2 bg-red-50 border border-red-100 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-red-900">{v.ingredientName}</p>
                                    <p className="text-[10px] text-red-700">
                                        Subida de +{v.variance.toFixed(0)}% (Límite: {v.ruleThreshold}%)
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-red-900">€{v.currentPrice.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rules List */}
                <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reglas Configuradas</p>
                    {rules.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2 italic text-center">No hay alertas configuradas.</p>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs font-medium text-slate-700">
                                        {rule.category ? `Cat: ${rule.category}` : 'General'}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] py-0">
                                        ±{rule.max_variance_pct}%
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-300 hover:text-red-500"
                                    onClick={() => rule.id && handleDelete(rule.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
