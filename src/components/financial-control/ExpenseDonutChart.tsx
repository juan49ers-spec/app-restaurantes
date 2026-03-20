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
    { hex: "#3b82f6", bgClass: "bg-blue-500" },
    { hex: "#10b981", bgClass: "bg-emerald-500" },
    { hex: "#f59e0b", bgClass: "bg-amber-500" },
    { hex: "#ef4444", bgClass: "bg-red-500" },
    { hex: "#8b5cf6", bgClass: "bg-violet-500" },
    { hex: "#ec4899", bgClass: "bg-pink-500" },
    { hex: "#06b6d4", bgClass: "bg-cyan-500" },
    { hex: "#f97316", bgClass: "bg-orange-500" },
]

interface CustomTooltipProps {
    active?: boolean
    payload?: { payload: { name: string; value: number } }[]
    totalValue: number
}

const CustomTooltip = ({ active, payload, totalValue }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(2) : "0.00"
        return (
            <div className="bg-white p-2 border border-neutral-200 shadow-lg rounded-lg text-xs z-50">
                <p className="font-bold text-neutral-900">{data.name}</p>
                <p className="text-neutral-500">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.value)} ({percent}%)
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
            color: "" as string, // Se asignará abajo
            bgClass: "" as string
        })).sort((a, b) => b.value - a.value).map((item, index) => ({
            ...item,
            color: COLORS[index % COLORS.length].hex,
            bgClass: COLORS[index % COLORS.length].bgClass
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
                color: COLORS[index % COLORS.length].hex,
                bgClass: COLORS[index % COLORS.length].bgClass
            }
        }).sort((a, b) => b.value - a.value)
    }, [expenses, selectedCategory])

    const activeData = selectedCategory ? tagData : categoryData
    const totalValue = activeData.reduce((acc, item) => acc + item.value, 0)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

    // Custom Tooltip



    return (
        <Card className="shadow-sm border-neutral-200 bg-white">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-neutral-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-50 rounded-lg text-neutral-500">
                            <PieChartIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-neutral-900 leading-none">
                                {selectedCategory ? EXPENSE_CATEGORY_LABELS[selectedCategory] : "Distribución de Gastos"}
                            </CardTitle>
                            <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-semibold">
                                {selectedCategory ? "Desglose por proveedor" : "Vista por categorías"}
                            </p>
                        </div>
                    </div>
                    {selectedCategory && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCategory(null)}
                            className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 pr-3"
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Volver
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Donut */}
                <div className="relative h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={activeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={62}
                                outerRadius={88}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onClick={(data) => {
                                    if (!selectedCategory && 'category' in data) {
                                        setSelectedCategory(data.category as OperatingExpenseCategory)
                                    }
                                }}
                                className={cn(selectedCategory ? "cursor-default" : "cursor-pointer", "outline-none")}
                            >
                                {activeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip totalValue={totalValue} />} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-[9px] text-neutral-400 font-medium">Total</p>
                            <p className="text-sm font-bold text-neutral-900">{formatCurrency(totalValue)}</p>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="space-y-1">
                    {activeData.map((item, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg transition-colors",
                                !selectedCategory ? "hover:bg-neutral-50 cursor-pointer" : ""
                            )}
                            onClick={() => {
                                if (!selectedCategory && 'category' in item) {
                                    setSelectedCategory(item.category as OperatingExpenseCategory)
                                }
                            }}
                        >
                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-neutral-600 font-medium truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                                <span className="text-neutral-400 tabular-nums">
                                    {totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0}%
                                </span>
                                <span className="font-semibold text-neutral-900 tabular-nums">
                                    {formatCurrency(item.value)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
