"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
            {/* Executive Tab Navigation */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 py-4 border-b border-neutral-100 -mx-4 px-4 sm:mx-0 sm:px-0 rounded-b-3xl shadow-sm">
                <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                    <div className="flex items-center gap-1 p-1 bg-neutral-100/50 rounded-2xl w-full sm:w-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative whitespace-nowrap flex-1 sm:flex-none",
                                    activeTab === tab.id
                                        ? "bg-white text-neutral-900 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-neutral-900" : "text-neutral-400")} />
                                <span>{tab.label}</span>
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-neutral-900 rounded-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="hidden lg:flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-neutral-200 text-neutral-500 gap-2 hover:bg-neutral-50"
                            onClick={() => setIsMenuLocked(!isMenuLocked)}
                        >
                            {isMenuLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            <span className="text-[10px] uppercase tracking-widest font-bold">Estado Menú</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dynamic Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
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

                                <div className="bg-neutral-800 rounded-xl p-4 text-white">
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
                                            const progress = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0
                                            const remaining = Math.max(target - actual, 0)

                                            return (
                                                <>
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-xl font-semibold">{progress}%</span>
                                                        <span className="text-[10px] text-neutral-400">Meta: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(target)}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            className="h-full bg-emerald-500 rounded-full"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-neutral-400 leading-snug font-medium">
                                                        {remaining > 0 ? (
                                                            <>Faltan <span className="text-white font-semibold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(remaining)}</span></>
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
                            <ImpuestosDashboard />
                        </div>
                    )}

                    {activeTab === 'RESULTADOS' && (
                        <div className="max-w-5xl mx-auto">
                            <ResultadosDashboard
                                dashboardData={resultsData?.data ?? null}
                            />
                        </div>
                    )}
                </motion.div>
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
        </div>
    )
}
