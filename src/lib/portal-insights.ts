import type { ProfessionalReportPresentation } from '@/lib/reporting'
import { EXPENSE_CATEGORY_LABELS, type OperatingExpenseCategory } from '@/types/schema'

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

export interface PortalMultiPeriodTrend {
  periods: Array<{
    from: string
    to: string
    label: string
    revenue: number
    expenses: number
    netResult: number
  }>
  hasTrend: boolean
}

export interface PortalExpenseCategoryBreakdown {
  categories: Array<{
    category: string
    label: string
    currentAmount: number
    previousAmount: number
    delta: PortalMetricDelta
  }>
  hasPreviousData: boolean
}

export type PortalMeetingStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | null

export type PortalClientReviewPlanStatus =
  | 'READ_REPORT'
  | 'REVIEW_PRIORITIES'
  | 'MEETING_REQUESTED'
  | 'MEETING_IN_PREPARATION'
  | 'REVIEW_COMPLETED'

export type PortalClientReviewPlanItemStatus = 'done' | 'current' | 'pending'

export interface PortalClientReviewPlanItem {
  id: 'read-report' | 'review-actions' | 'meeting'
  label: string
  body: string
  status: PortalClientReviewPlanItemStatus
}

export interface PortalClientReviewPlan {
  status: PortalClientReviewPlanStatus
  headline: string
  summary: string
  primaryAction: {
    label: string
    href: string
  }
  items: PortalClientReviewPlanItem[]
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

function monthLabel(from: string) {
  const date = new Date(`${from}T00:00:00.000Z`)
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date).replace('.', '')

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function expenseLabel(category: string) {
  return EXPENSE_CATEGORY_LABELS[category as OperatingExpenseCategory] ?? category
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

export function buildPortalMultiPeriodTrend(input: {
  currentFrom: string
  currentTo: string
  monthlyData: Array<{
    from: string
    to: string
    revenue: number
    expenses: number
  }>
}): PortalMultiPeriodTrend {
  const periods = input.monthlyData
    .map(period => ({
      from: period.from,
      to: period.to,
      label: monthLabel(period.from),
      revenue: round(period.revenue, 2),
      expenses: round(period.expenses, 2),
      netResult: round(period.revenue - period.expenses, 2),
    }))
    .sort((left, right) => left.from.localeCompare(right.from))

  const populatedPeriods = periods.filter(period => period.revenue > 0 || period.expenses > 0)

  return {
    periods,
    hasTrend: populatedPeriods.length >= 2,
  }
}

export function buildPortalExpenseCategoryBreakdown(input: {
  currentExpenses: Array<{ category: string; amount: number }>
  previousExpenses: Array<{ category: string; amount: number }>
}): PortalExpenseCategoryBreakdown {
  const currentByCategory = new Map<string, number>()
  const previousByCategory = new Map<string, number>()

  for (const expense of input.currentExpenses) {
    currentByCategory.set(expense.category, round((currentByCategory.get(expense.category) ?? 0) + expense.amount, 2))
  }

  for (const expense of input.previousExpenses) {
    previousByCategory.set(expense.category, round((previousByCategory.get(expense.category) ?? 0) + expense.amount, 2))
  }

  const categories = Array.from(new Set([
    ...currentByCategory.keys(),
    ...previousByCategory.keys(),
  ]))
    .map(category => {
      const currentAmount = round(currentByCategory.get(category) ?? 0, 2)
      const previousAmount = round(previousByCategory.get(category) ?? 0, 2)

      return {
        category,
        label: expenseLabel(category),
        currentAmount,
        previousAmount,
        delta: delta(currentAmount, previousAmount),
      }
    })
    .sort((left, right) => {
      const absoluteDelta = Math.abs(right.delta.value) - Math.abs(left.delta.value)
      if (absoluteDelta !== 0) return absoluteDelta
      return left.label.localeCompare(right.label, 'es')
    })

  return {
    categories,
    hasPreviousData: input.previousExpenses.some(expense => expense.amount !== 0),
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

function reviewPlanItem(
  id: PortalClientReviewPlanItem['id'],
  label: string,
  body: string,
  status: PortalClientReviewPlanItemStatus,
): PortalClientReviewPlanItem {
  return { id, label, body, status }
}

export function buildPortalClientReviewPlan(input: {
  viewedAt: string | null
  meetingStatus: PortalMeetingStatus
  suggestedActions: PortalSuggestedAction[]
}): PortalClientReviewPlan {
  const hasActions = input.suggestedActions.length > 0

  if (!input.viewedAt) {
    return {
      status: 'READ_REPORT',
      headline: 'Empieza por leer el informe completo',
      summary: 'Abre el detalle para revisar conclusiones, KPIs y capítulos antes de pedir una reunión.',
      primaryAction: {
        label: 'Abrir informe completo',
        href: '#resumen-ejecutivo',
      },
      items: [
        reviewPlanItem('read-report', 'Leer informe', 'Revisa el resumen ejecutivo y los KPIs principales.', 'current'),
        reviewPlanItem('review-actions', 'Preparar prioridades', 'Anota los puntos que quieras revisar con tu consultor.', 'pending'),
        reviewPlanItem('meeting', 'Solicitar reunión', 'Pide revisión cuando tengas claras las dudas del periodo.', 'pending'),
      ],
    }
  }

  if (input.meetingStatus === 'COMPLETED') {
    return {
      status: 'REVIEW_COMPLETED',
      headline: 'Revisión completada',
      summary: 'La reunión de seguimiento ya está cerrada. Mantén el histórico como referencia para el siguiente periodo.',
      primaryAction: {
        label: 'Volver al histórico',
        href: '/portal',
      },
      items: [
        reviewPlanItem('read-report', 'Informe leído', 'El detalle ya se ha revisado.', 'done'),
        reviewPlanItem('review-actions', 'Prioridades revisadas', 'Las conclusiones ya pasaron por revisión.', 'done'),
        reviewPlanItem('meeting', 'Seguimiento cerrado', 'La solicitud de reunión está completada.', 'done'),
      ],
    }
  }

  if (input.meetingStatus === 'ACKNOWLEDGED' || input.meetingStatus === 'PENDING') {
    return {
      status: input.meetingStatus === 'ACKNOWLEDGED' ? 'MEETING_IN_PREPARATION' : 'MEETING_REQUESTED',
      headline: input.meetingStatus === 'ACKNOWLEDGED' ? 'Tu reunión está en preparación' : 'Solicitud enviada',
      summary: input.meetingStatus === 'ACKNOWLEDGED'
        ? 'Tu consultor ya tiene registrada la solicitud y preparará la revisión.'
        : 'La solicitud está pendiente de confirmación por el consultor.',
      primaryAction: {
        label: 'Ver solicitud',
        href: '#solicitar-reunion',
      },
      items: [
        reviewPlanItem('read-report', 'Informe leído', 'El detalle ya se ha abierto.', 'done'),
        reviewPlanItem(
          'review-actions',
          hasActions ? 'Prioridades detectadas' : 'Sin prioridades urgentes',
          hasActions
            ? 'Lleva estas prioridades a la revisión.'
            : 'El informe no marca urgencias, pero puedes comentar dudas.',
          'done',
        ),
        reviewPlanItem('meeting', 'Reunión solicitada', 'El seguimiento con el consultor está abierto.', 'current'),
      ],
    }
  }

  return {
    status: 'REVIEW_PRIORITIES',
    headline: hasActions ? 'Prepara las prioridades de la reunión' : 'Revisión sin urgencias destacadas',
    summary: hasActions
      ? 'Revisa las acciones sugeridas y pide reunión si quieres aterrizarlas con tu consultor.'
      : 'El informe no marca acciones urgentes. Puedes revisar el histórico o pedir contexto si lo necesitas.',
    primaryAction: {
      label: hasActions ? 'Revisar prioridades' : 'Solicitar revisión',
      href: hasActions ? '#acciones-sugeridas' : '#solicitar-reunion',
    },
    items: [
      reviewPlanItem('read-report', 'Informe leído', 'El detalle ya se ha abierto.', 'done'),
      reviewPlanItem(
        'review-actions',
        hasActions ? 'Revisar acciones sugeridas' : 'Sin acciones urgentes',
        hasActions
          ? 'Prioriza los puntos que quieras tratar con el consultor.'
          : 'Mantén seguimiento del periodo sin alarmas innecesarias.',
        hasActions ? 'current' : 'done',
      ),
      reviewPlanItem('meeting', 'Solicitar reunión', 'Abre seguimiento si necesitas contexto o decisión acompañada.', 'pending'),
    ],
  }
}
