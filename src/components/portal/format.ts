import type { PresentationKpi, ReportMetric } from '@/lib/reporting'
import { formatCurrency, formatPct } from '@/lib/utils'

export function formatPortalKpiValue(kpi: PresentationKpi) {
  if (kpi.value === null) return 'Sin dato'
  if (typeof kpi.value === 'string') return kpi.value
  if (kpi.unit === 'eur') return formatCurrency(kpi.value)
  if (kpi.unit === 'pct') return formatPct(kpi.value)
  if (kpi.unit === 'days') return `${kpi.value} días`
  return new Intl.NumberFormat('es-ES').format(kpi.value)
}

export function formatPortalMetricValue(metric: ReportMetric) {
  if (metric.value === null || metric.kind === 'not_available') return 'Sin dato'
  if (typeof metric.value === 'string') return metric.value
  if (metric.unit === 'eur') return formatCurrency(metric.value)
  if (metric.unit === 'pct') return formatPct(metric.value)
  if (metric.unit === 'days') return `${metric.value} días`
  return new Intl.NumberFormat('es-ES').format(metric.value)
}

export function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`))
}
