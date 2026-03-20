"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { m, AnimatePresence } from "framer-motion"
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    ArrowRight, Banknote, CreditCard, AlertCircle, FileX,
    BarChart3, Activity, Target, List
} from "lucide-react"
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
import { getBillingPeriodData, BillingPeriodData } from "@/app/actions/financial-control"
import { format, parseISO, isValid } from "date-fns"
import { AiInsightsPanel } from "@/components/shared/AiInsightsPanel"
import { DriveInboxPanel } from "@/components/shared/DriveInboxPanel"

interface BillingDashboardProps {
    restaurantId: string
    onOpenDrillDown: (data: BillingPeriodData['dailyData']) => void
    onOpenTargetModal: () => void
}

export function BillingDashboard({ restaurantId, onOpenDrillDown, onOpenTargetModal }: BillingDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view') as 'mes' | 'trimestre' | null

    const initialDate = dateParam && isValid(parseISO(dateParam)) ? parseISO(dateParam) : new Date()
    const initialView = viewParam === 'mes' || viewParam === 'trimestre' ? viewParam : 'mes'

    const [viewMode, setViewMode] = useState<'mes' | 'trimestre'>(initialView)
    const [date, setDate] = useState<Date>(initialDate)
    const [data, setData] = useState<BillingPeriodData | null>(null)
    
    // Resilient States
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'empty'>('loading')

    useEffect(() => {
        const currentUrlDate = searchParams.get('date')
        const currentUrlView = searchParams.get('view')
        const newUrlDate = format(date, 'yyyy-MM-dd')
        
        if (currentUrlDate !== newUrlDate || currentUrlView !== viewMode) {
            const params = new URLSearchParams(searchParams.toString())
            params.set('date', newUrlDate)
            params.set('view', viewMode)
            router.push(`?${params.toString()}`, { scroll: false })
        }
    }, [date, viewMode, router, searchParams])

    useEffect(() => {
        if (dateParam && isValid(parseISO(dateParam))) {
            setDate(parseISO(dateParam))
        }
        if (viewParam === 'mes' || viewParam === 'trimestre') {
            setViewMode(viewParam)
        }
    }, [dateParam, viewParam])

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
        setStatus('loading')

        const startMonth = viewMode === 'mes' ? monthNum : (quarterNum - 1) * 3 + 1
        const numMonths = viewMode === 'mes' ? 1 : 3

        getBillingPeriodData(restaurantId, year, startMonth, numMonths)
            .then(result => { 
                if (!isMounted) return
                if (!result || (result.stats.totalGross === 0 && result.dailyData.length === 0)) {
                    setStatus('empty')
                    setData(null)
                } else {
                    setData(result)
                    setStatus('success')
                }
            })
            .catch(err => {
                console.error("Failed to load billing data:", err)
                if (isMounted) setStatus('error')
            })

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

    if (status === 'error') {
        return <ErrorState onRetry={() => setDate(new Date(date.getTime()))} />
    }

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto p-2 sm:p-4">
            
            {/* Premium Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 relative border-b border-neutral-200/60">
                <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-neutral-100 flex items-center justify-center border border-neutral-200 shadow-sm">
                            <Banknote className="w-5 h-5 text-neutral-700" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-sans font-bold text-neutral-900 tracking-tight">
                            Facturación
                        </h2>
                    </div>
                    <p className="text-sm font-medium text-neutral-500 flex items-center gap-2 pl-[52px]">
                        {status === 'loading' ? (
                            <span className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" />
                        ) : status === 'success' ? (
                            <span className="w-2 h-2 rounded-full bg-neutral-900" />
                        ) : (
                            <span className="w-2 h-2 rounded-full bg-neutral-300" />
                        )}
                        Análisis de ingresos y evolución de ventas
                    </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap z-10">
                    <select aria-label="Seleccionar periodo de comparación" title="Comparativa" className="bg-white/60 backdrop-blur-md rounded-full px-4 py-2 border border-neutral-200/80 shadow-sm text-xs font-bold text-neutral-500 outline-none cursor-pointer hover:text-neutral-900 transition-colors focus:ring-2 focus:ring-neutral-200">
                        <option>vs Periodo Anterior</option>
                        <option>vs Mismo Periodo Año Pasado</option>
                    </select>

                    <div className="flex items-center bg-white/60 backdrop-blur-md rounded-full p-1 border border-neutral-200/80 shadow-sm relative">
                        <m.div 
                            className="absolute inset-y-1 bg-white rounded-full shadow-sm border border-neutral-200/50 transition-all duration-300 ease-out"
                            initial={false}
                            animate={{ 
                                left: viewMode === 'mes' ? '4px' : '50%', 
                                width: viewMode === 'mes' ? 'calc(50% - 4px)' : 'calc(50% - 4px)' 
                            }}
                        />
                        <button type="button" onClick={() => setViewMode('mes')}
                            className={cn("relative z-10 px-6 py-2 text-xs font-bold rounded-full transition-colors duration-300 w-24",
                                viewMode === 'mes' ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                            )}>Mes</button>
                        <button type="button" onClick={() => setViewMode('trimestre')}
                            className={cn("relative z-10 px-6 py-2 text-xs font-bold rounded-full transition-colors duration-300 w-28",
                                viewMode === 'trimestre' ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                            )}>Trimestre</button>
                    </div>

                    <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md rounded-full border border-neutral-200/80 shadow-sm p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-full transition-all" onClick={() => handlePeriodChange('prev')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-center min-w-[140px]">
                            {viewMode === 'mes' ? (
                                <span className="text-sm font-bold text-neutral-900 block capitalize">{monthName} <span className="text-neutral-400 font-medium ml-1">{year}</span></span>
                            ) : (
                                <span className="text-sm font-bold text-neutral-900 block">{quarter} <span className="text-neutral-400 font-medium ml-1">{year}</span></span>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-full transition-all" onClick={() => handlePeriodChange('next')}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {status === 'loading' && <BillingSkeleton key="loading" />}
                {status === 'empty' && <EmptyState key="empty" period={periodLabel} />}
                {status === 'success' && data && (
                    <m.div 
                        key="content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.5, staggerChildren: 0.1 }}
                        className="space-y-8"
                    >
                        <DashboardContent 
                            data={data} 
                            viewMode={viewMode} 
                            periodLabel={periodLabel} 
                            onOpenTargetModal={onOpenTargetModal}
                            onOpenDrillDown={() => onOpenDrillDown(data.dailyData)}
                            restaurantId={restaurantId}
                        />
                    </m.div>
                )}
            </AnimatePresence>

        </div>
    )
}

function DashboardContent({ data, viewMode, periodLabel, onOpenTargetModal, onOpenDrillDown, restaurantId }: { 
    data: BillingPeriodData, 
    viewMode: 'mes' | 'trimestre', 
    periodLabel: string, 
    onOpenTargetModal: () => void,
    onOpenDrillDown: () => void,
    restaurantId: string
}) {
    const { stats, prevPeriodStats, monthlyBreakdown, dailyData } = data

    const target = stats.revenue_target || 0
    const progress = target > 0 ? Math.min((stats.totalGross / target) * 100, 100) : 0
    const remaining = Math.max(target - stats.totalGross, 0)
    
    const calculatePct = (part: number, total: number) => total > 0 ? (part / total) * 100 : 0
    const cashPct = calculatePct(stats.cashTotal, stats.totalGross)
    const cardPct = calculatePct(stats.cardTotal, stats.totalGross)
    const prevAvgVar = prevPeriodStats.avgDaily > 0 ? ((stats.avgDaily - prevPeriodStats.avgDaily) / prevPeriodStats.avgDaily) * 100 : undefined

    const chartData = useMemo(() => {
        if (viewMode === 'trimestre' && monthlyBreakdown.length > 1) {
            return monthlyBreakdown.map(m => ({
                name: m.monthName.slice(0, 3),
                Bruta: m.gross,
                Neta: m.net,
            }))
        }
        return dailyData.map(d => ({
            name: format(parseISO(d.date), 'dd'),
            Bruta: d.totalRevenue,
            Neta: d.netRevenue,
        }))
    }, [viewMode, monthlyBreakdown, dailyData])

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                <MinimalKPI label="Facturación Bruta" value={stats.totalGross} subtext="IVA Incl." delay={0.1} />
                <PrimaryKPI label="Total Neto" value={stats.totalNet} subtext={`Retiene: ${formatCurrency(stats.totalIVA)}`} data={chartData} delay={0.2} />
                <StatusKPI label="Media Diaria" value={stats.avgDaily} variation={prevAvgVar} delay={0.3} />
                <StatusKPI label="Media Semanal" value={stats.avgWeekly} subtext="Flujo regular" delay={0.4} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <m.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                    className="lg:col-span-2 flex flex-col justify-between glass-card rounded-3xl p-6 md:p-8 border border-white/40"
                >
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-serif text-neutral-900 tracking-tight">Evolución de Ingresos</h3>
                            <p className="text-sm text-neutral-500 font-medium mt-1">Línea de tendencia de facturación - {periodLabel}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <button onClick={onOpenDrillDown} className="text-xs font-bold bg-neutral-900 text-white px-4 py-2 rounded-full hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md">
                                <List className="w-4 h-4" />
                                Ver Desglose Mensual
                            </button>
                            <div className="flex items-center gap-6 text-xs font-semibold text-neutral-500 bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />Bruto</span>
                                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-neutral-900" />Neto</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[320px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNeta" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#171717" stopOpacity={0.05}/>
                                        <stop offset="95%" stopColor="#171717" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorBruta" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f3f4f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#f3f4f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" opacity={0.5} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={50} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="Bruta" stroke="#e5e7eb" strokeWidth={2} fillOpacity={1} fill="url(#colorBruta)" activeDot={{ r: 4, fill: '#e5e7eb', stroke: '#fff', strokeWidth: 2 }} animationDuration={1500} />
                                <Area type="monotone" dataKey="Neta" stroke="#171717" strokeWidth={2} fillOpacity={1} fill="url(#colorNeta)" activeDot={{ r: 4, fill: '#171717', stroke: '#fff', strokeWidth: 2 }} animationDuration={1500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </m.div>

                <div className="lg:col-span-1 space-y-6 flex flex-col">
                    
                    <m.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
                        className="bg-white rounded-3xl p-6 sm:p-8 relative overflow-hidden flex-1 min-h-[240px] flex flex-col justify-between border border-neutral-200/60 shadow-sm"
                    >
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-neutral-400" />
                                <h4 className="font-bold text-xs uppercase tracking-widest text-neutral-500">Objetivo Ingresos</h4>
                            </div>
                            <button onClick={onOpenTargetModal} className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600">
                                Ajustar
                            </button>
                        </div>

                        <div className="relative z-10 mt-8">
                            <div className="flex items-end gap-3 mb-5">
                                <span className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none text-neutral-900 font-sans">
                                    {progress.toFixed(0)}<span className="text-2xl font-medium text-neutral-400">%</span>
                                </span>
                                <div className="pb-1 text-neutral-500 text-sm flex flex-col">
                                    <span className="text-[10px] uppercase tracking-widest text-neutral-400">Meta</span>
                                    <span className="font-semibold text-neutral-700">{formatCurrency(target)}</span>
                                </div>
                            </div>

                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                <m.div
                                    initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
                                    className="h-full bg-neutral-900 rounded-full"
                                />
                            </div>
                            
                            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mt-4 flex items-center justify-end gap-2">
                                {remaining > 0 ? (
                                    <>Restan <span className="text-neutral-700">{formatCurrency(remaining)}</span></>
                                ) : (
                                    <span className="text-neutral-800 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Meta superada</span>
                                )}
                            </p>
                        </div>
                    </m.div>

                    <m.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
                        className="rounded-3xl border border-neutral-200/60 p-6 sm:p-8 bg-white shadow-sm flex-1 hover-scale"
                    >
                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-neutral-400" /> Distribución de Pagos
                        </h4>
                        
                        <div className="space-y-6">
                            <div className="space-y-2 group">
                                <div className="flex justify-between items-center text-sm font-semibold">
                                    <span className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"><Banknote className="w-4 h-4 text-neutral-400" /> Efectivo</span>
                                    <span className="text-neutral-900 font-mono text-[14px]">{formatCurrency(stats.cashTotal)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                        <m.div 
                                            initial={{ width: 0 }} animate={{ width: `${cashPct}%` }} transition={{ duration: 1, delay: 0.8 }}
                                            className="h-full bg-neutral-300 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400 w-10 text-right">{cashPct.toFixed(0)}%</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2 group">
                                <div className="flex justify-between items-center text-sm font-semibold">
                                    <span className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"><CreditCard className="w-4 h-4 text-neutral-400" /> Tarjeta</span>
                                    <span className="text-neutral-900 font-mono text-[14px]">{formatCurrency(stats.cardTotal)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                        <m.div 
                                            initial={{ width: 0 }} animate={{ width: `${cardPct}%` }} transition={{ duration: 1.2, delay: 0.8 }}
                                            className="h-full bg-neutral-800 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400 w-10 text-right">{cardPct.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-5 border-t border-neutral-100 flex items-center justify-between text-xs font-medium">
                            <span className="text-neutral-500 uppercase tracking-widest text-[10px] font-bold">Mismo periodo ant.</span>
                            <span className="text-neutral-900 font-bold">{formatCurrency(prevPeriodStats.totalNet)}</span>
                        </div>
                    </m.div>
                </div>
            </div>

            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}>
                <m.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onOpenDrillDown}
                    className="w-full bg-white border border-neutral-200/80 hover:border-primary/30 rounded-3xl p-5 sm:p-6 flex items-center justify-between transition-all shadow-sm hover:shadow-md group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center group-hover:bg-primary group-hover:shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all duration-300">
                            <BarChart3 className="w-6 h-6 text-neutral-500 group-hover:text-white transition-colors" />
                        </div>
                        <div className="text-left">
                            <span className="block font-bold text-lg text-neutral-900 tracking-tight group-hover:text-primary transition-colors">Auditoría Detallada</span>
                            <span className="block text-[13px] text-neutral-500 font-medium mt-0.5">Explora las transacciones, gastos y evolución diaria a fondo.</span>
                        </div>
                    </div>
                    <div className="relative z-10 h-10 w-10 rounded-full border border-neutral-100 flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                        <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                    </div>
                </m.button>
            </m.div>

            {/* Google Drive Inbox Panel */}
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.5 }}>
                <DriveInboxPanel restaurantId={restaurantId} />
            </m.div>

            {/* AI Insights Panel */}
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}>
                <AiInsightsPanel 
                    restaurantId={restaurantId}
                    moduleName="Facturación"
                    periodKey={periodLabel}
                    metricsData={{
                        totalGross: stats.totalGross,
                        totalNet: stats.totalNet,
                        avgDaily: stats.avgDaily,
                        progressTarget: (data.stats.revenue_target || 0) > 0 ? (stats.totalGross / (data.stats.revenue_target || 1)) * 100 : 0
                    }}
                />
            </m.div>
        </>
    )
}

