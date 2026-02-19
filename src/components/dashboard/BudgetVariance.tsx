'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { ProgressBar } from "@/components/ui/ProgressBar"

interface BudgetVarianceProps {
    currentSpend: number
    projectedSpend: number
    budget: number
    className?: string
}

export function BudgetVariance({
    currentSpend,
    projectedSpend,
    budget,
    className
}: BudgetVarianceProps) {
    const safeBudget = budget > 0 ? budget : 1
    const variance = projectedSpend - budget
    const isOverBudget = variance > 0
    const currentPct = (currentSpend / safeBudget) * 100

    return (
        <Card className={`border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 ${className || ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    Variación Presupuesto
                    <Tooltip content="Comparación de tu gasto actual y proyectado contra el presupuesto del mes pasado." asIcon />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main variance number */}
                <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isOverBudget ? '+' : '-'}{Math.abs(variance).toLocaleString('es-ES')}€
                    </span>
                    <span className="text-xs text-slate-400">
                        {isOverBudget ? 'sobre presupuesto' : 'bajo presupuesto'}
                    </span>
                </div>

                {/* Progress toward budget */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Actual: {currentSpend.toLocaleString('es-ES')}€</span>
                        <span>Objetivo: {budget.toLocaleString('es-ES')}€</span>
                    </div>

                    <ProgressBar
                        value={currentPct}
                        target={100}
                        direction="lower-is-better"
                        showPercentage={false}
                        size="md"
                    />

                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Proyección: {projectedSpend.toLocaleString('es-ES')}€</span>
                        <span>{((projectedSpend / safeBudget) * 100).toFixed(0)}% del objetivo</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
