"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfitBridgeProps {
    data: {
        previousMonth: {
            resultado: number
            ingresos: number
            margen: number
        }
        currentMonth: {
            resultado: number
            ingresos: number
            margen: number
        }
        variacionVentas: number
        variacionMargen: number
        variacionGastosFijos: number
        variacionInversiones: number
        impactoTotal: number
    }
}

export function ProfitBridge({ data }: ProfitBridgeProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val)

    const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`

    // Build waterfall data
    const waterfallData = useMemo(() => {
        const baseResult = data.previousMonth.resultado
        const items = []
        let cumulative = baseResult

        // Starting point
        items.push({
            label: 'Mes Anterior',
            value: baseResult,
            cumulative: baseResult,
            type: 'start',
            displayValue: baseResult
        })

        // Ventas impact
        const ventasImpact = (data.variacionVentas / 100) * data.previousMonth.ingresos * (data.previousMonth.margen / 100)
        cumulative += ventasImpact
        items.push({
            label: 'Variación Ventas',
            value: ventasImpact,
            cumulative: cumulative,
            type: ventasImpact >= 0 ? 'positive' : 'negative',
            displayValue: ventasImpact
        })

        // Margen impact
        const margenImpact = (data.variacionMargen / 100) * data.currentMonth.ingresos
        cumulative += margenImpact
        items.push({
            label: 'Variación Margen',
            value: margenImpact,
            cumulative: cumulative,
            type: margenImpact >= 0 ? 'positive' : 'negative',
            displayValue: margenImpact
        })

        // Gastos fijos impact
        const gastosImpact = -data.variacionGastosFijos
        cumulative += gastosImpact
        items.push({
            label: 'Gastos Fijos',
            value: gastosImpact,
            cumulative: cumulative,
            type: gastosImpact >= 0 ? 'positive' : 'negative',
            displayValue: gastosImpact
        })

        // Inversiones impact
        const invImpact = -data.variacionInversiones
        cumulative += invImpact
        items.push({
            label: 'Inversiones',
            value: invImpact,
            cumulative: cumulative,
            type: invImpact >= 0 ? 'positive' : 'negative',
            displayValue: invImpact
        })

        // End point
        items.push({
            label: 'Mes Actual',
            value: data.currentMonth.resultado,
            cumulative: data.currentMonth.resultado,
            type: 'end',
            displayValue: data.currentMonth.resultado
        })

        return items
    }, [data])

    const isPositiveChange = data.impactoTotal >= 0

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-neutral-900">Profit Bridge</h3>
                <div className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold",
                    isPositiveChange ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                )}>
                    {isPositiveChange ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    Impacto: {formatPercent(data.impactoTotal)}
                </div>
            </div>

            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickFormatter={(value) => `€${value / 1000}k`}
                        />
                        <Tooltip
                            formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), '']}
                            labelFormatter={(label) => label}
                            contentStyle={{
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '12px'
                            }}
                        />
                        <ReferenceLine y={0} stroke="#e5e7eb" />
                        <Bar dataKey="displayValue" radius={[4, 4, 4, 4]}>
                            {waterfallData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.type === 'start' || entry.type === 'end'
                                            ? '#374151'
                                            : entry.type === 'positive'
                                                ? '#10b981'
                                                : '#f43f5e'
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-neutral-600">Impacto Positivo</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500"></div>
                    <span className="text-neutral-600">Impacto Negativo</span>
                </div>
            </div>
        </div>
    )
}
