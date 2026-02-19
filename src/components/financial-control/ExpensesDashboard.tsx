"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"
import { ExpenseIntelligenceWidget } from "./ExpenseIntelligenceWidget"
import { ExpenseDonutChart } from "./ExpenseDonutChart"
import { ExpenseDetailTable } from "./ExpenseDetailTable"
import { ExpensesFormModal } from "./ExpensesFormModal"
import { ExpenseDashboardData } from "@/app/actions/financial-control"
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
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<unknown>(null)

    const handleEditExpense = (expense: unknown) => {
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
            window.location.reload()
        } catch {
            toast.error("Error al eliminar")
        }
    }

    const handleExport = () => {
        // Flatten all expenses from all categories
        const allExpenses = data.categories.flatMap(cat =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cat.expenses.map((exp: any) => ({
                ...exp,
                date: exp.expense_date || exp.date,
                category: cat.category,
                description: exp.description || '',
                amount: exp.amount
            }))
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
        <motion.div
            className="space-y-6"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Header with Title and Add Button */}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Control de Gastos</h2>
                    <p className="text-sm text-neutral-500 mt-1">Gestiona y analiza todos los gastos operativos del mes</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingExpense(null)
                        setIsFormOpen(true)
                    }}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white gap-2 rounded-xl px-6 py-2.5 font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Gasto</span>
                </Button>
            </motion.div>

            {/* Top Row: KPIs (66%) + Chart (33%) */}
            <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
            </motion.div>

            {/* Bottom Row: Detail Table */}
            <motion.div variants={item}>
                <ExpenseDetailTable
                    categories={data.categories.map(cat => ({
                        ...cat,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        expenses: cat.expenses.map((exp: any) => ({
                            ...exp,
                            id: exp.id || '',
                            date: exp.expense_date || exp.date || ''
                        }))
                    }))}
                    history={data.history}
                    onEditExpense={handleEditExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onExport={handleExport}
                />
            </motion.div>

            {/* Add/Edit Expense Modal */}
            <ExpensesFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setEditingExpense(null)
                }}
                expenseToEdit={editingExpense} // Passed correct prop name
                restaurantId={restaurantId}
            />
        </motion.div>
    )
}
