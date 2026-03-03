"use client"
import { m } from "framer-motion"
import { TrendingUp, TrendingDown, Target, Banknote, CreditCard } from "lucide-react"
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

    const target = stats.revenue_target || 0
    const progress = target > 0 ? Math.min((stats.totalNet / target) * 100, 100) : 0
    const dashArray = 2 * Math.PI * 38 // r=38
    const dashOffset = dashArray - (dashArray * progress) / 100

    return (
        <m.div
            whileHover={{ y: -2, scale: 1.005 }}
            className="group cursor-pointer bg-white dark:bg-black/40 backdrop-blur-xl rounded-[2rem] border border-neutral-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300"
            onClick={onClick}
        >
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                            Estado del Mes
                        </h3>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                    {/* Radial Progress Chart */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Background track */}
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                className="stroke-neutral-100 dark:stroke-white/5"
                                strokeWidth="8"
                                fill="transparent"
                            />
                            {/* Progress track */}
                            <m.circle
                                initial={{ strokeDashoffset: dashArray }}
                                animate={{ strokeDashoffset: dashOffset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                cx="50"
                                cy="50"
                                r="38"
                                className={cn(
                                    "stroke-emerald-500",
                                    progress >= 100 ? "stroke-emerald-400" : ""
                                )}
                                strokeWidth="8"
                                fill="transparent"
                                strokeLinecap="round"
                                style={{ strokeDasharray: dashArray }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-neutral-900 dark:text-white tracking-tighter">
                                {progress.toFixed(0)}%
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                                Meta
                            </span>
                        </div>
                    </div>

                    {/* Financial Data */}
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <p className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-none mb-2">
                                {formatCurrency(stats.totalNet)}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-neutral-500">Facturación Actual</span>
                                <div className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide",
                                    stats.momVariation >= 0
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                )}>
                                    {stats.momVariation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(stats.momVariation).toFixed(1)}% vs Mes Anterior
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-white/5">
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                                    <Banknote className="w-3 h-3" /> Efectivo
                                </span>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
                                    {stats.totalNet > 0 ? ((stats.cashTotal / stats.totalNet) * 100).toFixed(1) : "0"}%
                                </p>
                            </div>
                            <div>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                                    <CreditCard className="w-3 h-3" /> Tarjeta
                                </span>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
                                    {stats.totalNet > 0 ? ((stats.cardTotal / stats.totalNet) * 100).toFixed(1) : "0"}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Footer */}
            <div className="px-6 py-3 bg-neutral-50/50 dark:bg-white/[0.02] border-t border-neutral-100 dark:border-white/5 flex items-center justify-between group-hover:bg-neutral-50 dark:group-hover:bg-white/[0.04] transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Ver desglose completo
                </span>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500/50 transition-colors" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500/80 transition-delay-75" />
                    <div className="w-1 h-1 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500 transition-delay-150" />
                </div>
            </div>
        </m.div>
    )
}
