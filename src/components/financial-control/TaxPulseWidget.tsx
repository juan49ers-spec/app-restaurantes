"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, TrendingUp, TrendingDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaxPulseWidgetProps {
    ivaBalance: number
    irpfTotal: number
    daysRemaining: number
    quarter: string
    year: number
}

export function TaxPulseWidget({ ivaBalance, irpfTotal, daysRemaining, quarter, year }: TaxPulseWidgetProps) {
    const isPayable = ivaBalance > 0
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.abs(val))

    // Urgency Logic
    const getUrgency = () => {
        if (daysRemaining <= 3) return { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Crítico" }
        if (daysRemaining <= 10) return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Atención" }
        return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "En plazo" }
    }
    const urgency = getUrgency()

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: IVA Balance */}
            <Card className="shadow-sm border-neutral-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-500 uppercase">
                        Saldo IVA (Modelo 303)
                    </CardTitle>
                    {isPayable ? (
                        <TrendingUp className="h-4 w-4 text-rose-500" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline space-x-2">
                        <div className={cn("text-2xl font-bold tabular-nums", isPayable ? "text-rose-600" : "text-emerald-600")}>
                            {isPayable ? "+" : "-"}{formatCurrency(ivaBalance)}
                        </div>
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded",
                            isPayable ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
                            {isPayable ? "A INGRESAR" : "A COMPENSAR"}
                        </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                        {isPayable
                            ? "El IVA repercutido supera al soportado"
                            : "Tienes saldo a favor para compensar"}
                    </p>
                </CardContent>
            </Card>

            {/* Card 2: IRPF Total */}
            <Card className="shadow-sm border-neutral-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-500 uppercase">
                        Retenciones (111/115)
                    </CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-neutral-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tabular-nums text-neutral-900">
                        {formatCurrency(irpfTotal)}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                        Total acumulado en {quarter} {year}
                    </p>
                    <div className="mt-3 h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            style={{ width: `${Math.min(100, Math.round(((90 - daysRemaining) / 90) * 100))}%` }}
                            className="h-full bg-neutral-900"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: Next Deadline */}
            <Card className={cn("shadow-sm border transition-colors", urgency.border, "bg-white")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-neutral-500 uppercase">
                        Próximo Cierre
                    </CardTitle>
                    <Clock className={cn("h-4 w-4", urgency.color)} />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline space-x-2">
                        <div className={cn("text-2xl font-bold tabular-nums", urgency.color)}>
                            {daysRemaining} días
                        </div>
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded uppercase", urgency.bg, urgency.color)}>
                            {urgency.label}
                        </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                        Fecha límite: 20 de {quarter === 'Q4' ? 'Enero' :
                            quarter === 'Q1' ? 'Abril' :
                                quarter === 'Q2' ? 'Julio' : 'Octubre'}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
