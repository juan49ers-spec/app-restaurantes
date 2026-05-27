import type { ProfessionalReportPresentation } from '@/lib/reporting'

export type PortalInsightTone = 'positive' | 'neutral' | 'warning' | 'critical'

export interface PortalPeriodMetrics {
  revenue: number
  expenses: number
  netResult: number
  expenseRatioPct: number | null
}

export interface PortalMetricDelta {
  value: number
  pct: number | null
}

export interface PortalPeriodComparison {
  period: {
    currentFrom: string
    currentTo: string
    previousFrom: string
    previousTo: string
  }
  current: PortalPeriodMetrics
  previous: PortalPeriodMetrics
  deltas: {
    revenue: PortalMetricDelta
    expenses: PortalMetricDelta
    netResult: PortalMetricDelta
    expenseRatioPct: number | null
  }
  hasPreviousData: boolean
}

export interface PortalSuggestedAction {
  id: string
  title: string
  body: string
  tone: PortalInsightTone
  sourceId: string
}

export function previousCalendarMonthBounds(periodFrom: string) {
  const [year, month] = periodFrom.split('-').map(Number)
  const previousMonthStart = new Date(Date.UTC(year, month - 2, 1))
  const previousYear = previousMonthStart.getUTCFullYear()
  const previousMonth = String(previousMonthStart.getUTCMonth() + 1).padStart(2, '0')
  const previousFrom = `${previousYear}-${previousMonth}-01`
  const previousTo = new Date(Date.UTC(previousYear, previousMonthStart.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10)

  return { previousFrom, previousTo }
}

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) return null
  return round((numerator / denominator) * 100, 2)
}

function delta(current: number, previous: number): PortalMetricDelta {
  const value = round(current - previous, 2)
  return {
    value,
    pct: previous === 0 ? null : round((value / Math.abs(previous)) * 100, 2),
  }
}

export function buildPortalPeriodComparison(input: {
  currentFrom: string
  currentTo: string
  currentRevenue: number
  currentExpenses: number
  previousRevenue: number
  previousExpenses: number
}): PortalPeriodComparison {
  const { previousFrom, previousTo } = previousCalendarMonthBounds(input.currentFrom)
  const current: PortalPeriodMetrics = {
    revenue: round(input.currentRevenue, 2),
    expenses: round(input.currentExpenses, 2),
    netResult: round(input.currentRevenue - input.currentExpenses, 2),
    expenseRatioPct: ratio(input.currentExpenses, input.currentRevenue),
  }
  const previous: PortalPeriodMetrics = {
    revenue: round(input.previousRevenue, 2),
    expenses: round(input.previousExpenses, 2),
    netResult: round(input.previousRevenue - input.previousExpenses, 2),
    expenseRatioPct: ratio(input.previousExpenses, input.previousRevenue),
  }

  return {
    period: {
      currentFrom: input.currentFrom,
      currentTo: input.currentTo,
      previousFrom,
      previousTo,
    },
    current,
    previous,
    deltas: {
      revenue: delta(current.revenue, previous.revenue),
      expenses: delta(current.expenses, previous.expenses),
      netResult: delta(current.netResult, previous.netResult),
      expenseRatioPct: current.expenseRatioPct === null || previous.expenseRatioPct === null
        ? null
        : round(current.expenseRatioPct - previous.expenseRatioPct, 2),
    },
    hasPreviousData: previous.revenue > 0 || previous.expenses > 0,
  }
}

export function buildPortalSuggestedActions(
  presentation: ProfessionalReportPresentation
): PortalSuggestedAction[] {
  const actions: PortalSuggestedAction[] = []
  const addAction = (action: PortalSuggestedAction) => {
    if (!actions.some(item => item.id === action.id)) actions.push(action)
  }

  for (const kpi of presentation.kpis) {
    if (kpi.tone !== 'warning' && kpi.tone !== 'critical') continue

    if (kpi.id === 'prime_cost_pct') {
      addAction({
        id: 'review-prime-cost',
        title: 'Revisar prime cost con el consultor',
        body: 'Cruzar materia prima, personal y carta para decidir si la mejora viene por compras, precios o planificación.',
        tone: kpi.tone,
        sourceId: kpi.id,
      })
    } else if (kpi.id === 'cogs_ratio') {
      addAction({
        id: 'review-cogs',
        title: 'Revisar materia prima y escandallos',
        body: 'Validar coste de recetas, proveedor principal y productos con margen bajo antes de subir volumen.',
        tone: kpi.tone,
        sourceId: kpi.id,
      })
    } else if (kpi.id === 'labor_ratio') {
      addAction({
        id: 'review-labor',
        title: 'Revisar planificación de personal',
        body: 'Contrastar turnos, horas reales y ventas por día para ajustar cobertura sin deteriorar servicio.',
        tone: kpi.tone,
        sourceId: kpi.id,
      })
    } else if (kpi.id === 'target_completion' || kpi.id === 'revenue_total') {
      addAction({
        id: 'review-revenue',
        title: 'Activar palancas de venta',
        body: 'Separar caída de demanda, ticket medio y mix de canal para priorizar acciones comerciales concretas.',
        tone: kpi.tone,
        sourceId: kpi.id,
      })
    } else if (kpi.id === 'net_profit' || kpi.id === 'net_margin_pct') {
      addAction({
        id: 'review-profitability',
        title: 'Revisar rentabilidad del periodo',
        body: 'Validar si el resultado viene de ventas insuficientes, gasto estructural o desviaciones puntuales.',
        tone: kpi.tone,
        sourceId: kpi.id,
      })
    }
  }

  if (actions.length === 0) {
    const priorityConclusion = presentation.conclusions.find(conclusion =>
      conclusion.tone === 'warning' || conclusion.tone === 'critical'
    )

    if (priorityConclusion) {
      actions.push({
        id: `conclusion-${priorityConclusion.id}`,
        title: priorityConclusion.title,
        body: priorityConclusion.body,
        tone: priorityConclusion.tone,
        sourceId: priorityConclusion.id,
      })
    }
  }

  if (actions.length === 0) {
    actions.push({
      id: 'protect-margin',
      title: 'Proteger el margen conseguido',
      body: 'Mantener seguimiento mensual de ventas, compras y personal para no perder el resultado alcanzado.',
      tone: 'positive',
      sourceId: 'presentation.conclusions',
    })
  }

  return actions.slice(0, 3)
}
