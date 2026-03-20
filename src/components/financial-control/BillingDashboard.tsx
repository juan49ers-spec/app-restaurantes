"use client"

import { useState, useEffect } from "react"
import { m } from "framer-motion"
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    ArrowRight, Banknote, CreditCard, Loader2, FolderOpen,
    BarChart3
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { getBillingPeriodData, BillingPeriodData } from "@/app/actions/financial-control"
import { format, parseISO } from "date-fns"

interface BillingDashboardProps {
    restaurantId: string
    onOpenDrillDown: (data: BillingPeriodData['dailyData']) => void
    onOpenTargetModal: () => void
}

export function BillingDashboard({ restaurantId, onOpenDrillDown, onOpenTargetModal }: BillingDashboardProps) {
    const [viewMode, setViewMode] = useState<'mes' | 'trimestre'>('mes')
    const [date, setDate] = useState(() => new Date())
    const [data, setData] = useState<BillingPeriodData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const year = date.getFullYear()
    const currentMonth = date.getMonth()
    const monthNum = currentMonth + 1
    const quarterNum = Math.floor(currentMonth / 3) + 1
    const quarter = `Q${quarterNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4'
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date)
    const periodLabel = viewMode === 'mes'
        ? `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
        : `${quarter} ${year}`

    useEffect(() => {
        let isMounted = true
        setIsLoading(true)

        const startMonth = viewMode === 'mes' ? monthNum : (quarterNum - 1) * 3 + 1
        const numMonths = viewMode === 'mes' ? 1 : 3

        getBillingPeriodData(restaurantId, year, startMonth, numMonths)
            .then(result => { if (isMounted) setData(result) })
            .catch(err => console.error("Failed to load billing data:", err))
            .finally(() => { if (isMounted) setIsLoading(false) })

        return () => { isMounted = false }
    }, [restaurantId, year, monthNum, quarterNum, viewMode])

    const handlePeriodChange = (direction: 'prev' | 'next') => {
        setDate(prev => {
            const d = new Date(prev)
            const delta = viewMode === 'mes' ? 1 : 3
            d.setMonth(d.getMonth() + (direction === 'prev' ? -delta : delta))
            return d
        })
    }

    if (isLoading || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                <p className="text-sm text-neutral-500">Cargando datos de facturación...</p>
            </div>
        )
    }

    const { stats, prevPeriodStats, monthlyBreakdown, dailyData } = data
    const target = stats.revenue_target || 0
    const progress = target > 0 ? Math.min((stats.totalGross / target) * 100, 100) : 0
    const remaining = Math.max(target - stats.totalGross, 0)
    const cashPct = stats.totalGross > 0 ? (stats.cashTotal / stats.totalGross) * 100 : 0
    const cardPct = stats.totalGross > 0 ? (stats.cardTotal / stats.totalGross) * 100 : 0

    // Chart data: monthly bars in trimestre, daily in mes
    const chartData = viewMode === 'trimestre' && monthlyBreakdown.length > 1
        ? monthlyBreakdown.map(m => ({
            name: m.monthName.slice(0, 3),
            Bruta: m.gross,
            Neta: m.net,
        }))
        : dailyData.map(d => ({
            name: format(parseISO(d.date), 'dd'),
            Bruta: d.totalRevenue,
            Neta: d.netRevenue,
        }))

    const prevAvgVar = prevPeriodStats.avgDaily > 0
        ? ((stats.avgDaily - prevPeriodStats.avgDaily) / prevPeriodStats.avgDaily) * 100
        : undefined

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto p-2 sm:p-4">
            {/* Header Glassmorphism */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 relative">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900">
                        Facturación
                    </h2>
                    <p className="text-sm font-medium text-neutral-500 mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Análisis de ingresos en tiempo real
                    </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap z-10">
                    <div className="flex items-center bg-white/70 backdrop-blur-md rounded-xl border border-neutral-200/50 p-1 shadow-sm ring-1 ring-black/5">
                        <button type="button" onClick={() => setViewMode('mes')}
                            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300",
                                viewMode === 'mes'
                                    ? "bg-neutral-900 text-white shadow-lg scale-105"
                                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/50"
                            )}>Mes</button>
                        <button type="button" onClick={() => setViewMode('trimestre')}
                            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300",
                                viewMode === 'trimestre'
                                    ? "bg-neutral-900 text-white shadow-lg scale-105"
                                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/50"
                            )}>Trimestre</button>
                    </div>

                    <div className="flex items-center bg-white/70 backdrop-blur-md rounded-xl border border-neutral-200/50 p-1 shadow-sm ring-1 ring-black/5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-100 rounded-lg transition-colors" onClick={() => handlePeriodChange('prev')}>
                            <ChevronLeft className="h-4 w-4 text-neutral-600" />
                        </Button>
                        <div className="px-4 text-center min-w-[110px]">
                            {viewMode === 'mes' ? (
                                <>
                                    <span className="text-sm font-bold text-neutral-900 block leading-none capitalize tracking-tight">{monthName}</span>
                                    <span className="text-[10px] font-bold text-neutral-400 block leading-none mt-1 uppercase tracking-widest">{year}</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm font-bold text-neutral-900 block leading-none tracking-tight">{quarter}</span>
                                    <span className="text-[10px] font-bold text-neutral-400 block leading-none mt-1 uppercase tracking-widest">{year}</span>
                                </>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-100 rounded-lg transition-colors" onClick={() => handlePeriodChange('next')}>
                            <ChevronRight className="h-4 w-4 text-neutral-600" />
                        </Button>
                    </div>
                </div>
                {/* Decorative background element */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/5 blur-3xl rounded-full -z-10" />
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KPICard
                    label="Facturación Bruta"
                    value={formatCurrency(stats.totalGross)}
                    sublabel="Con IVA"
                    variation={stats.momVariation}
                    variationLabel="vs anterior"
                />
                <KPICard
                    label="Facturación Neta"
                    value={formatCurrency(stats.totalNet)}
                    sublabel="Base imponible"
                    detail={`IVA: ${formatCurrency(stats.totalIVA)}`}
                />
                <KPICard
                    label="Media Diaria"
                    value={formatCurrency(stats.avgDaily)}
                    sublabel={`${stats.operativeDays} días operativos`}
                    variation={prevAvgVar}
                    variationLabel="vs anterior"
                />
                <KPICard
                    label="Media Semanal"
                    value={formatCurrency(stats.avgWeekly)}
                    sublabel="Neta por semana"
                />
            </div>

            {/* Evolution Chart + Objetivo + Medios de pago */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/60 shadow-xl shadow-neutral-200/20 p-6 transition-all hover:shadow-2xl hover:shadow-neutral-200/30">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-emerald-500" />
                                {viewMode === 'trimestre' ? 'Evolución Mensual' : 'Evolución Diaria'} — {periodLabel}
                            </h3>
                            <p className="text-xs font-medium text-neutral-400 mt-0.5 ml-6">Ingresos Brutos vs Netos</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-200 border border-neutral-300 shadow-inner" />Bruta</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />Neta</span>
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barGap={4} barCategoryGap="25%">
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={36} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }}
                                    formatter={(value: number | string | undefined) => value != null && typeof value === 'number'
                                        ? formatCurrency(value) : String(value ?? '')}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(229, 231, 235, 0.5)',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        padding: '12px'
                                    }}
                                    labelStyle={{ fontWeight: 800, color: '#111827', marginBottom: '4px', fontSize: '12px' }}
                                    itemStyle={{ padding: '2px 0' }}
                                />
                                <Bar dataKey="Bruta" fill="#f1f5f9" radius={[6, 6, 0, 0]} className="transition-all duration-500" />
                                <Bar dataKey="Neta" fill="url(#barGradient)" radius={[6, 6, 0, 0]} className="transition-all duration-500 shadow-lg" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right column */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Objetivo Premium Card */}
                    <div className="bg-neutral-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-neutral-900/20 group cursor-default min-h-[160px] flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
                        <div className="relative z-10 flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <h4 className="font-extrabold text-[10px] uppercase tracking-[0.2em] text-neutral-400">Progreso Mensual</h4>
                                <span className="text-xs font-medium text-emerald-400 mt-1">Meta de ingresos</span>
                            </div>
                            <Button variant="outline" size="sm"
                                className="text-[10px] font-bold uppercase text-white hover:text-black bg-white/5 border-white/10 hover:bg-white rounded-lg h-8 px-3 transition-all duration-300"
                                onClick={onOpenTargetModal}>
                                Ajustar
                            </Button>
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <span className="text-3xl font-black tracking-tighter">{progress.toFixed(0)}%</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider">Objetivo</span>
                                    <span className="text-sm font-bold text-neutral-100">{formatCurrency(target)}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                                    <m.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                        {remaining > 0
                                            ? <>Faltan <span className="text-emerald-400">{formatCurrency(remaining)}</span></>
                                            : <span className="text-emerald-400 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Meta Alcanzada</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods Premium Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/60 shadow-lg p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-6 flex items-center gap-2">
                            <CreditCard className="w-3 h-3" /> Canales de Cobro
                        </h4>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="flex items-center gap-2 text-neutral-600 font-bold"><Banknote className="w-4 h-4 text-amber-500" /> Efectivo</span>
                                    <span className="font-extrabold text-neutral-900 tabular-nums">{formatCurrency(stats.cashTotal)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-neutral-100/80 rounded-full overflow-hidden border border-neutral-200/50 p-[1px]">
                                        <m.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cashPct}%` }}
                                            transition={{ duration: 1, delay: 0.2 }}
                                            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                        />
                                    </div>
                                    <span className="text-[11px] font-black text-neutral-500 tabular-nums w-12 text-right">{cashPct.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="flex items-center gap-2 text-neutral-600 font-bold"><CreditCard className="w-4 h-4 text-sky-500" /> Tarjeta</span>
                                    <span className="font-extrabold text-neutral-900 tabular-nums">{formatCurrency(stats.cardTotal)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-neutral-100/80 rounded-full overflow-hidden border border-neutral-200/50 p-[1px]">
                                        <m.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cardPct}%` }}
                                            transition={{ duration: 1, delay: 0.4 }}
                                            className="h-full bg-gradient-to-r from-sky-500 to-sky-300 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                                        />
                                    </div>
                                    <span className="text-[11px] font-black text-neutral-500 tabular-nums w-12 text-right">{cardPct.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comparativa vs anterior */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-3">Vs Periodo Anterior</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-neutral-600">Neta anterior</span>
                                <span className="font-bold text-neutral-900">{formatCurrency(prevPeriodStats.totalNet)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-neutral-600">Neta actual</span>
                                <span className="font-bold text-neutral-900">{formatCurrency(stats.totalNet)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100">
                                <span className="text-neutral-600 font-semibold">Variación</span>
                                <span className={cn(
                                    "font-bold flex items-center gap-1",
                                    stats.momVariation >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {stats.momVariation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(stats.momVariation).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Big "Ver desglose completo" button Premium */}
            <m.button
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() => onOpenDrillDown(dailyData)}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl p-6 flex items-center justify-between transition-all group shadow-xl shadow-neutral-900/10 hover:shadow-neutral-900/20"
            >
                <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-colors duration-500">
                        <BarChart3 className="w-6 h-6 text-emerald-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left space-y-0.5">
                        <span className="text-base font-black flex items-center gap-2">
                            Ver Desglose Detallado 
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Full Access</span>
                        </span>
                        <span className="text-xs text-neutral-400 font-medium group-hover:text-neutral-300 transition-colors">Visualiza el historial diario, variaciones y métricas operativas avanzadas</span>
                    </div>
                </div>
                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-white/20 transition-all">
                    <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                </div>
            </m.button>

            {/* Data source notice */}
            <div className="flex items-start gap-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                <div className="p-2 bg-white border border-neutral-200 rounded-lg shadow-sm flex-shrink-0">
                    <FolderOpen className="w-4 h-4 text-neutral-500" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-neutral-700">Entrada de datos pendiente de configurar</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        Los datos de ventas se cargarán automáticamente desde Google Drive.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────

function KPICard({ label, value, sublabel, detail, variation, variationLabel }: {
    label: string
    value: string
    sublabel: string
    detail?: string
    variation?: number
    variationLabel?: string
}) {
    return (
        <m.div 
            whileHover={{ y: -6, scale: 1.01 }}
            className="bg-white hover:bg-neutral-50/50 rounded-2xl border border-neutral-200/60 p-5 shadow-lg shadow-neutral-100/50 transition-all duration-300 cursor-default group"
        >
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 group-hover:text-neutral-500 transition-colors">{label}</p>
                {variation !== undefined && (
                    <div className={cn(
                        "text-[11px] font-black flex items-center gap-1 py-1 px-2 rounded-lg",
                        variation >= 0 ? "bg-emerald-50/50 text-emerald-600" : "bg-rose-50/50 text-rose-600"
                    )}>
                        {variation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(variation).toFixed(1)}%
                    </div>
                )}
            </div>
            <p className="text-3xl font-black text-neutral-900 tracking-tighter mb-1">{value}</p>
            <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-200 group-hover:bg-emerald-400 transition-all" />
                    {sublabel}
                    {variationLabel && <span className="opacity-60 font-medium italic">{variationLabel}</span>}
                </p>
                {detail && (
                    <p className="text-[10px] font-bold text-neutral-500 bg-neutral-100/50 px-2 py-1 rounded-md inline-block mt-2">
                        {detail}
                    </p>
                )}
            </div>
        </m.div>
    )
}
