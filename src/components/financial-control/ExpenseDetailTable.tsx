"use client"

import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import { ChevronDown, TrendingUp, TrendingDown, Minus, Edit2, Trash2, FileText, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_ICONS, OperatingExpenseCategory } from "@/types/schema"
import * as Icons from "lucide-react"

// Simple Sparkline component (since react-sparklines is not installed)
function SimpleSparkline({ data, color, width = 60, height = 24 }: { data: number[], color: string, width?: number, height?: number }) {
    const max = Math.max(...data, 0.01)
    const min = Math.min(...data)
    const range = max - min || 1

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export interface ExpenseItem {
    id: string
    date: string | Date
    amount: number
    description?: string
    supplier?: string
    category?: string
    provider_detail?: string
    tag?: string
    is_professional_invoice?: boolean
    tax_rate?: number
}

interface ExpenseDetailTableProps {
    categories: {
        category: string
        amount: number
        prevAmount?: number
        weight: number
        momVariation: number
        ratioToSales: number
        ratioToTarget: number
        theoreticalTarget: number
        expenses: ExpenseItem[]
    }[]
    history: {
        month: string
        total: number
        byCategory: Record<string, number>
    }[]
    onEditExpense?: (expense: ExpenseItem) => void
    onDeleteExpense?: (id: string) => void
    onExport?: () => void
}

export function ExpenseDetailTable({ categories, history, onEditExpense, onDeleteExpense, onExport }: ExpenseDetailTableProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
    const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed')

    const toggleExpand = (category: string) => {
        const newExpanded = new Set(expandedCategories)
        if (newExpanded.has(category)) {
            newExpanded.delete(category)
        } else {
            newExpanded.add(category)
        }
        setExpandedCategories(newExpanded)
    }

    const toggleCategoryFilter = (category: string) => {
        const newSelected = new Set(selectedCategories)
        if (newSelected.has(category)) {
            newSelected.delete(category)
        } else {
            newSelected.add(category)
        }
        setSelectedCategories(newSelected)
    }



    const handleExport = () => {
        if (onExport) {
            onExport()
        }
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    // Get sparkline data for a category
    const getSparklineData = (category: string) => {
        return history.map(h => Math.abs(h.byCategory[category] || 0))
    }

    // Get icon component
    const getIcon = (iconName: string) => {
        const IconComponent = Icons[iconName as keyof typeof Icons] as React.ElementType
        return IconComponent ? <IconComponent className="w-4 h-4" /> : <Minus className="w-4 h-4" />
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-6">
                {/* Header with Filters and Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-neutral-900">Detalle de Gastos por Categoría</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex items-center bg-neutral-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('detailed')}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    viewMode === 'detailed' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                Detallada
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    viewMode === 'compact' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                Compacta
                            </button>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exportar</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-neutral-50 rounded-xl">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Buscar gastos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <div className="flex gap-1.5 flex-wrap">
                            {Array.from(new Set(categories.map(c => c.category))).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategoryFilter(cat)}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all",
                                        selectedCategories.has(cat)
                                            ? "bg-neutral-900 text-white"
                                            : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"
                                    )}
                                >
                                    {EXPENSE_CATEGORY_LABELS[cat as OperatingExpenseCategory] || cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {(selectedCategories.size > 0 || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedCategories(new Set())
                                setSearchQuery('')
                            }}
                            className="text-xs text-neutral-500 hover:text-neutral-700 font-bold whitespace-nowrap"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-neutral-50 rounded-t-xl text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <div className="col-span-3">Categoría</div>
                    <div className={cn("col-span-2 text-right", viewMode === 'compact' && "col-span-9")}>Importe Neto</div>
                    {viewMode === 'detailed' && (
                        <>
                            <div className="col-span-2 text-right">Peso Real</div>
                            <div className="col-span-2 text-right">Ratio s/Ventas</div>
                            <div className="col-span-2 text-right">Variación MoM</div>
                            <div className="col-span-1 text-center">6M</div>
                        </>
                    )}
                </div>

                {/* Table Body */}
                <div className="divide-y divide-neutral-100">
                    {categories.map((cat) => {
                        const isExpanded = expandedCategories.has(cat.category)
                        const isNegative = cat.amount < 0 // VARIACION_EXISTENCIAS negative = savings
                        const ratioColor = cat.theoreticalTarget > 0
                            ? cat.ratioToTarget > 2
                                ? "bg-rose-50 text-rose-700"
                                : cat.ratioToTarget <= 0
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-neutral-50 text-neutral-700"
                            : "bg-neutral-50 text-neutral-700"

                        return (
                            <div key={cat.category} className="hover:bg-neutral-50 transition-colors">
                                {/* Main Row */}
                                <div
                                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer"
                                    onClick={() => toggleExpand(cat.category)}
                                >
                                    {/* Category */}
                                    <div className="col-span-3 flex items-center gap-2">
                                        <m.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                                        </m.div>
                                        <div
                                            className={cn(
                                                "p-1.5 rounded-lg",
                                                isNegative ? "bg-emerald-100" : "bg-neutral-100"
                                            )}
                                        >
                                            {getIcon(EXPENSE_CATEGORY_ICONS[cat.category as OperatingExpenseCategory])}
                                        </div>
                                        <span className="text-sm font-medium text-neutral-900 truncate">
                                            {EXPENSE_CATEGORY_LABELS[cat.category as OperatingExpenseCategory] || cat.category}
                                        </span>
                                    </div>

                                    {/* Amount */}
                                    <div className={cn("col-span-2 text-right", viewMode === 'compact' && "col-span-9")}>
                                        <div className={cn(
                                            "text-sm font-mono font-bold tabular-nums",
                                            isNegative ? "text-emerald-600" : "text-neutral-900"
                                        )}>
                                            {formatCurrency(cat.amount)}
                                        </div>
                                    </div>

                                    {viewMode === 'detailed' && (
                                        <>
                                            {/* Weight */}
                                            <div className="col-span-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-sm font-bold text-neutral-900 tabular-nums">
                                                        {cat.weight.toFixed(1)}%
                                                    </span>
                                                    <div className="w-12 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-neutral-900 rounded-full dyn-bar"
                                                            ref={(el) => { if (el) el.style.setProperty('--dyn-w', `${cat.weight.toFixed(1)}%`) }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ratio to Sales */}
                                            <div className={cn(
                                                "col-span-2 text-right rounded-lg px-2 py-1",
                                                ratioColor
                                            )}>
                                                <span className="text-sm font-bold tabular-nums">
                                                    {cat.ratioToSales.toFixed(1)}%
                                                </span>
                                                {cat.theoreticalTarget > 0 && (
                                                    <div className="text-[9px] opacity-70">
                                                        Obj: {cat.theoreticalTarget}%
                                                    </div>
                                                )}
                                            </div>

                                            {/* MoM Variation */}
                                            <div className="col-span-2 text-right">
                                                <div className={cn(
                                                    "flex items-center justify-end gap-1",
                                                    cat.momVariation > 0 ? "text-rose-600" : cat.momVariation < 0 ? "text-emerald-600" : "text-neutral-400"
                                                )}>
                                                    {cat.momVariation > 0 ? <TrendingUp className="w-3 h-3" /> : cat.momVariation < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                    <span className="text-sm font-bold tabular-nums">
                                                        {Math.abs(cat.momVariation).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="text-[9px] text-neutral-400 tabular-nums">
                                                    {formatCurrency(cat.prevAmount !== undefined ? cat.amount - cat.prevAmount : 0)}
                                                </div>
                                            </div>

                                            {/* Sparkline (6M) */}
                                            <div className="col-span-1">
                                                <div className="flex items-center justify-center h-6">
                                                    <SimpleSparkline
                                                        data={getSparklineData(cat.category)}
                                                        color={cat.momVariation > 0 ? '#e11d48' : '#10b981'}
                                                        width={60}
                                                        height={24}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Expanded Detail (Drill-down) */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <m.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 pl-14 border-t border-neutral-100 mt-2 pt-3">
                                                <div className="space-y-2">
                                                    {cat.expenses.map((expense) => (
                                                        <div
                                                            key={expense.id}
                                                            className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg group hover:bg-neutral-100 transition-colors"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-neutral-900 flex items-center gap-2">
                                                                    {expense.description || expense.provider_detail || 'Sin detalle'}
                                                                    {expense.tag && (
                                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px]">
                                                                            {expense.tag}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-neutral-400 text-[10px]">
                                                                    {new Date(expense.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                                    {expense.is_professional_invoice && (
                                                                        <span className="ml-2 text-amber-600">
                                                                            {expense.tax_rate}% IVA
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-right mr-2">
                                                                    <div className="font-mono font-bold text-neutral-900 text-sm tabular-nums">
                                                                        {formatCurrency(expense.amount)}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {onEditExpense && (
                                                                        <button
                                                                            onClick={() => onEditExpense(expense)}
                                                                            className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                                                        </button>
                                                                    )}
                                                                    {onDeleteExpense && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm('¿Estás seguro de eliminar este gasto?')) {
                                                                                    onDeleteExpense(expense.id)
                                                                                }
                                                                            }}
                                                                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                                                            title="Eliminar"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {cat.expenses.length === 0 && (
                                                        <div className="text-center text-sm text-neutral-400 py-4">
                                                            No hay gastos registrados en esta categoría
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </m.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>

                {/* Footer Legend */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap gap-4 text-[10px] text-neutral-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Ahorro / Disminución</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Aumento / Gasto</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-100" />
                        <span>Dentro de objetivo</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-rose-100" />
                        <span>Excede objetivo +2%</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
