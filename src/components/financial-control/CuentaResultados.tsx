"use client"

import { useState, useMemo, memo } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
    Calculator
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/Tooltip"

// ==========================================
// TYPES
// ==========================================

interface CuentaResultadosProps {
    data: {
        ingresosNetos: number
        ingresosExtra: number
        personal: {
            total: number
            sueldosNetos: number
            seguridadSocial: number
            irpf: number
        }
        materiaPrima: {
            total: number
            comida: number
            bebida: number
            variacionExistencias: number
        }
        suministros: number
        mantenimiento: number
        marketing: number
        gastosExtra: number
        inversiones: number
        financiaciones: number
        resultadoNeto: number
    }
    /** Si se proporciona, se usa directamente en vez de recalcular ingresosNetos+ingresosExtra.
     *  Previene discrepancias si la BD tiene un total_ingresos diferente de la suma de partes. */
    totalIngresos?: number
    benchmarks?: {
        personalPct?: number
        materiaPrimaPct?: number
        margenNeto?: number
    }
}

interface LineItem {
    id: string
    label: string
    value: number
    type: 'income' | 'expense' | 'subtotal' | 'total'
    category?: 'operating' | 'capex' | 'financial'
    expandable?: boolean
    children?: LineItem[]
    benchmark?: { value: number; label: string }
    tooltip?: string
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

// ==========================================
// SUB-COMPONENTS
// ==========================================

// Barra visual de proporción
const ProportionBar = memo(function ProportionBar({
    value,
    total,
    color = "neutral"
}: {
    value: number
    total: number
    color?: "neutral" | "danger" | "warning" | "success"
}) {
    const percentage = total > 0 ? Math.min((Math.abs(value) / total) * 100, 100) : 0

    const colors = {
        neutral: "bg-neutral-300",
        danger: "bg-rose-400",
        warning: "bg-amber-400",
        success: "bg-emerald-400"
    }

    return (
        <div className="w-16 h-1 bg-neutral-100 rounded-full overflow-hidden">
            <m.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn("h-full rounded-full", colors[color])}
            />
        </div>
    )
})

