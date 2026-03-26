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
    { hex: "#171717", bgClass: "bg-neutral-900" }, // neutral-900
    { hex: "#404040", bgClass: "bg-neutral-700" }, // neutral-700
    { hex: "#737373", bgClass: "bg-neutral-500" }, // neutral-500
    { hex: "#a3a3a3", bgClass: "bg-neutral-400" }, // neutral-400
    { hex: "#d4d4d4", bgClass: "bg-neutral-300" }, // neutral-300
    { hex: "#e5e5e5", bgClass: "bg-neutral-200" }, // neutral-200
    { hex: "#0a0a0a", bgClass: "bg-neutral-950" }, // neutral-950
    { hex: "#262626", bgClass: "bg-neutral-800" }, // neutral-800
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
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
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
                                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", item.bgClass)} />
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
