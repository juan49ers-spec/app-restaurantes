"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, PieChart, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { m } from "framer-motion"
import { ExpenseDonutChart } from "./ExpenseDonutChart"
import { ExpenseDetailTable, ExpenseItem } from "./ExpenseDetailTable"
import { ExpensesFormModal } from "./ExpensesFormModal"
import { ExpenseDashboardData } from "@/app/actions/financial-control"
import { OperatingExpense } from "@/types/schema"
import { isCOGSCategory } from "@/lib/financial-constants"

// Expense shape as fetched by the dashboard query (subset of OperatingExpense)
type DashboardExpense = Pick<OperatingExpense,
    'id' | 'amount' | 'expense_date' | 'category' | 'description' |
    'provider_detail' | 'tag' | 'payment_method' | 'recurrence' |
    'is_paid' | 'is_professional_invoice'
>
import { ShoppingCart, Package } from "lucide-react"
import { exportExpensesToCSV } from "@/lib/export-utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ExpensesDashboardProps {
    data: ExpenseDashboardData
    restaurantId: string
}

const CATEGORY_LABELS: Record<string, string> = {
    personal: "Personal",
    materia_prima: "Materia Prima",
    suministros: "Suministros",
    mantenimiento: "Mantenimiento",
    marketing: "Marketing",
    gastos_varios: "Gastos Varios",
    inversiones: "Inversiones",
    financiaciones: "Financiaciones",
}

const fmt = (v: number) =>
    new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(v)

