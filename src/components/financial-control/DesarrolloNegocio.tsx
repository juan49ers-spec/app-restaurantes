"use client"

import { useMemo, memo } from "react"
import { m } from "framer-motion"
import {
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    Line,
    ComposedChart,
    Area
} from "recharts"
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Target,
    Info,
    ArrowRight,
    Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

// ==========================================
// TYPES
// ==========================================

interface DesarrolloNegocioProps {
    data: {
        months: string[]
        ingresos: number[]
    }
    currentMonthIndex: number
    // Datos opcionales para análisis avanzado
    lastYearData?: {
        months: string[]
        ingresos: number[]
    }
    targets?: {
        monthly: number
        annual: number
    }
}

interface ChartDataPoint {
    month: string
    ingresos: number
    ingresosLastYear?: number
    isCurrent: boolean
    isProjected: boolean
    variation: number
    variationYoY?: number
    season: 'high' | 'medium' | 'low'
    trend: number
}

// ==========================================
// UTILITIES
// ==========================================

const formatCurrency = (val: number): string =>
    new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val)

const formatPercent = (val: number): string =>
    `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`

// Calcular tendencia (media móvil de 3 meses)
const calculateTrend = (data: number[], index: number): number => {
    if (index < 2) return data[index]
    const sum = data[index] + data[index - 1] + data[index - 2]
    return sum / 3
}

