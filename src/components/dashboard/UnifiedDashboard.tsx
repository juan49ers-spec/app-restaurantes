'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from "next/navigation"
import { m } from "framer-motion"
import { DashboardDatePicker } from "@/components/dashboard/DashboardDatePicker"
import { TrendingUp, ShieldCheck } from "lucide-react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRange } from "react-day-picker"
import { DailySales, OperatingExpense } from '@/types/schema'
import type { FiscalMetrics } from "@/app/actions/financial-control"

const DynamicCFOOverview = dynamic(() => import("@/components/dashboard/CFOOverview").then(mod => mod.CFOOverview), {
    loading: () => <Skeleton className="w-full h-48 rounded-[2rem]" />
})

interface UnifiedDashboardProps {
    strategicView: React.ReactNode
    financialHubData: {
        kpis: {
            totalRevenue: number
            totalExpenses: number
            netProfit: number
            laborCost: number
            costOfGoods: number
            primeCost: number
        }
        sales: DailySales[]
        expenses: OperatingExpense[]
    }
    fiscalMetrics: FiscalMetrics
    defaultDate: {
        from: Date | string
        to: Date | string
    }
}

export function UnifiedDashboard({
    strategicView,
    financialHubData,
    fiscalMetrics,
    defaultDate
}: UnifiedDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const date: DateRange = {
        from: new Date(defaultDate.from),
        to: defaultDate.to ? new Date(defaultDate.to) : undefined
    }

    const setDate = React.useCallback((newDate: DateRange | undefined) => {
        if (!newDate?.from) return;
        const params = new URLSearchParams(searchParams.toString())
        params.set("from", newDate.from.toISOString())
        if (newDate.to) {
            params.set("to", newDate.to.toISOString())
        } else {
            params.delete("to")
        }
        router.push(`/?${params.toString()}`, { scroll: false })
    }, [router, searchParams])

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* COMPACT TOP BAR - DATE ONLY */}
            <div className="flex items-center justify-end py-1">
                <div className="scale-90 origin-right opacity-80 hover:opacity-100 transition-opacity">
                    <DashboardDatePicker date={date} setDate={setDate} />
                </div>
            </div>

            {/* SECTION 1: CEO STRATEGY (Briefing & Hero Numbers) */}
            <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                {strategicView}
            </m.div>

            {/* MINIMAL DIVIDER */}
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border/10"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 flex items-center gap-2">
                        Control Operativo CFO
                    </span>
                </div>
            </div>

            {/* SECTION 2: CFO CONTROL (Taxes & Margins) */}
            <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/40 dark:bg-black/10 backdrop-blur-md rounded-[2rem] border border-border/10 p-6 shadow-sm"
            >
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
                            Semáforo de Salud Operativa
                        </span>
                    </div>
                    <button
                        onClick={() => router.push('/finance')}
                        className="text-[9px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-all flex items-center gap-1.5"
                    >
                        Informe Detallado <TrendingUp className="w-2.5 h-2.5" />
                    </button>
                </div>

                <DynamicCFOOverview
                    kpis={financialHubData.kpis}
                    fiscalMetrics={fiscalMetrics}
                />
            </m.div>
        </div>
    )
}
