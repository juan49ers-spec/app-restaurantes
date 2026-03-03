"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, PieChart } from "lucide-react"
import { m } from "framer-motion"
import { ExpenseIntelligenceWidget } from "./ExpenseIntelligenceWidget"
import { ExpenseDonutChart } from "./ExpenseDonutChart"
import { ExpenseDetailTable } from "./ExpenseDetailTable"
import { ExpensesFormModal } from "./ExpensesFormModal"
import { ExpenseDashboardData } from "@/app/actions/financial-control"
import { OperatingExpense } from "@/types/schema"
import { exportExpensesToCSV } from "@/lib/export-utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface ExpensesDashboardProps {
    data: ExpenseDashboardData
    restaurantId: string
    onInsightEdit?: (summary: string) => void
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

export function ExpensesDashboard({ data, restaurantId, onInsightEdit }: ExpensesDashboardProps) {
    const router = useRouter()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<OperatingExpense | undefined>(undefined)

    const handleEditExpense = (expense: OperatingExpense) => {
        setEditingExpense(expense)
        setIsFormOpen(true)
    }

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este gasto?")) return
        try {
            const { deleteOperatingExpense } = await import("@/app/actions/financial-control")
            await deleteOperatingExpense(id)
            toast.success("Gasto eliminado")
            // Force refresh
            router.refresh()
        } catch {
            toast.error("Error al eliminar")
        }
    }

    const handleExport = () => {
        // Flatten all expenses from all categories
        const allExpenses = data.categories.flatMap(cat =>
            cat.expenses.map((exp) => {
                const e = exp as { expense_date?: string, date?: string, description?: string, amount?: number, provider_detail?: string, tag?: string, payment_method?: string, is_paid?: boolean };
                return {
                    date: e.expense_date || e.date || '',
                    category: cat.category,
                    description: e.description || '',
                    amount: e.amount || 0,
                    provider_detail: e.provider_detail || '',
                    tag: e.tag || '',
                    payment_method: e.payment_method || '',
                    is_paid: e.is_paid || false
                };
            })
        )

        const monthYear = data.history.length > 0 ? data.history[data.history.length - 1].month : 'current'
        exportExpensesToCSV(allExpenses, `gastos_${monthYear}.csv`)
        toast.success("Gastos exportados correctamente")
    }

    const handleInsightEdit = (summary: string) => {
        if (onInsightEdit) {
            onInsightEdit(summary)
        }
    }

    return (
        <m.div
            className="space-y-6"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Header with Title and Add Button */}
            <m.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
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
                    {/* Top Row: KPIs (66%) + Chart (33%) */}
                    <m.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2">
                            <ExpenseIntelligenceWidget
                                kpis={data.kpis}
                                insight={data.insight}
                                onInsightEdit={handleInsightEdit}
                            />
                        </div>
                        <div className="xl:col-span-1 h-full">
                            <ExpenseDonutChart expenses={data.categories} />
                        </div>
                    </m.div>

                    {/* Bottom Row: Detail Table */}
                    <m.div variants={item}>
                        <ExpenseDetailTable
                            categories={data.categories.map(cat => ({
                                ...cat,
                                expenses: cat.expenses.map((exp) => {
                                    const e = exp as { id?: string, expense_date?: string, date?: string, amount?: number };
                                    return {
                                        ...e,
                                        id: e.id || '',
                                        amount: e.amount || 0,
                                        date: e.expense_date || e.date || ''
                                    };
                                })
                            }))}
                            history={data.history}
                            onEditExpense={handleEditExpense as (expense: unknown) => void}
                            onDeleteExpense={handleDeleteExpense}
                            onExport={handleExport}
                        />
                    </m.div>
                </>
            )}

            {/* Add/Edit Expense Modal */}
            <ExpensesFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setEditingExpense(undefined)
                }}
                expenseToEdit={editingExpense} // Passed correct prop name
                restaurantId={restaurantId}
            />
        </m.div>
    )
}