// Detectar temporada
const getSeason = (monthIndex: number): 'high' | 'medium' | 'low' => {
    // Junio, Julio, Agosto = Alta temporada
    // Mayo, Septiembre, Diciembre = Media
    // Resto = Baja
    const highSeason = [5, 6, 7] // Jun, Jul, Ago (0-indexed)
    const mediumSeason = [4, 8, 11] // May, Sep, Dic

    if (highSeason.includes(monthIndex)) return 'high'
    if (mediumSeason.includes(monthIndex)) return 'medium'
    return 'low'
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

// Indicador de métrica
const MetricCard = memo(function MetricCard({
    label,
    value,
    trend,
    icon: Icon,
    color = "neutral"
}: {
    label: string
    value: string
    trend?: number
    icon: React.ElementType
    color?: "neutral" | "success" | "warning" | "danger"
}) {
    const colors = {
        neutral: "bg-slate-50 border-slate-200",
        success: "bg-emerald-50 border-emerald-200",
        warning: "bg-amber-50 border-amber-200",
        danger: "bg-rose-50 border-rose-200"
    }

    return (
        <div className={cn("p-3 rounded-xl border", colors[color])}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-600">{label}</span>
            </div>
            <p className="text-lg font-bold text-neutral-900">{value}</p>
            {trend !== undefined && (
                <p className={cn(
                    "text-xs font-medium",
                    trend >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                    {formatPercent(trend)} vs anterior
                </p>
            )}
        </div>
    )
})

interface CustomTooltipProps {
    active?: boolean
    payload?: Array<{ payload: ChartDataPoint }>
    label?: string
}

// Tooltip personalizado para el gráfico
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as ChartDataPoint

        return (
            <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                <p className="font-bold text-neutral-900 mb-2">{label}</p>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Ingresos:</span>
                        <span className="font-bold text-neutral-900">{formatCurrency(data.ingresos)}</span>
                    </div>

                    {data.ingresosLastYear && (
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Año ant.:</span>
                            <span className="font-medium text-neutral-700">{formatCurrency(data.ingresosLastYear)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Variación:</span>
                        <span className={cn(
                            "font-medium",
                            data.variation >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {formatPercent(data.variation)}
                        </span>
                    </div>

                    {data.variationYoY !== undefined && (
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-600">vs Año Ant.:</span>
                            <span className={cn(
                                "font-medium",
                                data.variationYoY >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {formatPercent(data.variationYoY)}
                            </span>
                        </div>
                    )}

                    <div className="pt-2 border-t border-neutral-100">
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                data.season === 'high' && "bg-emerald-500",
                                data.season === 'medium' && "bg-amber-500",
                                data.season === 'low' && "bg-blue-500"
                            )} />
                            <span className="text-xs text-neutral-500">
                                {data.season === 'high' && "Temporada Alta"}
                                {data.season === 'medium' && "Temporada Media"}
                                {data.season === 'low' && "Temporada Baja"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    return null
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function DesarrolloNegocio({
    data,
    currentMonthIndex,
    lastYearData,
    targets
}: DesarrolloNegocioProps) {

    // Preparar datos del gráfico con análisis enriquecido
    const chartData: ChartDataPoint[] = useMemo(() => {
        return data.months.map((month, idx) => {
            const currentValue = data.ingresos[idx]
            const lastYearValue = lastYearData?.ingresos[idx]

            // Calcular variación vs mes anterior
            const variation = idx > 0 && data.ingresos[idx - 1] > 0
                ? ((currentValue - data.ingresos[idx - 1]) / data.ingresos[idx - 1]) * 100
                : 0

            // Calcular variación vs año anterior
            const variationYoY = lastYearValue && lastYearValue > 0
                ? ((currentValue - lastYearValue) / lastYearValue) * 100
                : undefined

            // Detectar temporada (usando índice real del mes asumiendo enero=0)
            // En producción, esto vendría de los datos reales
            const monthIndex = idx % 12

            return {
                month,
                ingresos: currentValue,
                ingresosLastYear: lastYearValue,
                isCurrent: idx === currentMonthIndex,
                isProjected: idx > currentMonthIndex,
                variation,
                variationYoY,
                season: getSeason(monthIndex),
                trend: calculateTrend(data.ingresos, idx)
            }
        })
    }, [data, currentMonthIndex, lastYearData])

    // Calcular métricas inteligentes
    const metrics = useMemo(() => {
        const current = data.ingresos[currentMonthIndex]
        const previous = currentMonthIndex > 0 ? data.ingresos[currentMonthIndex - 1] : current
        const lastYear = lastYearData?.ingresos[currentMonthIndex]

        // Media del último trimestre
        const lastQuarter = data.ingresos.slice(-3)
        const avgLastQuarter = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length

        // Tendencia (pendiente de regresión lineal simple)
        const n = data.ingresos.length
        const sumX = data.ingresos.reduce((sum, _, i) => sum + i, 0)
        const sumY = data.ingresos.reduce((sum, val) => sum + val, 0)
        const sumXY = data.ingresos.reduce((sum, val, i) => sum + i * val, 0)
        const sumX2 = data.ingresos.reduce((sum, _, i) => sum + i * i, 0)
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

        // Proyección siguiente mes
        const projection = current + slope

        return {
            current,
            previous,
            lastYear,
            avgLastQuarter,
            momChange: previous > 0 ? ((current - previous) / previous) * 100 : 0,
            yoyChange: lastYear && lastYear > 0 ? ((current - lastYear) / lastYear) * 100 : undefined,
            trend: slope,
            projection,
            totalAnnual: data.ingresos.reduce((a, b) => a + b, 0)
        }
    }, [data, currentMonthIndex, lastYearData])

    // Insights automáticos
    const insights = (() => {
        const items = []

        // Insight 1: Tendencia general
        if (metrics.trend > 500) {
            items.push({
                type: 'positive' as const,
                icon: TrendingUp,
                text: `Tendencia alcista: +${formatCurrency(metrics.trend)}/mes`
            })
        } else if (metrics.trend < -500) {
            items.push({
                type: 'negative' as const,
                icon: TrendingDown,
                text: `Tendencia a la baja: ${formatCurrency(metrics.trend)}/mes`
            })
        }

        // Insight 2: Comparativa año anterior
        if (metrics.yoyChange !== undefined) {
            if (metrics.yoyChange > 15) {
                items.push({
                    type: 'positive' as const,
                    icon: Zap,
                    text: `Crecimiento fuerte vs año anterior (${formatPercent(metrics.yoyChange)})`
                })
            } else if (metrics.yoyChange < -10) {
                items.push({
                    type: 'warning' as const,
                    icon: Info,
                    text: `Por debajo del año anterior (${formatPercent(metrics.yoyChange)})`
                })
            }
        }

        // Insight 3: Proyección
        if (metrics.projection > metrics.current * 1.05) {
            items.push({
                type: 'info' as const,
                icon: Target,
                text: `Proyección próximo mes: ${formatCurrency(metrics.projection)}`
            })
        }

        return items
    })()

    return (
        <div className="space-y-4">
            {/* Header con insights */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neutral-600" />
                    <h3 className="font-bold text-lg text-neutral-900">Evolución del Negocio</h3>
                </div>

                {insights.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end">
                        {insights.slice(0, 2).map((insight, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                                    insight.type === 'positive' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                    insight.type === 'negative' && "bg-rose-50 text-rose-700 border border-rose-200",
                                    insight.type === 'warning' && "bg-amber-50 text-amber-700 border border-amber-200",
                                    insight.type === 'info' && "bg-blue-50 text-blue-700 border border-blue-200"
                                )}
                            >
                                <insight.icon className="w-3.5 h-3.5" />
                                {insight.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Métricas clave */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    label="Mes Actual"
                    value={formatCurrency(metrics.current)}
                    trend={metrics.momChange}
                    icon={Calendar}
                    color={metrics.momChange >= 0 ? "success" : "danger"}
                />
                <MetricCard
                    label="vs Año Ant."
                    value={metrics.yoyChange !== undefined ? formatPercent(metrics.yoyChange) : "N/A"}
                    icon={ArrowRight}
                    color={metrics.yoyChange && metrics.yoyChange >= 0 ? "success" : metrics.yoyChange ? "danger" : "neutral"}
                />
                <MetricCard
                    label="Media Trimestre"
                    value={formatCurrency(metrics.avgLastQuarter)}
                    icon={Target}
                />
                <MetricCard
                    label="Proyección"
                    value={formatCurrency(metrics.projection)}
                    icon={Zap}
                    color={metrics.projection > metrics.current ? "success" : "warning"}
                />
            </div>

            {/* Gráfico avanzado */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                tickFormatter={(value) => `€${value / 1000}k`}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            {/* Línea de objetivo */}
                            {targets?.monthly && (
                                <ReferenceLine
                                    y={targets.monthly}
                                    stroke="#10b981"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    label={{
                                        value: "Objetivo",
                                        position: "right",
                                        fill: "#10b981",
                                        fontSize: 11
                                    }}
                                />
                            )}

                            {/* Línea de tendencia */}
                            <Line
                                type="monotone"
                                dataKey="trend"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="5 5"
                            />

                            {/* Barras de ingresos */}
                            <Bar dataKey="ingresos" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.isCurrent
                                            ? '#3b82f6'
                                            : entry.season === 'high'
                                                ? '#10b981'
                                                : entry.season === 'medium'
                                                    ? '#f59e0b'
                                                    : '#6b7280'
                                        }
                                        fillOpacity={entry.isProjected ? 0.5 : 1}
                                    />
                                ))}
                            </Bar>

                            {/* Área de año anterior */}
                            {lastYearData && (
                                <Area
                                    type="monotone"
                                    dataKey="ingresosLastYear"
                                    stroke="#9ca3af"
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    fill="transparent"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Leyenda inteligente */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-500 rounded" />
                        <span>Mes actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-emerald-500 rounded" />
                        <span>Temp. Alta</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-amber-500 rounded" />
                        <span>Temp. Media</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-gray-400 rounded" />
                        <span>Temp. Baja</span>
                    </div>
                    <div className="flex items-center gap-1.5">

                        <div className="w-4 h-0.5 bg-violet-500 border-t-2 border-dashed border-violet-500" />
                        <span>Tendencia</span>
                    </div>
                    {targets && (
                        <div className="flex items-center gap-1.5">

                            <div className="w-4 h-0.5 bg-emerald-500 border-t-2 border-dashed border-emerald-500" />
                            <span>Objetivo</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Resumen anual */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Total Acumulado</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalAnnual)}</p>
                    </div>

                    {targets?.annual && (
                        <div className="text-right">
                            <p className="text-xs text-slate-600">vs Objetivo Anual</p>
                            <p className={cn(
                                "text-lg font-bold",
                                metrics.totalAnnual >= targets.annual ? "text-emerald-600" : "text-amber-600"
                            )}>
                                {((metrics.totalAnnual / targets.annual) * 100).toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-500">
                                Meta: {formatCurrency(targets.annual)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Barra de progreso */}
                {targets?.annual && (
                    <div className="mt-3">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <m.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((metrics.totalAnnual / targets.annual) * 100, 100)}%` }}
                                transition={{ duration: 1 }}
                                className={cn(
                                    "h-full rounded-full",
                                    metrics.totalAnnual >= targets.annual ? "bg-emerald-500" : "bg-blue-500"
                                )}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