function PrimaryKPI({ label, value, subtext, data, delay = 0 }: { label: string, value: number, subtext: string, data: Record<string, string | number>[], delay?: number }) {
    return (
        <m.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay, type: "spring", stiffness: 100 }}
            className="bg-white rounded-3xl p-6 flex flex-col relative overflow-hidden shadow-sm border border-neutral-200/60 h-full"
        >
            <div className="absolute bottom-0 left-0 right-0 h-[50%] opacity-40 pointer-events-none origin-bottom translate-y-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <Line type="basis" dataKey="Neta" stroke="#94a3b8" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={2000} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{label}</h5>
                <div className="mt-4 mb-2">
                    <span className="text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight font-sans">
                        {formatCurrency(value)}
                    </span>
                </div>
                <div className="mt-auto pt-4 border-t border-neutral-100">
                    <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{subtext}</span>
                </div>
            </div>
        </m.div>
    )
}

function MinimalKPI({ label, value, subtext, delay = 0 }: { label: string, value: number, subtext: string, delay?: number }) {
    return (
        <m.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
            className="p-6 flex flex-col justify-end h-full border-b-2 sm:border-b-0 sm:border-r-2 border-neutral-200/60"
        >
            <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{label}</h5>
            <span className="text-2xl font-semibold text-neutral-900 tracking-tight font-sans">
                {formatCurrency(value)}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium mt-1">{subtext}</span>
        </m.div>
    )
}

