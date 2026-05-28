'use client'

import dynamic from 'next/dynamic'
import { CalendarView } from "@/components/financial-control/CalendarView"
import { ModuleGate } from "@/components/financial-control/ModuleGate"
import { TaxPulse } from "@/components/dashboard/TaxPulse"
import { DailySales, OperatingExpense } from '@/types/schema'
import type { FiscalMetrics } from "@/app/actions/financial-analysis"

// Dynamically import PnLReport to avoid hydration mismatch with Recharts/Tabs
const PnLReport = dynamic(() => import('@/components/financial-control/PnLReport').then(mod => mod.PnLReport), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-neutral-100 dark:bg-neutral-900 animate-pulse rounded-lg" />
})

interface FinancialDashboardProps {
    kpis?: {
        totalRevenue: number
        totalExpenses: number
        netProfit: number
        laborCost: number
        costOfGoods: number
        primeCost: number
    }
    fiscalMetrics: FiscalMetrics
    sales: DailySales[]
    expenses: OperatingExpense[]
    currentDate: Date
    financialModuleLevel: "premium" | "basic" | "none" | undefined
    activeMetric: string
    onMetricSelect: (metric: string) => void
}

export function FinancialDashboard(props: FinancialDashboardProps) {
    const {
        fiscalMetrics,
        sales,
        expenses,
        currentDate,
        financialModuleLevel,
        activeMetric
    } = props
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* MAIN COLUMN: Analytics & Reports (66%) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="min-h-[500px]">
                        <ModuleGate
                            requiredLevel="premium"
                            currentLevel={financialModuleLevel}
                            title="Analítica Avanzada"
                            description="Desbloquea gráficos de beneficios y tendencias detalladas."
                            moduleName="Analítica Financiera"
                        >
                            <PnLReport
                                sales={sales}
                                expenses={expenses}
                                currentDate={currentDate}
                                activeMetric={activeMetric}
                            />
                        </ModuleGate>
                    </div>
                </div>

                {/* SIDEBAR: Calendar & Quick Actions (33%) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Tax Pulse Widget */}
                    <TaxPulse metrics={fiscalMetrics} />

                    <div className="h-full min-h-[500px]">
                        <CalendarView sales={sales} currentDate={currentDate} />
                    </div>
                </div>
            </div>
        </div>
    )
}
