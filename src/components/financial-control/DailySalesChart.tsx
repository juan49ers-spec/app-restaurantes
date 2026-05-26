'use client'

import { useMemo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DailySales } from '@/types/schema'

interface DailySalesChartProps {
    currentSales: DailySales[]
    previousSales: DailySales[]
}

interface ChartDataPoint {
    day: number
    currentRevenue: number
    previousRevenue: number
    label: string
}

export function DailySalesChart({ currentSales, previousSales }: DailySalesChartProps) {
    const { chartData, currentTotal, previousTotal, deltaPercent } = useMemo(() => {
        const currentByDay = new Map<number, number>()
        const previousByDay = new Map<number, number>()

        currentSales.forEach(s => {
            const day = new Date(s.date).getDate()
            currentByDay.set(day, (currentByDay.get(day) || 0) + (s.revenue_total || 0))
        })

        previousSales.forEach(s => {
            const day = new Date(s.date).getDate()
            previousByDay.set(day, (previousByDay.get(day) || 0) + (s.revenue_total || 0))
        })

        const maxDay = Math.max(
            ...[...currentByDay.keys(), ...previousByDay.keys(), 1]
        )

        const data: ChartDataPoint[] = []
        for (let d = 1; d <= maxDay; d++) {
            data.push({
                day: d,
                currentRevenue: currentByDay.get(d) || 0,
                previousRevenue: previousByDay.get(d) || 0,
                label: `Día ${d}`
            })
        }

        const curTotal = [...currentByDay.values()].reduce((a, b) => a + b, 0)
        const prevTotal = [...previousByDay.values()].reduce((a, b) => a + b, 0)
        const delta = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0

        return { chartData: data, currentTotal: curTotal, previousTotal: prevTotal, deltaPercent: delta }
    }, [currentSales, previousSales])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val)

    const DeltaIcon = deltaPercent > 1 ? TrendingUp : deltaPercent < -1 ? TrendingDown : Minus
    const deltaColor = deltaPercent > 1 ? 'text-emerald-500' : deltaPercent < -1 ? 'text-rose-500' : 'text-muted-foreground'

    return (
        <div className="bg-card border rounded-2xl p-6 space-y-4 ring-1 ring-black/[0.03] dark:ring-white/[0.03] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                        Ventas Diarias
                    </h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-black italic tracking-tighter tabular-nums">
                            {formatCurrency(currentTotal)}
                        </span>
                        <div className={`flex items-center gap-1 text-sm font-bold ${deltaColor}`}>
                            <DeltaIcon className="w-4 h-4" />
                            <span>{deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="font-bold text-muted-foreground">Mes Actual · {formatCurrency(currentTotal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                        <span className="font-bold text-muted-foreground/60">Mes Anterior · {formatCurrency(previousTotal)}</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="gradPrevious" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.08} />
                                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            className="text-[10px] font-bold fill-muted-foreground"
                            tickFormatter={(d) => `${d}`}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            className="text-[10px] font-bold fill-muted-foreground"
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.85)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(0,0,0,0.06)',
                                borderRadius: '14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '14px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
                            }}
                            formatter={(value, name) => [
                                formatCurrency(Number(value ?? 0)),
                                name === 'currentRevenue' ? 'Mes Actual' : 'Mes Anterior'
                            ]}
                            labelFormatter={(day) => `Día ${day}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="previousRevenue"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            strokeOpacity={0.4}
                            fill="url(#gradPrevious)"
                            name="previousRevenue"
                            dot={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="currentRevenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2.5}
                            fill="url(#gradCurrent)"
                            name="currentRevenue"
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