function StatusKPI({ label, value, variation, subtext, delay = 0 }: { label: string, value: number, variation?: number, subtext?: string, delay?: number }) {
    const isPositive = variation !== undefined && variation >= 0;
    return (
        <m.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay, type: "spring", stiffness: 100 }}
            className="bg-neutral-50/50 rounded-2xl p-5 flex flex-col justify-between border border-neutral-200/50 h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-tight w-2/3">{label}</h5>
                {variation !== undefined ? (
                    <div className={cn(
                        "flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md",
                        isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(variation).toFixed(1)}%
                    </div>
                ): (
                    <div className="text-neutral-300">
                        <Activity className="w-4 h-4" />
                    </div>
                )}
            </div>
            <div>
                <span className="text-xl font-semibold text-neutral-900 tracking-tight">
                    {formatCurrency(value)}
                </span>
                {subtext && <div className="text-[10px] text-neutral-400 mt-1 font-medium uppercase tracking-wider">{subtext}</div>}
            </div>
        </m.div>
    )
}

function CustomTooltip({ active, payload, label }: { active?: boolean, payload?: Array<{ dataKey: string; value: number }>, label?: string }) {
    if (active && payload && payload.length) {
        const gross = payload.find(p => p.dataKey === 'Bruta')?.value || 0
        const net = payload.find(p => p.dataKey === 'Neta')?.value || 0
        
        return (
            <div className="glass-premium bg-white/90 backdrop-blur-xl border border-neutral-200/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl p-4 min-w-[180px]">
                <p className="text-[10px] font-bold text-neutral-400 mb-3 uppercase tracking-[0.2em] border-b border-neutral-100 pb-2">{label}</p>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm gap-6">
                        <span className="flex items-center gap-2 font-medium text-neutral-500"><div className="w-2.5 h-2.5 rounded-[4px] bg-neutral-300" /> Bruta</span>
                        <span className="font-bold text-neutral-900 font-mono">{formatCurrency(gross)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-6">
                        <span className="flex items-center gap-2 font-medium text-slate-700"><div className="w-2.5 h-2.5 rounded-[4px] bg-slate-900 shadow-[0_0_8px_rgba(15,23,42,0.4)]" /> Neta</span>
                        <span className="font-bold text-neutral-900 font-mono">{formatCurrency(net)}</span>
                    </div>
                </div>
            </div>
        )
    }
    return null
}

function BillingSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-4 p-6 bg-white/50 border border-neutral-100 rounded-3xl h-[160px]">
                        <div className="h-3 w-24 bg-neutral-200 rounded-full" />
                        <div className="h-10 sm:h-12 w-3/4 bg-neutral-200 rounded-lg mt-2" />
                        <div className="h-3 w-1/2 bg-neutral-100 rounded-full mt-auto" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-[400px] bg-white/50 border border-neutral-100 rounded-3xl" />
                <div className="lg:col-span-1 space-y-6">
                    <div className="h-[240px] bg-zinc-900/40 rounded-3xl" />
                    <div className="h-[220px] bg-white/50 border border-neutral-100 rounded-3xl" />
                </div>
            </div>
        </div>
    )
}

function EmptyState({ period }: { period: string }) {
    return (
        <m.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-28 px-4 text-center glass-card rounded-3xl border border-neutral-200/50"
        >
            <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-neutral-100 rotate-3">
                <FileX className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-2xl font-serif text-neutral-900 tracking-tight">Datos no disponibles</h3>
            <p className="text-[15px] font-medium text-neutral-500 mt-2 max-w-sm leading-relaxed">
                No hemos recibido registros de facturación ni subidas desde la pasarela para <strong className="text-neutral-700">{period}</strong>.
            </p>
        </m.div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <m.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-[500px] gap-5 glass-card rounded-3xl border border-rose-100/50 bg-rose-50/30"
        >
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-rose-100 animate-pulse-subtle">
                <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="text-center">
                <h3 className="text-xl font-serif text-neutral-900">Problemas de conexión</h3>
                <p className="text-[15px] text-neutral-500 mt-2">No se pudo recuperar la facturación desde el servidor.</p>
            </div>
            <Button variant="outline" onClick={onRetry} className="mt-4 font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl px-6">
                Intentar de nuevo
            </Button>
        </m.div>
    )
}
