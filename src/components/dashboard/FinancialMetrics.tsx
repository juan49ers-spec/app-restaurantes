"use client"

import { motion } from "framer-motion"
import { Wallet, AlertTriangle, Euro, Percent, Sparkles } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { cn } from "@/lib/utils"

interface FinancialMetricsProps {
    data: {
        totalRevenue: number
        grossMargin: number
        grossMarginPct: number
        netProfit: number
        netProfitPct: number
    } | null
    ghostRisk?: number
}

export function FinancialMetrics({ data, ghostRisk = 0 }: FinancialMetricsProps) {
    if (!data) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass-premium rounded-3xl p-6 animate-pulse border-none">
                        <div className="h-2 bg-black/5 rounded w-1/2 mb-3" />
                        <div className="h-8 bg-black/5 rounded w-3/4" />
                    </div>
                ))}
            </div>
        )
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

    const isProfitable = data.netProfit > 0
    const marginOk = data.grossMarginPct > 65

    const metrics = [
        {
            label: 'Ventas Totales',
            value: formatCurrency(data.totalRevenue),
            icon: Euro,
            tooltip: 'Total de ingresos brutos por ventas en el período seleccionado.',
            status: 'neutral',
            color: 'text-indigo-600'
        },
        {
            label: 'Margen Bruto',
            value: `${data.grossMarginPct.toFixed(1)}%`,
            icon: Percent,
            tooltip: 'Rendimiento tras costes directos. Objetivo: >65%.',
            status: marginOk ? 'good' : 'warn',
            color: marginOk ? 'text-emerald-600' : 'text-amber-600'
        },
        {
            label: 'Beneficio Neto',
            value: formatCurrency(data.netProfit),
            icon: Wallet,
            tooltip: 'Ganancia real acumulada descontando todos los gastos.',
            status: isProfitable ? 'good' : 'bad',
            color: isProfitable ? 'text-emerald-600' : 'text-rose-600'
        },
        {
            label: 'Riesgo Operativo',
            value: formatCurrency(ghostRisk),
            icon: AlertTriangle,
            tooltip: 'Impacto financiero de productos con costes no auditados.',
            status: ghostRisk > 0 ? 'bad' : 'perfect',
            color: ghostRisk > 0 ? 'text-rose-600' : 'text-emerald-600'
        }
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m, idx) => {
                const Icon = m.icon
                return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="glass-card rounded-3xl p-6 group cursor-default border-none relative overflow-hidden"
                    >
                        {/* Subtle Background Glow */}
                        <div className={cn(
                            "absolute -right-4 -top-4 w-16 h-16 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:scale-150",
                            m.status === 'good' || m.status === 'perfect' ? "bg-emerald-500" :
                                m.status === 'warn' ? "bg-amber-500" :
                                    m.status === 'bad' ? "bg-rose-500" : "bg-indigo-500"
                        )} />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">
                                    {m.label}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Tooltip content={m.tooltip} asIcon />
                                    <Icon className={cn("w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity duration-500", m.color)} />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2">
                                <p className={cn(
                                    "font-serif text-3xl font-black tracking-tighter transition-all duration-500",
                                    m.color
                                )}>
                                    {m.value}
                                </p>
                                {m.status === 'perfect' && ghostRisk === 0 && (
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
