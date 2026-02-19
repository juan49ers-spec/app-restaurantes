'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ArrowRight } from "lucide-react"
import { getRecentAlerts } from "@/app/actions/alerts"
import { Button } from "@/components/ui/button"

interface AlertMetadata {
    variance?: number
    impact_amount?: number
    [key: string]: unknown
}

interface Alert {
    id: string
    title: string
    message: string
    created_at: string
    metadata: AlertMetadata | null
    is_read: boolean
}

export function PriceSpikeAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getRecentAlerts().then(data => {

            setAlerts(data)
            setLoading(false)
        })
    }, [])

    if (loading) return (
        <Card className="h-full border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Alertas de Precio
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse w-full space-y-3">
                    <div className="h-10 bg-slate-100 rounded-md"></div>
                    <div className="h-10 bg-slate-100 rounded-md"></div>
                    <div className="h-10 bg-slate-100 rounded-md"></div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <Card className="h-full border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-500" />
                        Alertas de Precio
                    </div>
                    {alerts.length > 0 && (
                        <Badge variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-200 border-0">
                            {alerts.length} nuevas
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-1 pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                        <div className="bg-green-50 p-2 rounded-full mb-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Precios Estables</p>
                        <p className="text-[10px] mt-1 leading-tight">Sin subidas &gt;10% esta semana.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <div key={alert.id} className="group p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-red-200 hover:shadow-sm transition-all">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-semibold text-slate-700 line-clamp-1">{alert.title}</span>
                                    <span className="text-[9px] text-slate-400 shrink-0 ml-2">
                                        {new Date(alert.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mb-2 leading-tight line-clamp-2">
                                    {alert.message}
                                </p>
                                {alert.metadata && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(alert.metadata.variance as number) > 0 && (
                                                <div className="inline-flex items-center rounded-sm border px-1 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-red-200 bg-red-50 text-red-700">
                                                    +{alert.metadata.variance}%
                                                </div>
                                            )}
                                            {(alert.metadata.impact_amount as number) > 0 && (
                                                <div className="inline-flex items-center rounded-sm border px-1 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-orange-200 bg-orange-50 text-orange-700">
                                                    +{Number(alert.metadata.impact_amount).toFixed(0)}€
                                                </div>
                                            )}
                                            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1 ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                Ver <ArrowRight className="w-2.5 h-2.5 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