function Semaforo({ ratio, target }: { ratio: number; target: number }) {
    if (target === 0) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-500 uppercase tracking-widest">Var.</span>
    const diff = ratio - target
    if (diff <= 0) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest" title="En objetivo">Bien</span>
    if (diff <= 3) return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest" title="Atención">Ojo</span>
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-widest" title="Desviado">Mal</span>
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export function ExpensesDashboard({ data, restaurantId }: ExpensesDashboardProps) {
    const router = useRouter()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<OperatingExpense | undefined>(undefined)

    // expense comes from ExpenseDetailTable as ExpenseItem (has [key: string]: any).
    // The mapped object spreads all DashboardExpense fields, so the cast is safe.
    // We inject restaurant_id (available as prop) to satisfy the full OperatingExpense contract.
    const handleEditExpense = (expense: ExpenseItem) => {
        const full = { ...(expense as unknown as DashboardExpense), restaurant_id: restaurantId } as OperatingExpense
        setEditingExpense(full)
        setIsFormOpen(true)
    }

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este gasto?")) return
        try {
            const { deleteOperatingExpense } = await import("@/app/actions/financial-control")
            await deleteOperatingExpense(id)
            toast.success("Gasto eliminado")
            router.refresh()
        } catch {
            toast.error("Error al eliminar")
        }
    }

    const handleExport = () => {
        const allExpenses = data.categories.flatMap(cat =>
            cat.expenses.map((exp: DashboardExpense) => ({
                date: exp.expense_date || "",
                category: cat.category,
                description: exp.description || "",
                amount: exp.amount || 0,
                provider_detail: exp.provider_detail || "",
                tag: exp.tag || "",
                payment_method: exp.payment_method || "",
                is_paid: exp.is_paid ?? false,
            }))
        )
        const monthYear = data.history.length > 0 ? data.history[data.history.length - 1].month : "current"
        exportExpensesToCSV(allExpenses, `gastos_${monthYear}.csv`)
        toast.success("Gastos exportados correctamente")
    }

    const { kpis } = data

    return (
        <m.div className="space-y-6" variants={container} initial="hidden" animate="show">
            {/* Header */}
            <m.div
                variants={item}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6"
            >
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Control de Gastos</h2>
                    <p className="text-sm text-neutral-500 mt-1">Gestiona y analiza todos los gastos operativos del mes</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingExpense(undefined)
                        setIsFormOpen(true)
                    }}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white gap-2 rounded-xl px-6 py-2.5 font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Gasto</span>
                </Button>
            </m.div>

            {data.categories.length === 0 ? (
                <m.div variants={item} className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-neutral-200">
                    <div className="p-3 bg-neutral-100 rounded-xl mb-4">
                        <PieChart className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-700">Sin gastos este mes</h3>
                    <p className="text-sm text-neutral-500 mt-1 text-center max-w-md">
                        No se han registrado gastos operativos en este periodo. Añade tu primer gasto para comenzar a analizar la estructura de costes.
                    </p>
                    <Button
                        onClick={() => {
                            setEditingExpense(undefined)
                            setIsFormOpen(true)
                        }}
                        className="mt-6 bg-neutral-900 hover:bg-neutral-800 text-white gap-2 rounded-xl px-6 py-2.5 font-bold text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir primer gasto
                    </Button>
                </m.div>
            ) : (
                <>
                    {/* KPI Strip */}
                    <m.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Total Gastos</p>
                            <p className="text-xl font-bold text-neutral-900">{fmt(kpis.totalExpensesExcludingCAPEX)}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">sin inversiones</p>
                        </div>
                        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Vs. mes anterior</p>
                            <div className={cn("flex items-center gap-1 text-xl font-bold", kpis.momVariation > 0 ? "text-rose-600" : "text-emerald-600")}>
                                {kpis.momVariation > 0
                                    ? <TrendingUp className="w-4 h-4" />
                                    : <TrendingDown className="w-4 h-4" />}
                                {Math.abs(kpis.momVariation).toFixed(1)}%
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-0.5">variación mensual</p>
                        </div>
                        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Ratio Personal</p>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xl font-bold text-neutral-900">
                                    {kpis.personalRatio.toFixed(1)}%
                                </p>
                                <Semaforo ratio={kpis.personalRatio} target={33} />
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-1">Teórico: ≤ 33%</p>
                        </div>
                        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">Ratio Mat. Prima</p>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xl font-bold text-neutral-900">
                                    {kpis.cogsRatio.toFixed(1)}%
                                </p>
                                <Semaforo ratio={kpis.cogsRatio} target={33} />
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-1">Teórico: ≤ 33%</p>
                        </div>
                    </m.div>

                    {/* Category Analysis + Donut */}
                    <m.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Category Table with Semáforo */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-neutral-100">
                                <h3 className="text-sm font-bold text-neutral-900">Análisis por Categoría</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">Comparativa vs mes anterior y objetivos</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-neutral-100 bg-neutral-50/60">
                                            <th className="text-left px-5 py-2.5 font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">Categoría</th>
                                            <th className="text-right px-4 py-2.5 font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">Importe</th>
                                            <th className="text-right px-4 py-2.5 font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">Vs anterior</th>
                                            <th className="text-right px-4 py-2.5 font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">% Ventas</th>
                                            <th className="text-right px-4 py-2.5 font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">Objetivo</th>
                                            <th className="text-center px-4 py-2.5 font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50">
                                        {data.categories.map((cat) => {
                                            const label = CATEGORY_LABELS[cat.category] ?? cat.category
                                            const varEur = cat.prevAmount != null ? cat.amount - cat.prevAmount : null
                                            const varPct = cat.prevAmount ? ((cat.amount - cat.prevAmount) / cat.prevAmount) * 100 : null
                                            const isUp = cat.momVariation > 0
                                            return (
                                                <tr key={cat.category} className="hover:bg-neutral-50/60 transition-colors">
                                                    <td className="px-5 py-3 font-medium text-neutral-800">{label}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(cat.amount)}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {varEur !== null && varPct !== null ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className={cn("inline-flex items-center gap-0.5 font-semibold", isUp ? "text-rose-600" : "text-emerald-600")}>
                                                                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                                    {fmt(Math.abs(varEur))}
                                                                </span>
                                                                <span className="text-[10px] text-neutral-400 font-medium">
                                                                    {isUp ? '+' : ''}{varPct.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-neutral-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                                                        {cat.ratioToSales > 0 ? `${cat.ratioToSales.toFixed(1)}%` : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-neutral-400">
                                                        {cat.theoreticalTarget > 0 ? `${cat.theoreticalTarget}%` : "Variable"}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Semaforo ratio={cat.ratioToSales} target={cat.theoreticalTarget} />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {/* Total row */}
                                        <tr className="bg-neutral-50 font-bold">
                                            <td className="px-5 py-3 text-neutral-900">Total</td>
                                            <td className="px-4 py-3 text-right text-neutral-900 tabular-nums">{fmt(kpis.totalExpenses)}</td>
                                            <td className="px-4 py-3" />
                                            <td className="px-4 py-3 text-right text-neutral-900 tabular-nums">
                                                {kpis.expenseToSalesRatio > 0 ? `${kpis.expenseToSalesRatio.toFixed(1)}%` : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right text-neutral-400">≤ 85%</td>
                                            <td className="px-4 py-3 text-center">
                                                <Semaforo ratio={kpis.expenseToSalesRatio} target={85} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {/* Legend */}
                            <div className="px-5 py-3 border-t border-neutral-100 flex items-center gap-4">
                                <span className="text-[10px] text-neutral-400 font-medium">Semáforo de Ratio:</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest">Bien</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">Ojo</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-widest">Mal</span>
                                <span className="text-[10px] text-neutral-400 ml-auto">Tolerancia ±3pp</span>
                            </div>
                        </div>

                        {/* Donut Chart */}
                        <div className="lg:col-span-1">
                            <ExpenseDonutChart expenses={data.categories} />
                        </div>
                    </m.div>

                    {/* Materia Prima Breakdown */}
                    {(() => {
                        const cogsCategories = data.categories.filter(c => isCOGSCategory(c.category))
                        const cogsExpenses = cogsCategories.flatMap(c => c.expenses as DashboardExpense[])
                        const cogsTotal = cogsCategories.reduce((sum, c) => sum + c.amount, 0)
                        return <MateriaPrimaBreakdown expenses={cogsExpenses} total={cogsTotal} />
                    })()}

                    {/* Detail Table */}
                    <m.div variants={item}>
                        <ExpenseDetailTable
                            categories={data.categories.map(cat => ({
                                ...cat,
                                expenses: cat.expenses.map((exp: DashboardExpense) => ({
                                    ...exp,
                                    id: exp.id || "",
                                    amount: exp.amount || 0,
                                    date: exp.expense_date || "",
                                })),
                            }))}
                            history={data.history}
                            onEditExpense={handleEditExpense}
                            onDeleteExpense={handleDeleteExpense}
                            onExport={handleExport}
                        />
                    </m.div>
                </>
            )}

            <ExpensesFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setEditingExpense(undefined)
                }}
                expenseToEdit={editingExpense}
                restaurantId={restaurantId}
            />
        </m.div>
    )
}

// ─────────────────────────────────────────────
// MATERIA PRIMA BREAKDOWN
// ─────────────────────────────────────────────

function MateriaPrimaBreakdown({ expenses, total }: {
    expenses: DashboardExpense[] | undefined
    total: number
}) {
    if (!expenses || expenses.length === 0 || total === 0) return null

    // Group by provider
    const byProvider: Record<string, number> = {}
    expenses.forEach(exp => {
        const key = exp.provider_detail?.trim() || 'Sin proveedor'
        byProvider[key] = (byProvider[key] || 0) + (exp.amount || 0)
    })

    // Group by tag (product family)
    const byTag: Record<string, number> = {}
    expenses.forEach(exp => {
        const key = exp.tag?.trim() || 'Sin categoría'
        byTag[key] = (byTag[key] || 0) + (exp.amount || 0)
    })

    const sortedProviders = Object.entries(byProvider).sort((a, b) => b[1] - a[1])
    const sortedTags = Object.entries(byTag).sort((a, b) => b[1] - a[1])

    const hasProviders = sortedProviders.some(([k]) => k !== 'Sin proveedor')
    const hasTags = sortedTags.some(([k]) => k !== 'Sin categoría')

    if (!hasProviders && !hasTags) return null

    return (
        <m.div variants={item} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Desglose Materia Prima</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Por proveedor y familia de producto</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
                {/* By provider */}
                <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Por Proveedor</span>
                    </div>
                    <div className="space-y-2">
                        {sortedProviders.map(([name, amount]) => {
                            const pct = total > 0 ? (amount / total) * 100 : 0
                            return (
                                <div key={name}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="text-neutral-700 font-medium truncate max-w-[60%]">{name}</span>
                                        <span className="tabular-nums text-neutral-900 font-semibold">{fmt(amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                                            <m.div
                                                className="h-full bg-neutral-800 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-neutral-400 tabular-nums w-9 text-right">{pct.toFixed(1)}%</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                {/* By tag / product family */}
                <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Por Familia</span>
                    </div>
                    <div className="space-y-2">
                        {sortedTags.map(([name, amount]) => {
                            const pct = total > 0 ? (amount / total) * 100 : 0
                            return (
                                <div key={name}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="text-neutral-700 font-medium truncate max-w-[60%]">{name}</span>
                                        <span className="tabular-nums text-neutral-900 font-semibold">{fmt(amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                                            <m.div
                                                className="h-full bg-neutral-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-neutral-400 tabular-nums w-9 text-right">{pct.toFixed(1)}%</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </m.div>
    )
}
