"use client"

import { useMemo } from "react"
import { TrendingUp, Target, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreakEvenWidgetProps {
    data: {
        puntoEquilibrio: number
        diaBreakEven: number | null
        alcanzado: boolean
        ventasActuales: number
        costesFijos: number
        margenContribucion: number
    }
    daysInMonth?: number
    currentDay?: number
}

export function BreakEvenWidget({ data, daysInMonth = 30, currentDay = 15 }: BreakEvenWidgetProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

    // Calculate progress towards break-even
    const progress = useMemo(() => {
        if (data.puntoEquilibrio <= 0) return 0
        const prog = Math.min((data.ventasActuales / data.puntoEquilibrio) * 100, 100)
        return prog
    }, [data.ventasActuales, data.puntoEquilibrio])

    // Calculate expected completion day
    const expectedDay = useMemo(() => {
        if (data.ventasActuales <= 0 || currentDay <= 0) return null
        const dailyAverage = data.ventasActuales / currentDay
        if (dailyAverage <= 0) return null
        return Math.ceil(data.puntoEquilibrio / dailyAverage)
    }, [data.ventasActuales, data.puntoEquilibrio, currentDay])

    // Calculate if on track
    const onTrack = useMemo(() => {
        if (!expectedDay) return false
        return expectedDay <= daysInMonth
    }, [expectedDay, daysInMonth])

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-xl">
                    <Target className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Punto de Equilibrio</h3>
            </div>

            {/* Break-even amount */}
            <div className="text-center mb-6">
                <p className="text-sm text-neutral-500 mb-1">Ventas necesarias para cubrir gastos</p>
                <p className="text-4xl font-black text-neutral-900">{formatCurrency(data.puntoEquilibrio)}</p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-neutral-500">Progreso actual</span>
                    <span className={cn(
                        "font-bold",
                        progress >= 100 ? "text-emerald-600" : "text-amber-600"
                    )}>
                        {progress.toFixed(1)}%
                    </span>
                </div>
                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            progress >= 100 ? "bg-emerald-500" : "bg-amber-500"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs mt-2">
                    <span className="text-neutral-400">{formatCurrency(data.ventasActuales)}</span>
                    <span className="text-neutral-400">{formatCurrency(data.puntoEquilibrio)}</span>
                </div>
            </div>

            {/* Status */}
            <div className={cn(
                "rounded-xl p-4 mb-4",
                data.alcanzado ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
            )}>
                <div className="flex items-start gap-3">
                    {data.alcanzado ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    )}
                    <div>
                        <p className={cn(
                            "font-bold text-sm",
                            data.alcanzado ? "text-emerald-800" : "text-amber-800"
                        )}>
                            {data.alcanzado
                                ? "¡Punto de equilibrio alcanzado!"
                                : "Aún no se ha alcanzado el punto de equilibrio"
                            }
                        </p>
                        {data.alcanzado && data.diaBreakEven && (
                            <p className="text-xs text-emerald-600 mt-1">
                                Alcanzado el día {data.diaBreakEven} del mes
                            </p>
                        )}
                        {!data.alcanzado && expectedDay && (
                            <p className="text-xs text-amber-700 mt-1">
                                {onTrack
                                    ? `Proyección: día ${expectedDay} (dentro del mes)`
                                    : `Proyección: día ${expectedDay} (fuera del mes)`
                                }
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-500 mb-1">Costes Fijos</p>
                    <p className="font-bold text-neutral-900">{formatCurrency(data.costesFijos)}</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3">
                    <p className="text-xs text-neutral-500 mb-1">Margen Contribución</p>
                    <p className="font-bold text-neutral-900">{data.margenContribucion.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    )
}
