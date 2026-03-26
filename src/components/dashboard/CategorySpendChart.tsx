'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip as HelpTooltip } from "@/components/ui/Tooltip"
import { EmptyState } from "@/components/ui/EmptyState"
import { useState } from 'react'
import { CategoryDetailModal } from './CategoryDetailModal'
import { PieChartIcon } from "lucide-react"

interface CategorySpendChartProps {
    data: { name: string; value: number; color: string }[]
    restaurantId: string
    currentPeriodDates: { start: string; end: string }
}

export function CategorySpendChart({ data, restaurantId, currentPeriodDates }: CategorySpendChartProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    if (!data || data.length === 0) {
        return (
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4 text-slate-400" />
                        Gasto por Categoría
                        <HelpTooltip content="Distribución del gasto por tipo de producto." asIcon />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        type="connect"
                        title="Sin datos de categorías"
                        description="Importa facturas para ver la distribución"
                        icon="chart"
                    />
                </CardContent>
            </Card>
        )
    }

    const total = data.reduce((sum, item) => sum + item.value, 0)

    const onPieClick = (data: { name?: string }) => {
        if (data && data.name) {
            setSelectedCategory(data.name)
        }
    }

    return (
        <>
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4 text-slate-400" />
                        Gasto por Categoría
                        <HelpTooltip content="Haz clic en una categoría para ver el detalle de productos." asIcon />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[280px] w-full relative">
                        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="value"
                                    onClick={onPieClick}
                                    cursor="pointer"
                                    className="outline-none focus:outline-none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            strokeWidth={0}
                                            className="hover:opacity-80 transition-opacity"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#f1f5f9',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: number | string | undefined) => [`${Number(value || 0).toFixed(0)}€`, 'Gasto']}
                                />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute top-1/2 left-[calc(50%-40px)] transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <div className="text-xs text-slate-400">Total</div>
                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {total.toLocaleString('es-ES')}€
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <CategoryDetailModal
                isOpen={!!selectedCategory}
                onClose={() => setSelectedCategory(null)}
                category={selectedCategory || ''}
                restaurantId={restaurantId}
                startDate={currentPeriodDates.start}
                endDate={currentPeriodDates.end}
            />
        </>
    )
}
