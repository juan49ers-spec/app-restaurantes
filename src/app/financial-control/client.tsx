"use client"

import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
    TrendingUp,
    Receipt,
    Lock,
    Unlock,
    PieChart,
    Scale
} from "lucide-react"
import { format, isSameMonth } from "date-fns"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DailySalesForm } from "@/components/financial-control/DailySalesForm"
import { Button } from "@/components/ui/button"
import { MonthlyPerformanceWidget } from "@/components/financial-control/MonthlyPerformanceWidget"

import type { DailySales, OperatingExpense } from "@/types/schema"
import type { ExpenseDashboardData } from "@/app/actions/financial-control"
import type { DashboardData as ResultsData } from "@/app/actions/resultados"

import { Skeleton } from "@/components/ui/skeleton"

// Lazy Load Secondary Modules
const ExpensesDashboard = dynamic(() => import("@/components/financial-control/ExpensesDashboard").then(mod => mod.ExpensesDashboard), {
    loading: () => <Skeleton className="w-full h-[600px] rounded-3xl" />
})

const ImpuestosDashboard = dynamic(() => import("@/components/financial-control/ImpuestosDashboard").then(mod => mod.ImpuestosDashboard), {
    loading: () => <Skeleton className="w-full h-[800px] rounded-3xl" />
})

const ResultadosDashboard = dynamic(() => import("@/components/financial-control/ResultadosDashboard").then(mod => mod.ResultadosDashboard), {
    loading: () => <Skeleton className="w-full h-[800px] rounded-3xl" />,
    ssr: false // Results dashboard uses heavy charts
})

const BillingDrillDownModal = dynamic(() => import("@/components/financial-control/BillingDrillDownModal").then(mod => mod.BillingDrillDownModal), {
    loading: () => <Skeleton className="w-full h-96 rounded-3xl" />
})

const MonthlyTargetForm = dynamic(() => import("@/components/financial-control/MonthlyTargetForm").then(mod => mod.MonthlyTargetForm), {
    loading: () => <Skeleton className="w-full h-96 rounded-3xl" />
})

type GlobalTab = 'FACTURACION' | 'GASTOS' | 'IMPUESTOS' | 'RESULTADOS'

interface FinancialControlClientProps {
    restaurantId: string
    initialDate: string
    initialDailySales: DailySales | null
    initialExpenses: OperatingExpense[]
    billingData: {
        stats: {
            totalNet: number
            momVariation: number
            avgDaily: number
            avgVariation: number
            cashTotal: number
            cardTotal: number
            isFirstDay: boolean
            revenue_target?: number
        }
        dailyData: import("@/components/financial-control/BillingDrillDownModal").BillingDataPoint[]
    }
    expenseDashboardData?: ExpenseDashboardData
    resultsData?: {
        data: ResultsData | null
        error: string | null
    }
}

