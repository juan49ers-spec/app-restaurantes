'use client'

import React from 'react'
import { ShieldCheck, Activity } from "lucide-react"
import { TaxPulse } from "./TaxPulse"
import type { FiscalMetrics } from "@/app/actions/financial-control"

interface CFOOverviewProps {
    kpis: {
        totalRevenue: number
        totalExpenses: number
        netProfit: number
        laborCost: number
        costOfGoods: number
    }
    fiscalMetrics: FiscalMetrics
}

export function CFOOverview({ kpis, fiscalMetrics }: CFOOverviewProps) {
    const formatPct = (val: number) => `${val.toFixed(1)}%`

    const foodCostPct = kpis.totalRevenue > 0 ? (kpis.costOfGoods / kpis.totalRevenue) * 100 : 0
    const laborCostPct = kpis.totalRevenue > 0 ? (kpis.laborCost / kpis.totalRevenue) * 100 : 0
    const netMargin = kpis.totalRevenue > 0 ? (kpis.netProfit / kpis.totalRevenue) * 100 : 0

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* SINGLE ROW OF TRUTH - ZEN VERSION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* FISCAL POSITION - NATIVE SCALE */}
                <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-[1.5rem] border border-border/10">
                    <TaxPulse metrics={fiscalMetrics} />
                </div>

                {/* MARGIN HEALTH (SEMÁFORO ZEN) */}
                <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/10 rounded-[1.5rem] p-5 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Márgenes Operativos</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Materia Prima</span>
                            <span className={`text-xl font-black tabular-nums ${foodCostPct > 35 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {formatPct(foodCostPct)}
                            </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800/50 h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${foodCostPct > 35 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(foodCostPct, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Personal</span>
                            <span className={`text-xl font-black tabular-nums ${laborCostPct > 40 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {formatPct(laborCostPct)}
                            </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800/50 h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${laborCostPct > 40 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(laborCostPct, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">Margen Neto</span>
                        </div>
                        <span className="text-sm font-black text-primary px-3 py-0.5 rounded-full border border-primary/20 bg-primary/5">
                            {formatPct(netMargin)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
