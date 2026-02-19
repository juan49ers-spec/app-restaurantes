/**
 * Utilidades para el dashboard de control financiero
 */

import { EXPENSE_CATEGORY_LABELS } from "@/types/schema"
import { TARGET_RATIOS } from "./financial-constants"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"

export interface ExpenseCategory {
  category: string
  amount: number
  prevAmount?: number
  weight: number
  momVariation: number
  ratioToSales: number
  ratioToTarget: number
  theoreticalTarget: number
  expenses: ExpenseRecord[]
}

export interface DashboardInsight {
  summary: string
  topIncreaseCategories: string[]
  personalVsTarget: string
  cogsVsTarget: string
  editable: boolean
}

/**
 * Genera las categorías con mayor aumento (línea 545)
 */
export function generateTopIncreaseCategories(categories: ExpenseCategory[]): string[] {
  return categories
    .filter(cat => cat.momVariation > 0 && cat.prevAmount !== undefined && cat.prevAmount > 0)
    .sort((a, b) => b.momVariation - a.momVariation)
    .slice(0, 2)
    .map(cat => cat.category)
}

/**
 * Genera el mensaje de personal vs target
 */
export function generatePersonalVsTarget(personalRatio: number): string {
  if (personalRatio > TARGET_RATIOS.PERSONAL_TARGET_PCT + 2) {
    return `El coste de personal representa un ${personalRatio.toFixed(1)}% de las ventas (Obj: ${TARGET_RATIOS.PERSONAL_TARGET_PCT}%). ⚠️ Excede objetivo.`
  } else if (personalRatio <= TARGET_RATIOS.PERSONAL_TARGET_PCT) {
    return `El coste de personal representa un ${personalRatio.toFixed(1)}% de las ventas (Obj: ${TARGET_RATIOS.PERSONAL_TARGET_PCT}%). ✅ Dentro de objetivo.`
  } else {
    return `El coste de personal representa un ${personalRatio.toFixed(1)}% de las ventas (Obj: ${TARGET_RATIOS.PERSONAL_TARGET_PCT}%).`
  }
}

/**
 * Genera el mensaje de COGS vs target
 */
export function generateCogsVsTarget(cogsRatio: number): string {
  if (cogsRatio > TARGET_RATIOS.COGS_TARGET_PCT + 2) {
    return `Materia Prima representa un ${cogsRatio.toFixed(1)}% (Obj: ${TARGET_RATIOS.COGS_TARGET_PCT}%). ⚠️ Excede objetivo.`
  } else if (cogsRatio <= TARGET_RATIOS.COGS_TARGET_PCT) {
    return `Materia Prima representa un ${cogsRatio.toFixed(1)}% (Obj: ${TARGET_RATIOS.COGS_TARGET_PCT}%). ✅ Dentro de objetivo.`
  } else {
    return `Materia Prima representa un ${cogsRatio.toFixed(1)}% (Obj: ${TARGET_RATIOS.COGS_TARGET_PCT}%).`
  }
}

/**
 * Genera el summary del insight (línea 560)
 */
export function generateInsightSummary(
  momVariation: number,
  topIncreaseCategories: string[],
  personalVsTarget: string,
  cogsVsTarget: string
): string {
  const variationStr = `${momVariation >= 0 ? '+' : ''}${momVariation.toFixed(1)}`

  const topCategoriesStr = topIncreaseCategories.length > 0
    ? `Las partidas con mayor aumento han sido ${topIncreaseCategories.map(c => EXPENSE_CATEGORY_LABELS[c as keyof typeof EXPENSE_CATEGORY_LABELS]).join(' y ')}.`
    : ''

  return `El gasto total ha variado un ${variationStr}% respecto al mes anterior. ${topCategoriesStr} ${personalVsTarget} ${cogsVsTarget}`
}

export interface HistoryEntry {
  month: string
  total: number
  byCategory: Record<string, number>
}

export interface ExpenseRecord {
  category: string
  amount: number
}

/**
 * Calcula el total y desglose por categoría (líneas 588-592)
 */
export function calculateHistoryEntry(month: string, expenses: ExpenseRecord[]): HistoryEntry {
  const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  const byCategory: Record<string, number> = {}

  expenses.forEach(exp => {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + (exp.amount || 0)
  })

  return { month, total, byCategory }
}

/**
 * Genera las fechas para el historial de 6 meses
 */
export function generateHistoryMonths(targetDate: Date): Array<{ month: string; start: string; end: string }> {
  const months: Array<{ month: string; start: string; end: string }> = []

  for (let i = 5; i >= 0; i--) {
    const histDate = subMonths(targetDate, i)
    const start = format(startOfMonth(histDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(histDate), 'yyyy-MM-dd')
    const month = format(histDate, 'yyyy-MM')

    months.push({ month, start, end })
  }

  return months
}