export function FinancialControlClient({
    restaurantId,
    initialDate,
    initialDailySales,
    billingData,
    expenseDashboardData,
    resultsData
}: FinancialControlClientProps) {
    const [activeTab, setActiveTab] = useState<GlobalTab>('FACTURACION')
    const [isMenuLocked, setIsMenuLocked] = useState(true)
    const [isDrillDownOpen, setIsDrillDownOpen] = useState(false)

    const hasTargets = billingData.stats.revenue_target && billingData.stats.revenue_target > 0
    const isCurrentMonth = isSameMonth(new Date(initialDate), new Date())
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(!hasTargets && isCurrentMonth)



    const tabs: { id: GlobalTab; label: string; icon: React.ElementType }[] = [
        { id: 'FACTURACION', label: 'Facturación', icon: Receipt },
        { id: 'GASTOS', label: 'Gastos', icon: TrendingUp },
        { id: 'IMPUESTOS', label: 'Impuestos', icon: Scale },
        { id: 'RESULTADOS', label: 'Resultados', icon: PieChart }
    ]

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* Premium Floated Navigation Bar */}
            <div className="sticky top-6 z-40 mb-8 mx-auto w-full max-w-fit pointer-events-none">
                <div className="pointer-events-auto bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-full px-2 py-2 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                                    isActive
                                        ? "text-neutral-900 dark:text-white"
                                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                )}
                            >
                                {isActive && (
                                    <m.div
                                        layoutId="activeTabBadge"
                                        className="absolute inset-0 bg-white dark:bg-white/10 rounded-full shadow-sm border border-neutral-200/50 dark:border-white/5"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <tab.icon className={cn("w-4 h-4", isActive ? "text-emerald-500" : "")} />
                                    <span>{tab.label}</span>
                                </span>
                            </button>
                        )
                    })}

                    {/* Divider */}
                    <div className="hidden sm:block w-[1px] h-6 bg-border/40 mx-1" />

                    {/* Lock Toggle */}
                    <button
                        onClick={() => setIsMenuLocked(!isMenuLocked)}
                        className={cn(
                            "hidden lg:flex items-center justify-center w-10 h-10 rounded-full transition-colors relative group",
                            isMenuLocked
                                ? "bg-neutral-100/50 dark:bg-white/5 text-neutral-400 hover:text-neutral-600"
                                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        )}
                        title={isMenuLocked ? "Desbloquear menús secundarios" : "Bloquear menús"}
                    >
                        {isMenuLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Dynamic Content Area */}
            <AnimatePresence mode="wait">
                <m.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    {activeTab === 'FACTURACION' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left: Global Analytics & Summary */}
                            <div className="lg:col-span-4 space-y-6">
                                <MonthlyPerformanceWidget
                                    stats={billingData.stats}
                                    onClick={() => setIsDrillDownOpen(true)}
                                />

                                <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-4 text-white ring-1 ring-white/5 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-white/10 rounded-lg">
                                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <h4 className="font-semibold text-[11px] uppercase tracking-wide text-neutral-300">Objetivo Mensual</h4>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-[9px] font-semibold uppercase tracking-wide text-emerald-400 hover:text-emerald-300 hover:bg-white/5 rounded-lg h-7 px-2.5 border border-emerald-400/20"
                                            onClick={() => setIsTargetModalOpen(true)}
                                        >
                                            Configurar
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {(() => {
                                            const target = billingData.stats.revenue_target || 0
                                            const actual = billingData.stats.totalNet || 0
                                            const hasConfiguredTarget = target > 0
                                            const progress = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0
                                            const remaining = Math.max(target - actual, 0)

                                            return (
                                                <>
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-xl font-semibold">{progress}%</span>
                                                        <span className="text-[10px] text-neutral-400">Meta: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(target)}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <m.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            className="h-full bg-emerald-500 rounded-full"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-neutral-400 leading-snug font-medium">
                                                        {!hasConfiguredTarget ? (
                                                            <span className="text-amber-300 font-semibold">Configura una meta para medir el avance.</span>
                                                        ) : remaining > 0 ? (
                                                            <>Faltan <span className="text-white font-semibold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining)}</span></>
                                                        ) : (
                                                            <span className="text-emerald-400 font-semibold">¡Objetivo superado!</span>
                                                        )}
                                                    </p>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Daily Operations Form */}
                            <div className="lg:col-span-8">
                                <DailySalesForm
                                    restaurantId={restaurantId}
                                    date={initialDate}
                                    initialData={initialDailySales}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'GASTOS' && (
                        <div className="max-w-7xl mx-auto">
                            {expenseDashboardData ? (
                                <ExpensesDashboard
                                    data={expenseDashboardData}
                                    restaurantId={restaurantId}
                                />
                            ) : (
                                <div className="text-center py-12 text-neutral-400">
                                    Cargando dashboard de gastos...
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'IMPUESTOS' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            <ImpuestosDashboard restaurantId={restaurantId} />
                        </div>
                    )}

                    {activeTab === 'RESULTADOS' && (
                        <div className="max-w-5xl mx-auto">
                            <ResultadosDashboard
                                dashboardData={resultsData?.data ?? null}
                            />
                        </div>
                    )}
                </m.div>
            </AnimatePresence>

            {/* Drilldown Modal */}
            <BillingDrillDownModal
                isOpen={isDrillDownOpen}
                onClose={() => setIsDrillDownOpen(false)}
                data={billingData.dailyData}
            />

            {/* Monthly Target Modal */}
            <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Presupuesto Mensual</DialogTitle>
                        <DialogDescription>Establece tus presupuestos operativos para monitorizar desviaciones en tiempo real.</DialogDescription>
                    </DialogHeader>
                    <MonthlyTargetForm
                        restaurantId={restaurantId}
                        currentMonth={format(new Date(initialDate), 'yyyy-MM')}
                        initialData={null}
                        onSuccess={() => setIsTargetModalOpen(false)}
                        showCard={true}
                    />
                </DialogContent>
            </Dialog>
        </div >
    )
}
