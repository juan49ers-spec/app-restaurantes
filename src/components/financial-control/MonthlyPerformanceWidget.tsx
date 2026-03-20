"use client"
import { m } from "framer-motion"
import { TrendingUp, TrendingDown, Target, Banknote, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface PerformanceWidgetProps {
    stats: {
        totalNet: number
        totalGross: number
        totalIVA: number
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
    const target = stats.revenue_target || 0
    const gross = stats.totalGross || stats.totalNet  // fallback for older data
    const progress = target > 0 ? Math.min((gross / target) * 100, 100) : 0
    const dashArray = 2 * Math.PI * 38
    const dashOffset = dashArray - (dashArray * progress) / 100

    const cashPct = stats.totalNet > 0 ? (stats.cashTotal / stats.totalNet) * 100 : 0
    const cardPct = stats.totalNet > 0 ? (stats.cardTotal / stats.totalNet) * 100 : 0

    return (
        <m.div
            whileHover={{ y: -3, scale: 1.008 }}
            className="group cursor-pointer relative overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_50px_rgba(16,185,129,0.12)] transition-all duration-500"
            onClick={onClick}
        >
            {/* Gradient mesh background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/40 dark:from-emerald-950/20 dark:via-black/40 dark:to-sky-950/10" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-radial from-emerald-400/10 to-transparent rounded-full blur-2xl -translate-y-12 translate-x-12" />

            <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 rounded-xl ring-1 ring-emerald-500/20">
                            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                            Estado del Mes
                        </h3>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                    {/* Radial Progress Chart with Glow */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <defs>
                                <filter id="glowProgress">
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Background track */}
                            <circle
                                cx="50" cy="50" r="38"
                                className="stroke-neutral-100 dark:stroke-white/5"
                                strokeWidth="7" fill="transparent"
                            />
                            {/* Progress track with glow */}
                            <m.circle
                                initial={{ strokeDashoffset: dashArray }}
                                animate={{ strokeDashoffset: dashOffset }}
                                transition={{ duration: 1.8, ease: "easeOut" }}
                                cx="50" cy="50" r="38"
                                className="stroke-emerald-500"
                                strokeWidth="7" fill="transparent" strokeLinecap="round"
                                style={{ strokeDasharray: dashArray }}
                                filter="url(#glowProgress)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <m.span
                                key={progress.toFixed(0)}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-2xl font-black text-neutral-900 dark:text-white tracking-tighter"
                            >
                                {progress.toFixed(2)}%
                            </m.span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                                Meta
                            </span>
                        </div>
                    </div>

                    {/* Financial Data */}
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <m.p
                                key={gross}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-none mb-1"
                            >
                                {formatCurrency(gross)}
                            </m.p>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-neutral-500">Facturación Bruta</span>
                                <div className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide",
                                    stats.momVariation >= 0
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                )}>
                                    {stats.momVariation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(stats.momVariation).toFixed(2)}% vs Mes Anterior
                                </div>
                            </div>
                            {/* Bruto / Neto / IVA breakdown */}
                            <div className="flex items-center gap-3 text-[10px]">
                                <span className="text-neutral-400">Neta <span className="font-bold text-neutral-700">{formatCurrency(stats.totalNet)}</span></span>
                                <span className="text-neutral-300">·</span>
                                <span className="text-neutral-400">IVA <span className="font-bold text-amber-600">{formatCurrency(stats.totalIVA)}</span></span>
                            </div>
                        </div>

                        {/* Visual Split Bars */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-white/5">
                            <div className="space-y-1.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                    <Banknote className="w-3 h-3" /> Efectivo
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <m.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cashPct}%` }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                            className="h-full bg-amber-500 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 tabular-nums min-w-[36px] text-right">
                                        {cashPct.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                    <CreditCard className="w-3 h-3" /> Tarjeta
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <m.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cardPct}%` }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                            className="h-full bg-sky-500 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 tabular-nums min-w-[36px] text-right">
                                        {cardPct.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Footer */}
            <div className="relative px-6 py-3 bg-neutral-50/50 dark:bg-white/[0.02] border-t border-neutral-100 dark:border-white/5 flex items-center justify-between group-hover:bg-emerald-50/30 dark:group-hover:bg-emerald-500/5 transition-colors duration-300">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Ver desglose completo
                </span>
                <div className="flex gap-1">
                    <m.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} className="w-1 h-1 rounded-full bg-emerald-500" />
                    <m.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} className="w-1 h-1 rounded-full bg-emerald-500" />
                    <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} className="w-1 h-1 rounded-full bg-emerald-500" />
                </div>
            </div>
        </m.div>
    )
}
