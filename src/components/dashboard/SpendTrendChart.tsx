'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip as HelpTooltip } from "@/components/ui/Tooltip"
import { EmptyState } from "@/components/ui/EmptyState"
import { BarChart3 } from "lucide-react"

interface SpendTrendChartProps {
    data: { date: string; amount: number; cumulative: number; projected: boolean }[]
}

export function SpendTrendChart({ data }: SpendTrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-400" />
                        Gasto Diario
                        <HelpTooltip content="Evolución del gasto diario y acumulado del mes." asIcon />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        type="connect"
                        title="Sin datos de compras"
                        description="Importa facturas para ver la evolución"
                        icon="chart"
                    />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    Gasto Diario y Proyección
                    <HelpTooltip content="Barras = gasto diario. Línea = acumulado. Barras claras = proyección." asIcon />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                dy={8}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={(value) => `${value}€`}
                                width={50}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                    fontSize: '12px'
                                }}
                                cursor={{ fill: 'transparent' }}
                                formatter={(value: number | string | undefined) => [
                                    `${Number(value || 0).toFixed(0)}€`,
                                    'Gasto'
                                ]}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={16}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.projected ? '#94a3b8' : '#3b82f6'}
                                        fillOpacity={entry.projected ? 0.4 : 1}
                                    />
                                ))}
                            </Bar>
                            <Line
                                type="monotone"
                                dataKey="cumulative"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
