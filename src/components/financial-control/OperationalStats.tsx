'use client'

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, TrendingDown, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react"

interface OperationalStatsProps {
    kpis: {
        totalRevenue: number
        totalExpenses: number
        netProfit: number
        laborCost: number
        costOfGoods: number
        primeCost: number
    }
    activeMetric: string
    onMetricSelect: (metric: string) => void
}

export function OperationalStats({ kpis, activeMetric, onMetricSelect }: OperationalStatsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)
    }

    const formatPct = (value: number) => `${value.toFixed(2)}%`

    // Prime Cost Health
    const primeCostPct = kpis.totalRevenue > 0 ? (kpis.primeCost / kpis.totalRevenue) * 100 : 0
    const primeHealth = primeCostPct < 55 ? 'healthy' : primeCostPct < 65 ? 'warning' : 'danger'

    // Net Profit Margin
    const netMargin = kpis.totalRevenue > 0 ? (kpis.netProfit / kpis.totalRevenue) * 100 : 0

    // Helper to get active styles
    const getActiveStyle = (metric: string) => {
        return activeMetric === metric
            ? "ring-2 ring-neutral-900 dark:ring-white shadow-md scale-[1.02] bg-neutral-50 dark:bg-neutral-800"
            : "hover:scale-[1.01] hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 cursor-pointer opacity-90 hover:opacity-100"
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. REVENUE - Clickable */}
            <Card
                className={`relative overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200 cursor-pointer ${getActiveStyle('revenue')}`}
                onClick={() => onMetricSelect('revenue')}
            >
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 bg-white dark:bg-neutral-900 rounded text-neutral-500 border border-neutral-100 dark:border-neutral-700">
                            Ingresos
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                            {formatCurrency(kpis.totalRevenue)}
                        </div>
                        <p className="text-xs font-medium text-neutral-500">Facturación Total</p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. NET PROFIT - Clickable */}
            <Card
                className={`relative overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200 cursor-pointer ${getActiveStyle('net-profit')}`}
                onClick={() => onMetricSelect('net-profit')}
            >
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-lg border ${kpis.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            {kpis.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${kpis.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            {kpis.netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {formatPct(netMargin)}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className={`text-3xl font-bold tracking-tight tabular-nums ${kpis.netProfit >= 0 ? 'text-neutral-900 dark:text-white' : 'text-red-600'}`}>
                            {formatCurrency(kpis.netProfit)}
                        </div>
                        <p className="text-xs font-medium text-neutral-500">Beneficio Neto (EBITDA)</p>
                    </div>
                </CardContent>
            </Card>

            {/* 3. PRIME COST - Clickable */}
            <Card
                className={`relative overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200 cursor-pointer ${getActiveStyle('prime-cost')}`}
                onClick={() => onMetricSelect('prime-cost')}
            >
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${primeHealth === 'healthy' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            primeHealth === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                'bg-red-50 border-red-100 text-red-700'
                            }`}>
                            {primeHealth === 'healthy' ? 'Óptimo' : primeHealth === 'warning' ? 'Revisar' : 'Alto'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                                {formatPct(primeCostPct)}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                                className={`h-full rounded-full ${primeHealth === 'healthy' ? 'bg-emerald-500' : primeHealth === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(primeCostPct, 100)}%` } as any}
                            />
                        </div>
                        <p className="text-xs font-medium text-neutral-500 mt-1">Coste Primo (Personal + MP)</p>
                    </div>
                </CardContent>
            </Card>

            {/* 4. EXPENSES - Clickable */}
            <Card
                className={`relative overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200 cursor-pointer ${getActiveStyle('expenses')}`}
                onClick={() => onMetricSelect('expenses')}
            >
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                            <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 bg-white dark:bg-neutral-900 rounded text-neutral-500 border border-neutral-100 dark:border-neutral-700">
                            Gastos
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                            {formatCurrency(kpis.totalExpenses)}
                        </div>
                        <p className="text-xs font-medium text-neutral-500">Gastos Operativos Totales</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
