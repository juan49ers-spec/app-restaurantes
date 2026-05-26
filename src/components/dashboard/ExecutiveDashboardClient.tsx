'use client'

import React from 'react'
import { DateRange } from "react-day-picker"
import { SmartBriefing } from "./SmartBriefing"
import { DollarSign, TrendingUp, Wallet } from "lucide-react"

interface ExecutiveDashboardClientProps {
    initialDateRange: DateRange
    initialData: {
        financial: {
            metrics: {
                totalRevenue: number
                netProfit: number
                netProfitPct: number
            }
        } | null
        engine?: unknown | null
        staff?: unknown | null
    }
    missingRestaurant?: boolean
}

export function ExecutiveDashboardClient({
    initialData,
    missingRestaurant = false,
}: ExecutiveDashboardClientProps) {

    const { financial: financialData } = initialData

    if (missingRestaurant) {
        return (
            <div className="flex h-[300px] items-center justify-center flex-col gap-4 text-neutral-400">
                <p className="font-serif text-lg font-bold">Sin Restaurante Asignado</p>
            </div>
        )
    }

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)

    const metrics = {
        totalRevenue: financialData?.metrics?.totalRevenue || 0,
        netProfit: financialData?.metrics?.netProfit || 0,
        netProfitPct: financialData?.metrics?.netProfitPct || 0,
        cashFlow: (financialData?.metrics?.totalRevenue || 0) * 0.85
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* HERO BRIEFING - COMPACT */}
            <section className="bg-white/40 dark:bg-black/10 backdrop-blur-md rounded-[2rem] border border-border/10 overflow-hidden shadow-sm">
                <SmartBriefing
                    userName="CEO"
                    metrics={{
                        totalRevenue: metrics.totalRevenue,
                        netProfit: metrics.netProfit,
                        netProfitPct: metrics.netProfitPct,
                        laborCostPct: 0
                    }}
                />
            </section>

            {/* ZEN KPI ROW */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="group bg-neutral-900 text-white rounded-[1.5rem] p-5 flex items-center justify-between transition-all hover:bg-black cursor-pointer">
                    <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80">EBITDA Real</span>
                        <div className="text-2xl font-serif font-black">{formatCurrency(metrics.netProfit)}</div>
                    </div>
                    <div className="bg-emerald-500/10 p-2.5 rounded-full">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                </div>

                <div className="group bg-white dark:bg-neutral-900 border border-border/40 rounded-[1.5rem] p-5 flex items-center justify-between transition-all hover:border-primary/50 cursor-pointer">
                    <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ingresos</span>
                        <div className="text-2xl font-serif font-black">{formatCurrency(metrics.totalRevenue)}</div>
                    </div>
                    <div className="bg-primary/5 p-2.5 rounded-full">
                        <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                </div>

                <div className="group bg-primary/5 border border-primary/10 rounded-[1.5rem] p-5 flex items-center justify-between transition-all hover:bg-primary/10 cursor-pointer">
                    <div className="space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Disponible</span>
                        <div className="text-2xl font-serif font-black text-primary">{formatCurrency(metrics.cashFlow)}</div>
                    </div>
                    <div className="bg-primary/10 p-2.5 rounded-full">
                        <Wallet className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </section>
        </div>
    )
}
