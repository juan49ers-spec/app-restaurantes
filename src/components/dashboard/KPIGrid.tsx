'use client'

import { Euro, TrendingUp, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { m } from "framer-motion"
import { DashboardMetrics } from "@/app/actions/dashboard"
import { Tooltip } from "@/components/ui/Tooltip"
import { cn } from "@/lib/utils"

interface KPIGridProps {
    metrics: DashboardMetrics
}

export function KPIGrid({ metrics }: KPIGridProps) {
    const isTrendGood = metrics.spendTrend <= 0
    const projectedTotal = metrics.dailySpend[metrics.dailySpend.length - 1]?.cumulative || 0

    const kpis = [
        {
            label: 'Gasto Mensual',
            value: metrics.currentMonthSpend,
            unit: '€',
            change: metrics.spendTrend,
            changeLabel: `vs. mes anterior (${metrics.lastMonthSpend.toFixed(0)}€)`,
            isGood: isTrendGood,
            icon: Euro,
            tooltip: 'Total gastado en compras este mes. Compara con el mes pasado para ver la tendencia.',
            color: "primary"
        },
        {
            label: 'Impacto Inflación',
            value: metrics.inflationImpact,
            unit: '€',
            prefix: '-',
            subtitle: 'Pérdida estimada por subidas',
            icon: TrendingUp,
            isGood: false,
            tooltip: 'Cuánto más pagas por los mismos productos debido a subidas de precios de proveedores.',
            color: "rose"
        },
        {
            label: 'Alertas Activas',
            value: metrics.activeAlerts,
            subtitle: 'Subidas de precio este mes',
            icon: AlertTriangle,
            isGood: metrics.activeAlerts === 0,
            tooltip: 'Número de productos que han subido de precio significativamente.',
            color: "amber"
        },
        {
            label: 'Proyección Fin de Mes',
            value: projectedTotal,
            unit: '€',
            subtitle: 'Estimación al ritmo actual',
            icon: Wallet,
            highlight: true,
            tooltip: 'Proyección de gasto total si continúas al mismo ritmo de compras.',
            color: "indigo"
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => (
                <m.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                        "group relative overflow-hidden glass-card rounded-3xl p-6",
                        kpi.highlight && "ring-2 ring-primary/20 bg-white/60 dark:bg-black/60 shadow-xl shadow-primary/5"
                    )}
                >
                    {/* Background Decorative Element */}
                    <div className={cn(
                        "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 transition-all duration-700 group-hover:opacity-20",
                        kpi.color === 'rose' ? 'bg-rose-500' :
                            kpi.color === 'amber' ? 'bg-amber-500' :
                                kpi.color === 'indigo' ? 'bg-indigo-500' : 'bg-primary'
                    )} />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/60">
                                    {kpi.label}
                                </span>
                                <Tooltip content={kpi.tooltip} asIcon className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className={cn(
                                "p-2 rounded-xl transition-all duration-500 group-hover:scale-110",
                                kpi.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
                                    kpi.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                        kpi.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'
                            )}>
                                <kpi.icon className="h-4 w-4" />
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1">
                            {kpi.prefix && <span className="text-lg font-serif font-bold text-muted-foreground/50">{kpi.prefix}</span>}
                            <span className="text-4xl font-serif font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-500">
                                {typeof kpi.value === 'number' ? kpi.value.toFixed(0) : kpi.value}
                            </span>
                            {kpi.unit && <span className="text-lg font-serif font-bold text-muted-foreground/50">{kpi.unit}</span>}

                            {kpi.change !== undefined && (
                                <div className={cn(
                                    "ml-3 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter",
                                    kpi.isGood ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                )}>
                                    {kpi.isGood ? <ArrowDownRight className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                                    {kpi.change > 0 && '+'}{kpi.change.toFixed(1)}%
                                </div>
                            )}
                        </div>

                        {(kpi.subtitle || kpi.changeLabel) && (
                            <p className="text-[11px] font-medium text-muted-foreground mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                {kpi.subtitle || kpi.changeLabel}
                            </p>
                        )}
                    </div>
                </m.div>
            ))}
        </div>
    )
}
