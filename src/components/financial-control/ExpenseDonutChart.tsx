"use client"

import { useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, PieChart as PieChartIcon } from "lucide-react"
import { OperatingExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_TAGS } from "@/types/schema"
import { cn } from "@/lib/utils"

interface ExpenseDonutChartProps {
    expenses: {
        category: OperatingExpenseCategory
        amount: number
        tags: Record<string, number>
    }[]
}

const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
]

interface CustomTooltipProps {
    active?: boolean
    payload?: { payload: { name: string; value: number } }[]
    totalValue: number
}

const CustomTooltip = ({ active, payload, totalValue }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : "0.0"
        return (
            <div className="bg-white p-2 border border-neutral-200 shadow-lg rounded-lg text-xs z-50">
                <p className="font-bold text-neutral-900">{data.name}</p>
                <p className="text-neutral-500">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(data.value)} ({percent}%)
                </p>
            </div>
        )
    }
    return null
}

export function ExpenseDonutChart({ expenses }: ExpenseDonutChartProps) {
    const [selectedCategory, setSelectedCategory] = useState<OperatingExpenseCategory | null>(null)

    // 1. Agrupar datos por categoría (Nivel 1)
    const categoryData = useMemo(() => {
        return expenses.map(e => ({
            name: EXPENSE_CATEGORY_LABELS[e.category],
            value: e.amount,
            category: e.category, // Para filtrar después
            color: "" // Se asignará abajo
        })).sort((a, b) => b.value - a.value).map((item, index) => ({
            ...item,
            color: COLORS[index % COLORS.length]
        }))
    }, [expenses])

    // 2. Agrupar datos por tags si hay una categoría seleccionada (Nivel 2)
    const tagData = useMemo(() => {
        if (!selectedCategory) return []

        const category = expenses.find(e => e.category === selectedCategory)
        if (!category) return []

        return Object.entries(category.tags).map(([tagKey, amount], index) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const label = (EXPENSE_TAGS as any)[selectedCategory]?.[tagKey] || tagKey
            return {
                name: label,
                value: amount,
                color: COLORS[index % COLORS.length] // Reusar colores para tags
            }
        }).sort((a, b) => b.value - a.value)
    }, [expenses, selectedCategory])

    const activeData = selectedCategory ? tagData : categoryData
    const totalValue = activeData.reduce((acc, item) => acc + item.value, 0)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

    // Custom Tooltip



    return (
        <Card className="shadow-sm border-neutral-200 bg-white h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 flex-none border-b border-neutral-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4" />
                        Distribución de Gastos
                    </CardTitle>
                    {selectedCategory && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCategory(null)}
                            className="h-6 text-[10px] px-2 text-neutral-500 hover:text-neutral-900"
                        >
                            <ChevronLeft className="w-3 h-3 mr-1" />
                            Volver
                        </Button>
                    )}
                </div>
                {selectedCategory && (
                    <p className="text-sm font-bold text-blue-600 mt-1">
                        {EXPENSE_CATEGORY_LABELS[selectedCategory]}
                    </p>
                )}
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col sm:flex-row items-center h-full min-h-[160px]">
                {/* Chart Section */}
                <div className="relative w-full sm:w-1/2 h-[160px] sm:h-full min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={activeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={2}
                                dataKey="value"
                                onClick={(data) => {
                                    if (!selectedCategory && 'category' in data) {
                                        setSelectedCategory(data.category as OperatingExpenseCategory)
                                    }
                                }}
                                cursor={!selectedCategory ? "pointer" : "default"}
                            >
                                {activeData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        strokeWidth={1}
                                        stroke="#fff"
                                        className="hover:opacity-80 transition-opacity"
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip totalValue={totalValue} />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-[9px] text-neutral-400 font-medium">Total</p>
                            <p className="text-xs font-bold text-neutral-900">{formatCurrency(totalValue)}</p>
                        </div>
                    </div>
                </div>

                {/* Legend Section */}
                <div className="w-full sm:w-1/2 p-3 h-[160px] sm:h-full overflow-y-auto border-t sm:border-t-0 sm:border-l border-neutral-100 bg-neutral-50/30">
                    <div className="space-y-1.5">
                        {activeData.map((item, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-center justify-between text-[10px] p-1.5 rounded-md hover:bg-white transition-colors cursor-pointer",
                                    !selectedCategory && "hover:shadow-sm"
                                )}
                                onClick={() => {
                                    if (!selectedCategory && 'category' in item) {
                                        setSelectedCategory(item.category as OperatingExpenseCategory)
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">


                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-neutral-600 truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                                </div>
                                <span className="font-semibold text-neutral-900 ml-1">{((item.value / totalValue) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
