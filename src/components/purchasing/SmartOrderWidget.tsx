'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, AlertTriangle, Phone, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import { getSmartOrderSuggestions } from "@/app/actions/smart-ordering"

interface OrderSuggestion {
    ingredientId: string
    ingredientName: string
    suggestedQty: number
    unit: string
    estimatedCost: number
    urgency: 'critical' | 'high' | 'medium' | 'low'
    reason: string
}

interface GroupedSuggestions {
    supplierId: string | null
    supplierName: string
    items: OrderSuggestion[]
    totalEstimate: number
    contactPhone: string | null
}

export function SmartOrderWidget() {
    const [groups, setGroups] = useState<GroupedSuggestions[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => {
        getSmartOrderSuggestions()
            .then(setGroups)
            .finally(() => setLoading(false))
    }, [])

    const urgencyConfig = {
        critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: true },
        high: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: false },
        medium: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: false },
        low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: false }
    }

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardContent className="h-40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </CardContent>
            </Card>
        )
    }

    const totalEstimate = groups.reduce((acc, g) => acc + g.totalEstimate, 0)
    const urgentCount = groups.flatMap(g => g.items).filter(i => i.urgency === 'critical' || i.urgency === 'high').length

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Smart Order
                </CardTitle>
                <div className="flex items-center gap-2">
                    {urgentCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                        </Badge>
                    )}
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                        €{totalEstimate.toFixed(0)} est.
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {groups.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No hay sugerencias de pedido.</p>
                        <p className="text-[10px]">Procesa más facturas para obtener recomendaciones.</p>
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.supplierId || 'unassigned'} className="border border-slate-100 rounded-lg overflow-hidden">
                            {/* Supplier Header */}
                            <button
                                onClick={() => setExpanded(expanded === group.supplierId ? null : group.supplierId)}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-slate-700">{group.supplierName}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {group.items.length} items
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">€{group.totalEstimate.toFixed(0)}</span>
                                    {expanded === group.supplierId ? (
                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Items */}
                            {expanded === group.supplierId && (
                                <div className="p-3 space-y-2 border-t border-slate-100">
                                    {group.items.map(item => {
                                        const uc = urgencyConfig[item.urgency]
                                        return (
                                            <div key={item.ingredientId} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={`${uc.bg} ${uc.text} ${uc.border}`}>
                                                        {uc.icon && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                        {item.suggestedQty} {item.unit}
                                                    </Badge>
                                                    <div>
                                                        <span className="font-medium text-slate-700">{item.ingredientName}</span>
                                                        <span className="text-slate-400 ml-2">({item.reason})</span>
                                                    </div>
                                                </div>
                                                <span className="text-slate-500">€{item.estimatedCost.toFixed(2)}</span>
                                            </div>
                                        )
                                    })}

                                    {/* Quick Actions */}
                                    {group.contactPhone && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full gap-2"
                                                onClick={() => window.open(`https://wa.me/${group.contactPhone?.replace(/\D/g, '')}`, '_blank')}
                                            >
                                                <Phone className="w-3 h-3" />
                                                Contactar vía WhatsApp
                                                <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}