// Fila individual con tooltip inline
const ResultRow = memo(function ResultRow({
    item,
    totalIngresos,
    depth = 0,
    isExpanded,
    onToggle
}: {
    item: LineItem
    totalIngresos: number
    depth?: number
    isExpanded?: boolean
    onToggle?: () => void
}) {
    const isNegative = item.value < 0
    const percentage = totalIngresos > 0 ? (Math.abs(item.value) / totalIngresos) * 100 : 0

    const getRowColor = () => {
        if (item.type === 'total') return "bg-neutral-900 text-white"
        if (item.type === 'subtotal') return "bg-neutral-50 font-semibold"
        if (item.type === 'income') return "hover:bg-emerald-50/50"
        if (isNegative && percentage > 35) return "hover:bg-rose-50/30"
        return "hover:bg-neutral-50"
    }

    const getValueColor = () => {
        if (item.type === 'total') return "text-white"
        if (item.type === 'subtotal') return "text-neutral-900"
        if (item.type === 'income') return "text-emerald-600"
        if (isNegative) return "text-rose-600"
        return "text-neutral-700"
    }

    const benchmarkStatus = useMemo(() => {
        if (!item.benchmark || item.type !== 'expense') return null
        const diff = percentage - item.benchmark.value
        if (Math.abs(diff) < 2) return { status: 'ok', icon: CheckCircle2, color: 'text-emerald-500' }
        if (diff > 5) return { status: 'high', icon: AlertCircle, color: 'text-rose-500' }
        return { status: 'warning', icon: AlertCircle, color: 'text-amber-500' }
    }, [item.benchmark, percentage, item.type])

    return (
        <m.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div
                className={cn(
                    "flex items-center justify-between py-2.5 px-3 rounded-lg transition-all",
                    getRowColor(),
                    depth > 0 && "ml-6"
                )}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.expandable && onToggle && (
                        <button
                            onClick={onToggle}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                            aria-label={isExpanded ? "Contraer detalle" : "Expandir detalle"}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    {!item.expandable && <div className="w-6" />}

                    <span className={cn(
                        "text-sm truncate",
                        item.type === 'total' && "font-black",
                        item.type === 'subtotal' && "font-semibold"
                    )}>
                        {item.label}
                    </span>

                    {item.tooltip && (
                        <Tooltip content={item.tooltip} asIcon />
                    )}

                    {benchmarkStatus && (
                        <benchmarkStatus.icon className={cn("w-4 h-4 flex-shrink-0", benchmarkStatus.color)} />
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {item.type !== 'total' && item.type !== 'subtotal' && (
                        <ProportionBar
                            value={item.value}
                            total={totalIngresos}
                            color={percentage > 35 ? "danger" : percentage > 25 ? "warning" : "neutral"}
                        />
                    )}

                    {item.type !== 'total' && (
                        <span className="text-xs text-neutral-400 w-12 text-right">
                            {percentage.toFixed(2)}%
                        </span>
                    )}

                    <span className={cn(
                        "font-mono font-bold tabular-nums",
                        getValueColor(),
                        item.type === 'total' && "text-lg"
                    )}>
                        {formatCurrency(item.value)}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && item.children && (
                    <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-neutral-50/50 rounded-lg mt-1 mb-1">
                            {item.children.map((child, idx) => (
                                <ResultRow
                                    key={child.id || idx}
                                    item={child}
                                    totalIngresos={totalIngresos}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </m.div>
    )
})

// ==========================================
// MAIN COMPONENT
// ==========================================

export function CuentaResultados({ data, totalIngresos: totalIngresosProp, benchmarks }: CuentaResultadosProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personal', 'materia']))
    const [showDetails, setShowDetails] = useState(true)

    // Usar el totalIngresos de BD si se proporciona, sino recalcular
    const totalIngresos = totalIngresosProp ?? (data.ingresosNetos + data.ingresosExtra)

    const lineItems: LineItem[] = useMemo(() => [
        {
            id: 'ing-netos',
            label: 'INGRESOS NETOS',
            value: data.ingresosNetos,
            type: 'income',
            tooltip: "Facturación principal del mes por servicios"
        },
        {
            id: 'ing-extra',
            label: 'Otros Ingresos',
            value: data.ingresosExtra,
            type: 'income',
            tooltip: "Ingresos extraordinarios, alquileres, subvenciones"
        },
        {
            id: 'total-ing',
            label: 'TOTAL INGRESOS',
            value: totalIngresos,
            type: 'subtotal',
        },
        {
            id: 'personal',
            label: 'Personal',
            value: -data.personal.total,
            type: 'expense',
            category: 'operating',
            expandable: true,
            benchmark: benchmarks?.personalPct ? { value: benchmarks.personalPct, label: "benchmark" } : undefined,
            tooltip: "Costes de personal: sueldos, SS e impuestos",
            children: [
                {
                    id: 'pers-sueldos',
                    label: 'Sueldos netos',
                    value: -data.personal.sueldosNetos,
                    type: 'expense'
                },
                {
                    id: 'pers-ss',
                    label: 'Seguridad Social',
                    value: -data.personal.seguridadSocial,
                    type: 'expense'
                },
                {
                    id: 'pers-irpf',
                    label: 'IRPF Retenido',
                    value: -data.personal.irpf,
                    type: 'expense'
                }
            ]
        },
        {
            id: 'materia',
            label: 'Materia Prima',
            value: -data.materiaPrima.total,
            type: 'expense',
            category: 'operating',
            expandable: true,
            benchmark: benchmarks?.materiaPrimaPct ? { value: benchmarks.materiaPrimaPct, label: "benchmark" } : undefined,
            tooltip: "Coste de mercancías vendidas",
            children: [
                {
                    id: 'mat-comida',
                    label: 'Comida (IVA 10%)',
                    value: -data.materiaPrima.comida,
                    type: 'expense'
                },
                {
                    id: 'mat-bebida',
                    label: 'Bebida (IVA 21%)',
                    value: -data.materiaPrima.bebida,
                    type: 'expense'
                },
                {
                    id: 'mat-var',
                    label: 'Variación Existencias',
                    value: data.materiaPrima.variacionExistencias,
                    type: 'expense'
                }
            ]
        },
        {
            id: 'suministros',
            label: 'Suministros',
            value: -data.suministros,
            type: 'expense',
            category: 'operating',
            tooltip: "Luz, agua, gas, teléfono, internet"
        },
        {
            id: 'mantenimiento',
            label: 'Mantenimiento',
            value: -data.mantenimiento,
            type: 'expense',
            category: 'operating'
        },
        {
            id: 'marketing',
            label: 'Marketing',
            value: -data.marketing,
            type: 'expense',
            category: 'operating',
            tooltip: "Publicidad, promociones, comisiones"
        },
        {
            id: 'gastos-extra',
            label: 'Otros Gastos',
            value: -data.gastosExtra,
            type: 'expense',
            category: 'operating'
        },
        {
            id: 'inversiones',
            label: 'Inversiones (CAPEX)',
            value: -data.inversiones,
            type: 'expense',
            category: 'capex',
            tooltip: "Equipamiento, mobiliario, reformas amortizables"
        },
        {
            id: 'financiaciones',
            label: 'Financiaciones',
            value: -data.financiaciones,
            type: 'expense',
            category: 'financial',
            tooltip: "Intereses de préstamos y leasing"
        },
        {
            id: 'resultado',
            label: 'RESULTADO NETO',
            value: data.resultadoNeto,
            type: 'total',
        }
    ], [data, benchmarks, totalIngresos])

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev)
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId)
            } else {
                newSet.add(sectionId)
            }
            return newSet
        })
    }

    const analysis = useMemo(() => {
        const personalPct = (data.personal.total / totalIngresos) * 100
        const materiaPct = (data.materiaPrima.total / totalIngresos) * 100
        const margenPct = (data.resultadoNeto / totalIngresos) * 100

        const alerts = []
        if (personalPct > 38) alerts.push({ type: 'warning' as const, msg: 'Personal supera el 38% de ventas' })
        if (materiaPct > 32) alerts.push({ type: 'warning' as const, msg: 'Materia prima elevada' })
        if (margenPct < 10) alerts.push({ type: 'danger' as const, msg: 'Margen neto bajo el 10%' })

        return { personalPct, materiaPct, margenPct, alerts }
    }, [data, totalIngresos])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-neutral-600" />
                    <h3 className="font-bold text-lg text-neutral-900">Cuenta de Resultados</h3>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors px-2 py-1 rounded-lg hover:bg-neutral-100"
                >
                    {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showDetails ? 'Simplificar' : 'Detalle'}
                </button>
            </div>

            {analysis.alerts.length > 0 && (
                <div className="space-y-2">
                    {analysis.alerts.map((alert, idx) => (
                        <m.div
                            key={idx}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
                                alert.type === 'danger' && "bg-rose-50 text-rose-700 border border-rose-200",
                                alert.type === 'warning' && "bg-amber-50 text-amber-700 border border-amber-200"
                            )}
                        >
                            <AlertCircle className="w-4 h-4" />
                            {alert.msg}
                        </m.div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="p-4 space-y-1">
                    {lineItems.map((item) => (
                        <ResultRow
                            key={item.id}
                            item={item}
                            totalIngresos={totalIngresos}
                            isExpanded={item.expandable ? expandedSections.has(item.id) : undefined}
                            onToggle={item.expandable ? () => toggleSection(item.id) : undefined}
                        />
                    ))}
                </div>
            </div>

            {showDetails && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-600 mb-1">Personal/Ventas</p>
                        <p className={cn(
                            "text-xl font-bold",
                            analysis.personalPct > 38 ? "text-rose-600" : "text-blue-700"
                        )}>
                            {analysis.personalPct.toFixed(2)}%
                        </p>
                        <p className="text-xs text-blue-500">Meta: &lt;38%</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-xs text-emerald-600 mb-1">Materia/Ventas</p>
                        <p className={cn(
                            "text-xl font-bold",
                            analysis.materiaPct > 32 ? "text-rose-600" : "text-emerald-700"
                        )}>
                            {analysis.materiaPct.toFixed(2)}%
                        </p>
                        <p className="text-xs text-emerald-500">Meta: &lt;32%</p>
                    </div>
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                        <p className="text-xs text-violet-600 mb-1">Margen Neto</p>
                        <p className={cn(
                            "text-xl font-bold",
                            analysis.margenPct < 10 ? "text-rose-600" : "text-violet-700"
                        )}>
                            {analysis.margenPct.toFixed(2)}%
                        </p>
                        <p className="text-xs text-violet-500">Meta: &gt;10%</p>
                    </div>
                </div>
            )}
        </div>
    )
}
