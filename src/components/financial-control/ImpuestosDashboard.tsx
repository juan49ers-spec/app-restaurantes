"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { IVATable } from "./IVATable"
import { IRPTable } from "./IRPTable"
import { Download, ChevronLeft, ChevronRight, FileText, Loader2, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { getQuarterlyFiscalData, getMonthlyFiscalData, QuarterlyFiscalData, getAnnualISData, AnnualISData } from "@/app/actions/financial-control"
import { m } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { cn } from "@/lib/utils"

interface ImpuestosDashboardProps {
    restaurantId: string;
}

export function ImpuestosDashboard({ restaurantId }: ImpuestosDashboardProps) {
    const [date, setDate] = useState(() => new Date())
    const [viewMode, setViewMode] = useState<'mes' | 'trimestre'>('trimestre')
    const [data, setData] = useState<QuarterlyFiscalData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [annualISData, setAnnualISData] = useState<AnnualISData | null>(null)
    const [isRate, setIsRate] = useState<0.25 | 0.15>(0.25)

    const year = date.getFullYear()
    const currentMonth = date.getMonth()  // 0-indexed
    const monthNum = currentMonth + 1     // 1-indexed
    const quarterNum = Math.floor(currentMonth / 3) + 1
    const quarter = `Q${quarterNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4'
    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date)
    const periodLabel = viewMode === 'mes'
        ? `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
        : `${quarter} ${year}`

    useEffect(() => {
        let isMounted = true
        setIsLoading(true)
        const fetchFiscal = viewMode === 'mes'
            ? getMonthlyFiscalData(restaurantId, year, monthNum)
            : getQuarterlyFiscalData(restaurantId, year, quarterNum)

        Promise.all([fetchFiscal, getAnnualISData(restaurantId, year)])
            .then(([fiscalRes, annualRes]) => {
                if (isMounted) {
                    setData(fiscalRes)
                    setAnnualISData(annualRes)
                }
            })
            .catch(err => {
                console.error("Failed to load fiscal data:", err)
            })
            .finally(() => {
                if (isMounted) setIsLoading(false)
            })

        return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId, year, monthNum, quarterNum, viewMode])

    const handlePeriodChange = (direction: 'prev' | 'next') => {
        setDate(prev => {
            const newDate = new Date(prev)
            const delta = viewMode === 'mes' ? 1 : 3
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -delta : delta))
            return newDate
        })
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                <p className="text-sm text-neutral-500">Cargando datos fiscales...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Obligaciones Fiscales</h2>
                        <p className="text-sm text-neutral-500 mt-1">Gestión y control de tributos trimestrales</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* View mode toggle */}
                    <div className="flex items-center bg-white rounded-lg border border-neutral-200 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setViewMode('mes')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                viewMode === 'mes'
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            Mes
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('trimestre')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                viewMode === 'trimestre'
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            Trimestre
                        </button>
                    </div>

                    {/* Period navigator */}
                    <div className="flex items-center bg-white rounded-lg border border-neutral-200 p-1 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-neutral-100 rounded-md"
                            onClick={() => handlePeriodChange('prev')}
                        >
                            <ChevronLeft className="h-4 w-4 text-neutral-600" />
                        </Button>
                        <div className="px-4 text-center min-w-[90px]">
                            {viewMode === 'mes' ? (
                                <>
                                    <span className="text-sm font-bold text-neutral-900 block leading-none capitalize">{monthName}</span>
                                    <span className="text-[10px] font-medium text-neutral-500 block leading-none mt-0.5">{year}</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm font-bold text-neutral-900 block leading-none">{quarter}</span>
                                    <span className="text-[10px] font-medium text-neutral-500 block leading-none mt-0.5">{year}</span>
                                </>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-neutral-100 rounded-md"
                            onClick={() => handlePeriodChange('next')}
                        >
                            <ChevronRight className="h-4 w-4 text-neutral-600" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold h-9 bg-white shadow-sm border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900">
                        <Download className="w-3.5 h-3.5" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Calendario Fiscal */}
            <FiscalCalendar year={year} activeQuarter={quarter} />

            {/* Gráfica IVA trimestral */}
            {data && data.ivaByMonth.length > 0 && (
                <IVAChart data={data.ivaByMonth} periodLabel={periodLabel} />
            )}

            {/* Row 2: Detail Tables (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="min-h-[200px]">
                    <IVATable periodLabel={periodLabel} data={data?.ivaByMonth || []} />
                </div>
                <div className="min-h-[200px]">
                    <IRPTable periodLabel={periodLabel} data={data?.irpfByConcept || []} />
                </div>
            </div>

            {/* Impuesto de Sociedades */}
            {annualISData && (
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-neutral-900">Impuesto de Sociedades {annualISData.year}</h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                {annualISData.isYTD
                                    ? `Proyección acumulada · ${annualISData.monthsClosed} de 12 meses cerrados`
                                    : `Ejercicio completo · ${annualISData.monthsClosed} meses`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-600">Tipo impositivo:</span>
                            <select
                                value={isRate}
                                onChange={e => setIsRate(Number(e.target.value) as 0.25 | 0.15)}
                                aria-label="Tipo impositivo del Impuesto de Sociedades"
                                className="text-xs font-semibold border border-neutral-200 rounded-md px-2.5 py-1.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300 cursor-pointer"
                            >
                                <option value={0.25}>25% — Tipo general</option>
                                <option value={0.15}>15% — Empresa de nueva creación</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-neutral-50 rounded-lg p-3">
                            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Ingresos netos</p>
                            <p className="text-sm font-bold text-neutral-900">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(annualISData.totalIngresos)}
                            </p>
                        </div>
                        <div className="bg-neutral-50 rounded-lg p-3">
                            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">Gastos deducibles</p>
                            <p className="text-sm font-bold text-neutral-900">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(annualISData.totalGastos)}
                            </p>
                        </div>
                        <div className={`rounded-lg p-3 ${annualISData.bai >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">BAI</p>
                            <p className={`text-sm font-bold ${annualISData.bai >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(annualISData.bai)}
                            </p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3">
                            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">
                                Cuota IS ({(isRate * 100).toFixed(0)}%)
                            </p>
                            <p className="text-sm font-bold text-amber-700">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.max(0, annualISData.bai * isRate))}
                            </p>
                        </div>
                    </div>

                    {annualISData.bai > 0 && (
                        <div className="border-t border-neutral-100 pt-4">
                            <p className="text-xs font-semibold text-neutral-600 mb-2">Pagos fraccionados estimados (art. 40 LIS)</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { plazo: '1er pago · Abril', pct: '18%' },
                                    { plazo: '2o pago · Octubre', pct: '18%' },
                                    { plazo: '3er pago · Diciembre', pct: '18%' }
                                ].map(p => (
                                    <div key={p.plazo} className="flex flex-col gap-0.5 bg-neutral-50 rounded-lg p-3">
                                        <span className="text-[10px] text-neutral-500">{p.plazo}</span>
                                        <span className="text-xs font-bold text-neutral-800">
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.max(0, annualISData.bai * isRate * 0.18))}
                                        </span>
                                        <span className="text-[10px] text-neutral-400">{p.pct} cuota</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer info */}
            <div className="flex items-center justify-center gap-2 py-4">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-400 text-center">
                    Los cálculos son estimaciones basadas en la información registrada. Consulta siempre con tu asesor fiscal.
                </p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// FISCAL CALENDAR
