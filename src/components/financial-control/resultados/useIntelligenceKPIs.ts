import { useMemo } from "react"
import type { DashboardUiData } from "./types"

export function useIntelligenceKPIs(data: DashboardUiData) {
  return useMemo(() => {
    const current = data.currentMonth
    const totalRevenue = current.totalIngresos || 0

    const allExpenses =
      current.personal.total +
      current.materiaPrima.total +
      current.suministros +
      current.mantenimiento +
      current.marketing +
      current.gastosExtra +
      current.financiaciones +
      current.inversiones

    const opExWithoutCapex = allExpenses - current.inversiones

    const prevExpenses =
      data.varianceAnalysis.previousMonth.gastosMateria +
      data.varianceAnalysis.previousMonth.gastosPersonal +
      data.varianceAnalysis.previousMonth.gastosFijos

    const currentComparableExpenses = opExWithoutCapex
    const momExpenseVariation = prevExpenses > 0
      ? ((currentComparableExpenses - prevExpenses) / prevExpenses) * 100
      : 0

    return {
      totalExpenses: allExpenses,
      totalExpensesExcludingCAPEX: opExWithoutCapex,
      totalCashFlow: current.resultadoNeto,
      momVariation: momExpenseVariation,
      expenseToSalesRatio: totalRevenue > 0 ? (opExWithoutCapex / totalRevenue) * 100 : 0,
      personalRatio: totalRevenue > 0 ? (current.personal.total / totalRevenue) * 100 : 0,
      cogsRatio: totalRevenue > 0 ? (current.materiaPrima.total / totalRevenue) * 100 : 0
    }
  }, [data])
}
