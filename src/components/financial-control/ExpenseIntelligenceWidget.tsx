"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Edit3, Wallet, PieChart, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface ExpenseIntelligenceWidgetProps {
    kpis: {
        totalExpenses: number
        totalExpensesExcludingCAPEX: number
        totalCashFlow: number
        momVariation: number
        expenseToSalesRatio: number
        personalRatio: number
        cogsRatio: number
    }
    insight: {
        summary: string
        editable: boolean
    }
    onInsightEdit?: (newSummary: string) => void
}

export function ExpenseIntelligenceWidget({
    kpis,
    insight,
    onInsightEdit,
}: ExpenseIntelligenceWidgetProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedSummary, setEditedSummary] = useState(insight.summary)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    const handleSaveEdit = () => {
        onInsightEdit?.(editedSummary)
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        setEditedSummary(insight.summary)
        setIsEditing(false)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Expenses & MoM */}
            <Card className="shadow-sm border-neutral-200 bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-neutral-900" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Gasto Operativo (OpEx)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                            {formatCurrency(kpis.totalExpensesExcludingCAPEX)}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                                kpis.momVariation > 0
                                    ? "bg-rose-50 text-rose-700 border-rose-100"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            )}>
                                {kpis.momVariation > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(kpis.momVariation).toFixed(1)}%
                            </div>
                            <span className="text-[10px] text-neutral-400">vs mes anterior</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-100">
                            Flujo de Caja Total (incl. Inversiones): <span className="font-medium text-neutral-600">{formatCurrency(kpis.totalCashFlow)}</span>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Ratios & Efficiency */}
            <Card className="shadow-sm border-neutral-200 bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <PieChart className="w-4 h-4" />
                        Eficiencia Operativa
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Sales Ratio */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-medium text-neutral-500">
                            <span>Peso sobre Ventas</span>
                            <span className={cn(
                                kpis.expenseToSalesRatio > 85 ? "text-rose-600" : "text-neutral-900"
                            )}>{kpis.expenseToSalesRatio.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(kpis.expenseToSalesRatio, 100)} className="h-1.5 bg-neutral-100" indicatorClassName={
                            kpis.expenseToSalesRatio > 85 ? "bg-rose-500" : "bg-neutral-900"
                        } />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-neutral-50 rounded p-2 border border-neutral-100">
                            <span className="text-[9px] font-bold text-neutral-500 block">Personal</span>
                            <div className="flex items-end justify-between">
                                <span className={cn("text-lg font-bold tabular-nums", kpis.personalRatio > 35 ? "text-rose-600" : "text-neutral-900")}>
                                    {kpis.personalRatio.toFixed(0)}%
                                </span>
                                <span className="text-[9px] text-neutral-400 mb-1">/33%</span>
                            </div>
                        </div>
                        <div className="bg-neutral-50 rounded p-2 border border-neutral-100">
                            <span className="text-[9px] font-bold text-neutral-500 block">Materia Prima</span>
                            <div className="flex items-end justify-between">
                                <span className={cn("text-lg font-bold tabular-nums", kpis.cogsRatio > 35 ? "text-rose-600" : "text-neutral-900")}>
                                    {kpis.cogsRatio.toFixed(0)}%
                                </span>
                                <span className="text-[9px] text-neutral-400 mb-1">/33%</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: AI Insight */}
            <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 relative overflow-hidden">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Resumen Ejecutivo
                        </CardTitle>
                        {insight.editable && !isEditing && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditing(true)}
                                className="h-6 w-6 text-blue-400 hover:text-blue-700 hover:bg-blue-100/50"
                            >
                                <Edit3 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editedSummary}
                                onChange={(e) => setEditedSummary(e.target.value)}
                                className="w-full h-24 p-2 text-xs text-neutral-700 bg-white/80 rounded border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                aria-label="Resumen ejecutivo"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    className="h-6 text-[10px] bg-white"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full justify-between">
                            <p className="text-xs text-blue-900/80 leading-relaxed font-medium">
                                {insight.summary}
                            </p>
                            <div className="flex gap-2 mt-3">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100/50 text-emerald-700 text-[9px] border border-emerald-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    En objetivo
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100/50 text-rose-700 text-[9px] border border-rose-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Desvío &gt;2%
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