// ─────────────────────────────────────────────

const DEADLINES = [
    { q: 'Q1', label: 'Q1 · Ene–Mar', models: 'M.303 + M.111', month: 3, day: 20, color: 'blue', nextYear: false },
    { q: 'Q2', label: 'Q2 · Abr–Jun', models: 'M.303 + M.111', month: 6, day: 20, color: 'violet', nextYear: false },
    { q: 'Q3', label: 'Q3 · Jul–Sep', models: 'M.303 + M.111', month: 9, day: 20, color: 'amber', nextYear: false },
    { q: 'Q4', label: 'Q4 · Oct–Dic', models: 'M.303 + M.111', month: 0, day: 30, color: 'rose', nextYear: true },
] as const

type DeadlineColor = 'blue' | 'violet' | 'amber' | 'rose'

const colorMap: Record<DeadlineColor, { dot: string; ring: string; bg: string; text: string; badge: string }> = {
    blue:   { dot: 'bg-blue-500',   ring: 'ring-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
    violet: { dot: 'bg-violet-500', ring: 'ring-violet-200', bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
    amber:  { dot: 'bg-amber-500',  ring: 'ring-amber-200',  bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' },
    rose:   { dot: 'bg-rose-500',   ring: 'ring-rose-200',   bg: 'bg-rose-50',   text: 'text-rose-700',   badge: 'bg-rose-100 text-rose-700' },
}

function FiscalCalendar({ year, activeQuarter }: { year: number; activeQuarter: string }) {
    const today = new Date()

    const deadlines = useMemo(() => DEADLINES.map(d => {
        const deadlineYear = d.nextYear ? year + 1 : year
        const deadline = new Date(deadlineYear, d.month, d.day)
        const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
        const isPast = daysLeft < 0
        const isImminent = !isPast && daysLeft <= 15
        const isActive = d.q === activeQuarter

        let status: 'past' | 'imminent' | 'upcoming' | 'active'
        if (isPast) status = 'past'
        else if (isActive) status = 'active'
        else if (isImminent) status = 'imminent'
        else status = 'upcoming'

        return { ...d, deadline, daysLeft, isPast, isImminent, isActive, status }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [year, activeQuarter])

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-bold text-neutral-900">Calendario Fiscal {year}</h3>
                <span className="text-xs text-neutral-400">Vencimientos trimestrales</span>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Línea conectora */}
                <div className="absolute top-5 left-6 right-6 h-px bg-neutral-200 hidden sm:block" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {deadlines.map((d, i) => {
                        const c = colorMap[d.color]
                        return (
                            <m.div
                                key={d.q}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.08 }}
                                className={cn(
                                    "relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                                    d.status === 'past' && "opacity-50 border-neutral-100 bg-neutral-50",
                                    d.status === 'active' && `${c.bg} border-current ring-2 ${c.ring}`,
                                    d.status === 'imminent' && "border-amber-200 bg-amber-50",
                                    d.status === 'upcoming' && "border-neutral-200 bg-white hover:border-neutral-300"
                                )}
                            >
                                {/* Dot */}
                                <div className={cn(
                                    "relative w-10 h-10 rounded-full flex items-center justify-center z-10",
                                    d.status === 'past' ? "bg-neutral-200" : c.bg
                                )}>
                                    {d.status === 'past' && <CheckCircle2 className="w-5 h-5 text-neutral-400" />}
                                    {d.status === 'imminent' && (
                                        <>
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                            <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
                                        </>
                                    )}
                                    {d.status === 'active' && (
                                        <>
                                            <Clock className={cn("w-5 h-5", c.text)} />
                                            <span className={cn("absolute inset-0 rounded-full animate-ping opacity-30", c.dot)} />
                                        </>
                                    )}
                                    {d.status === 'upcoming' && <Clock className="w-5 h-5 text-neutral-400" />}
                                </div>

                                {/* Info */}
                                <div className="text-center">
                                    <p className={cn("text-xs font-bold", d.status === 'past' ? "text-neutral-400" : c.text)}>
                                        {d.label}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 mt-0.5">{d.models}</p>
                                    <p className="text-[10px] font-semibold text-neutral-700 mt-1">
                                        {d.day}/{(d.nextYear ? 1 : d.month + 1).toString().padStart(2, '0')}
                                        /{d.nextYear ? year + 1 : year}
                                    </p>
                                </div>

                                {/* Badge estado */}
                                {d.status === 'past' && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500">Presentado</span>
                                )}
                                {d.status === 'imminent' && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        {d.daysLeft}d restantes
                                    </span>
                                )}
                                {d.status === 'active' && (
                                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", c.badge)}>
                                        {d.daysLeft > 0 ? `${d.daysLeft}d para vencer` : 'Hoy vence'}
                                    </span>
                                )}
                                {d.status === 'upcoming' && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                                        En {Math.ceil(d.daysLeft / 30)}m
                                    </span>
                                )}
                            </m.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// IVA QUARTERLY CHART
// ─────────────────────────────────────────────

const fmt = (v: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

function IVAChart({ data, periodLabel }: {
    data: QuarterlyFiscalData['ivaByMonth']
    periodLabel: string
}) {
    const chartData = data.map(row => ({
        name: row.month.charAt(0).toUpperCase() + row.month.slice(1, 3),
        Devengado: row.ivaDevengado,
        Soportado: row.ivaDeducible,
        Neto: row.ivaDevengado - row.ivaDeducible,
    }))

    const hasValues = chartData.some(d => d.Devengado > 0 || d.Soportado > 0)
    if (!hasValues) return null

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-neutral-900">IVA — {periodLabel}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Devengado · Soportado · Resultado neto</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Devengado</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />Soportado</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Neto a pagar</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={36} />
                    <Tooltip
                        formatter={(value: number | string | undefined) => value != null && typeof value === 'number' ? fmt(value) : String(value ?? '')}
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        labelStyle={{ fontWeight: 700, color: '#111827' }}
                    />
                    <Bar dataKey="Devengado" fill="#10b981" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill="#10b981" />)}
                    </Bar>
                    <Bar dataKey="Soportado" fill="#f87171" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill="#f87171" />)}
                    </Bar>
                    <Bar dataKey="Neto" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.Neto >= 0 ? '#3b82f6' : '#a78bfa'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
