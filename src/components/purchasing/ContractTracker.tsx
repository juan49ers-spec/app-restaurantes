'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText } from "lucide-react"
import { getContractAlerts } from "@/app/actions/contracts"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Alert {
    supplierId: string
    supplierName: string
    renewalDate: string
    daysRemaining: number
    urgency: 'critical' | 'high' | 'medium' | 'low'
    paymentTerms: string | null
}

export function ContractTracker() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getContractAlerts()
            .then(setAlerts)
            .finally(() => setLoading(false))
    }, [])

    const urgencyConfig = {
        critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
        high: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
        medium: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
        low: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
    }

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardContent className="h-32 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Contract Tracker
                </CardTitle>
                <Badge variant="outline" className="text-slate-500 border-slate-200">
                    {alerts.length} activos
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No hay fechas de renovación próximas.</p>
                        <p className="text-[10px]">Configura las fechas en la ficha del proveedor.</p>
                    </div>
                ) : (
                    alerts.map(alert => {
                        const uc = urgencyConfig[alert.urgency]
                        return (
                            <div key={alert.supplierId} className="flex items-center justify-between p-2 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-md ${uc.bg}`}>
                                        <Calendar className={`w-4 h-4 ${uc.text}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-900">{alert.supplierName}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {alert.paymentTerms ? `Términos: ${alert.paymentTerms}` : 'Sin términos definidos'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-bold ${uc.text}`}>
                                        {alert.daysRemaining <= 0 ? 'Expirado' : `en ${alert.daysRemaining} días`}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {format(new Date(alert.renewalDate), 'd MMM yyyy', { locale: es })}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}
