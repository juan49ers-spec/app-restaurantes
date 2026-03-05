"use client"

import { useState } from "react"
import {
    TrendingUp,
    TrendingDown,
    Target,
    Zap,
    Lightbulb,
    Edit3,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TARGET_RATIOS } from "@/lib/financial-constants"
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
    onInsightEdit?: (summary: string) => void
}

export function ExpenseIntelligenceWidget({ kpis, insight, onInsightEdit }: ExpenseIntelligenceWidgetProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedSummary, setEditedSummary] = useState(insight.summary)

    const handleSaveEdit = () => {
        if (onInsightEdit) {
            onInsightEdit(editedSummary)
        }
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        setEditedSummary(insight.summary)
        setIsEditing(false)
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val)

    // Thresholds from constants
    const PERSONAL_TARGET = TARGET_RATIOS.PERSONAL_TARGET_PCT
    const COGS_TARGET = TARGET_RATIOS.COGS_TARGET_PCT
    const PRIME_COST_MAX = TARGET_RATIOS.PRIME_COST_MAX_PCT

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Primary KPIs */}
            <Card className="shadow-sm border-neutral-200 bg-white overflow-hidden group">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Gasto Operativo
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-neutral-900 tracking-tight">
                                {formatCurrency(kpis.totalExpensesExcludingCAPEX)}
                            </span>
                            <div className={cn(
                                "flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full",
                                kpis.momVariation > 0 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50"
                            )}>
                                {kpis.momVariation > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {Math.abs(kpis.momVariation).toFixed(2)}%
                            </div>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium uppercase mt-1">Vs. Mes Anterior</p>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-neutral-700">
                                <span>Eficiencia Operativa</span>
                                <span>{kpis.expenseToSalesRatio.toFixed(2)}%</span>
                            </div>
                            <Progress value={Math.min(kpis.expenseToSalesRatio, 100)} className="h-1.5 bg-neutral-100" indicatorClassName={
                                kpis.expenseToSalesRatio > 85 ? "bg-rose-500" : "bg-neutral-900"
                            } />
                            <p className="text-[9px] text-neutral-400 italic">Punto de equilibrio estimado en 85%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Strategic Ratios */}
            <Card className="shadow-sm border-neutral-200 bg-white group">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        Ratios Estratégicos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Personal KPI */}
                        <div className={cn(
                            "rounded-xl p-3 border transition-all",
                            kpis.personalRatio > PERSONAL_TARGET
                                ? "bg-rose-50/30 border-rose-100"
                                : "bg-emerald-50/30 border-emerald-100"
                        )}>
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Personal</span>
                                {kpis.personalRatio > PERSONAL_TARGET ? (
                                    <AlertCircle className="w-3 h-3 text-rose-500" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-xl font-bold tabular-nums",
                                    kpis.personalRatio > PERSONAL_TARGET ? "text-rose-600" : "text-emerald-600"
                                )}>
                                    {kpis.personalRatio.toFixed(2)}%
                                </span>
                                <span className="text-[10px] text-neutral-400 font-medium tracking-tighter">
                                    /{PERSONAL_TARGET}%
                                </span>
                            </div>
                        </div>

                        {/* COGS KPI */}
                        <div className={cn(
                            "rounded-xl p-3 border transition-all",
                            kpis.cogsRatio > COGS_TARGET
                                ? "bg-rose-50/30 border-rose-100"
                                : "bg-emerald-50/30 border-emerald-100"
                        )}>
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Materia P.</span>
                                {kpis.cogsRatio > COGS_TARGET ? (
                                    <AlertCircle className="w-3 h-3 text-rose-500" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                )}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-xl font-bold tabular-nums",
                                    kpis.cogsRatio > COGS_TARGET ? "text-rose-600" : "text-emerald-600"
                                )}>
                                    {kpis.cogsRatio.toFixed(2)}%
                                </span>
                                <span className="text-[10px] text-neutral-400 font-medium tracking-tighter">
                                    /{COGS_TARGET}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Prime Cost (P + MP)</span>
                            <span className={cn(
                                "text-xs font-bold",
                                (kpis.personalRatio + kpis.cogsRatio) > PRIME_COST_MAX ? "text-rose-600" : "text-emerald-600"
                            )}>
                                {(kpis.personalRatio + kpis.cogsRatio).toFixed(2)}%
                            </span>
                        </div>
                        <Progress
                            value={Math.min(kpis.personalRatio + kpis.cogsRatio, 100)}
                            className="h-1 bg-neutral-100"
                            indicatorClassName={cn(
                                (kpis.personalRatio + kpis.cogsRatio) > PRIME_COST_MAX ? "bg-rose-500" : "bg-emerald-500"
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: AI Insight */}
            <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 relative overflow-hidden group/card">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500 group-hover/card:animate-pulse" />
                            Resumen Ejecutivo
                        </CardTitle>
                        {insight.editable && !isEditing && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditing(true)}
                                className="h-6 w-6 text-blue-400 hover:text-blue-700 hover:bg-blue-100/50 rounded-full"
                            >
                                <Edit3 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="relative">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editedSummary}
                                onChange={(e) => setEditedSummary(e.target.value)}
                                className="w-full h-24 p-3 text-xs text-neutral-700 bg-white/90 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none shadow-inner"
                                aria-label="Resumen ejecutivo"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    className="h-7 text-[10px] bg-white rounded-lg border-neutral-200"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                                >
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-4">
                            <p className="text-xs text-blue-950/80 leading-relaxed font-medium">
                                {insight.summary}
                            </p>

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-100/50">
                                <div className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                    kpis.personalRatio <= PERSONAL_TARGET
                                        ? "bg-emerald-100/50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-100/50 text-rose-700 border-rose-200"
                                )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", kpis.personalRatio <= PERSONAL_TARGET ? "bg-emerald-500" : "bg-rose-500")} />
                                    {kpis.personalRatio <= PERSONAL_TARGET ? "Personal OK" : "Desvío Personal"}
                                </div>
                                <div className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                    kpis.cogsRatio <= COGS_TARGET
                                        ? "bg-emerald-100/50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-100/50 text-rose-700 border-rose-200"
                                )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", kpis.cogsRatio <= COGS_TARGET ? "bg-emerald-500" : "bg-rose-500")} />
                                    {kpis.cogsRatio <= COGS_TARGET ? "Materia P. OK" : "Desvío Mat. Prima"}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
