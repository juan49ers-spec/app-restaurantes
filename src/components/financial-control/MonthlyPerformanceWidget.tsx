"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, CreditCard, Banknote, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

interface PerformanceWidgetProps {
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
    onClick: () => void
}

export function MonthlyPerformanceWidget({ stats, onClick }: PerformanceWidgetProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

    return (
        <motion.div
            whileHover={{ y: -1 }}
            className="group cursor-pointer bg-white rounded-xl border border-neutral-200/60 overflow-hidden hover:border-neutral-300 transition-all duration-200"
        >
            <div className="p-4 space-y-4">
                {/* Header: Total Revenue - More Compact */}
                <div className="flex justify-between items-start" onClick={onClick}>
                    <div>
                        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-0.5">Facturación Mes</p>
                        <h3 className="text-2xl font-semibold text-neutral-900">
                            {formatCurrency(stats.totalNet)}
                        </h3>
                    </div>
                    <div className={cn(
                        "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        stats.momVariation >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    )}>
                        {stats.momVariation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(stats.momVariation).toFixed(0)}%
                    </div>
                </div>

                {/* Secondary KPIs - More Compact */}
                <div className="grid grid-cols-2 gap-3" onClick={onClick}>
                    <div className="bg-neutral-50/60 p-2.5 rounded-lg border border-neutral-100/60">
                        <div className="flex items-center gap-1.5 text-neutral-500 mb-0.5">
                            <CalendarDays className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase tracking-wide">Media Diaria</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-semibold text-neutral-900">
                                {stats.isFirstDay ? "-" : formatCurrency(stats.avgDaily)}
                            </span>
                            {!stats.isFirstDay && (
                                <span className={cn(
                                    "text-[9px] font-semibold",
                                    stats.avgVariation >= 0 ? "text-emerald-600" : "text-red-600"
                                )}>
                                    {stats.avgVariation >= 0 ? "↑" : "↓"}{Math.abs(stats.avgVariation).toFixed(0)}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-neutral-50/60 p-2.5 rounded-lg border border-neutral-100/60">
                        <div className="flex items-center gap-1.5 text-neutral-500 mb-0.5">
                            <CreditCard className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase tracking-wide">Tarjeta</span>
                        </div>
                        <div className="text-base font-semibold text-neutral-900">
                            {stats.totalNet > 0 ? ((stats.cardTotal / stats.totalNet) * 100).toFixed(0) : "0"}%
                        </div>
                    </div>
                </div>

                {/* Distribution Chart - Simplified */}
                <div className="space-y-1.5" onClick={onClick}>
                    <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                        <span className="flex items-center gap-1"><Banknote className="w-2.5 h-2.5" /> Efectivo</span>
                        <span className="flex items-center gap-1">Tarjeta <CreditCard className="w-2.5 h-2.5" /></span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full flex overflow-hidden">
                        <div
                            className="bg-neutral-800 h-full transition-all duration-500"
                            style={{ width: `${stats.totalNet > 0 ? (stats.cashTotal / stats.totalNet) * 100 : 50}%` }}
                        />
                        <div
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${stats.totalNet > 0 ? (stats.cardTotal / stats.totalNet) * 100 : 50}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer - Simplified */}
            <div className="bg-neutral-50/60 px-4 py-2 border-t border-neutral-100/60 flex justify-between items-center group-hover:bg-neutral-100 transition-colors" onClick={onClick}>
                <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wide">Ver detalle</span>
                <div className="flex -space-x-0.5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-3 h-0.5 bg-neutral-300 rounded-full" />
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
