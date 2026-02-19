'use client'

import { Users } from "lucide-react"
import { StaffEfficiencySummary } from "@/app/actions/staff-optimization"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { Tooltip } from "@/components/ui/Tooltip"
import { EmptyState } from "@/components/ui/EmptyState"

interface StaffingAlertsProps {
    data: StaffEfficiencySummary | null
    isPremium?: boolean
}

export function StaffingAlerts({ data, isPremium = false }: StaffingAlertsProps) {
    // Empty state
    if (!data || data.shiftCount === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Personal</span>
                </div>
                <EmptyState
                    type="connect"
                    title="Sin datos de turnos"
                    description="Sincroniza con tu sistema de turnos"
                />
            </div>
        )
    }

    const { avgLaborCostPct: laborCostPct = 0, shiftCount, smartRecommendation } = data
    const TARGET_LABOR = 30

    // Teaser mode (non-premium)
    if (!isPremium) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Eficiencia Personal
                        </span>
                        <Tooltip content="Coste de personal vs ventas. Objetivo: <30%." asIcon />
                    </div>
                </div>

                {/* KPI Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-3">
                    <div className="min-w-[80px]">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {laborCostPct.toFixed(1)}%
                        </p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">coste laboral</p>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Actual</span>
                            <span>Objetivo: {TARGET_LABOR}%</span>
                        </div>
                        <ProgressBar
                            value={laborCostPct}
                            target={TARGET_LABOR}
                            size="md"
                        />
                    </div>
                </div>

                {/* Smart Recommendation */}
                {smartRecommendation && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded p-2.5 text-xs">
                        <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-900 dark:text-white">Sugerencia:</span>{' '}
                            El {smartRecommendation.day} podrías reducir 1 persona en {smartRecommendation.timeSlot}.
                        </p>
                        {smartRecommendation.estimatedSavings > 0 && (
                            <p className="text-emerald-600 mt-1 font-medium">
                                Ahorro estimado: {smartRecommendation.estimatedSavings}€/mes
                            </p>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Premium mode (full view)
    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Análisis de Personal
                </span>
            </div>
            <p className="text-sm text-slate-600">
                {shiftCount} turnos analizados. Coste laboral: {laborCostPct.toFixed(1)}%
            </p>
        </div>
    )
}
