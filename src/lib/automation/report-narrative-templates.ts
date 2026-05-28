import type { PresentationKpi, ProfessionalReportPresentation } from '@/lib/reporting'

type NarrativeSeverity = 'positive' | 'neutral' | 'warning' | 'critical'

export interface DeterministicReportNarrative {
  severity: NarrativeSeverity
  headline: string
  summary: string
  bullets: string[]
}

function kpi(presentation: ProfessionalReportPresentation, id: string) {
  return presentation.kpis.find(item => item.id === id)
}

function numericValue(item: PresentationKpi | undefined) {
  return typeof item?.value === 'number' && Number.isFinite(item.value) ? item.value : null
}

function formatPct(value: number) {
  return `${Math.round(value * 10) / 10}%`
}

function issueBullet(item: PresentationKpi | undefined, fallback: string) {
  if (!item) return fallback
  const value = numericValue(item)
  const renderedValue = value === null ? 'sin dato' : formatPct(value)
  return `${item.label}: ${renderedValue}. ${item.note}`
}

export function buildDeterministicReportNarrative(
  presentation: ProfessionalReportPresentation,
): DeterministicReportNarrative {
  const criticalKpis = presentation.kpis.filter(item => item.tone === 'critical')
  const warningKpis = presentation.kpis.filter(item => item.tone === 'warning')

  if (criticalKpis.length > 0) {
    const bullets = criticalKpis.slice(0, 3).map(item =>
      issueBullet(item, 'Hay un indicador crítico que requiere revisión.')
    )

    return {
      severity: 'critical',
      headline: 'Prioridad alta: revisar los indicadores críticos del periodo',
      summary: 'El informe muestra señales que conviene tratar antes de cerrar la lectura con el cliente.',
      bullets,
    }
  }

  if (warningKpis.length > 0) {
    const bullets = warningKpis.slice(0, 3).map(item =>
      issueBullet(item, 'Hay un indicador en vigilancia.')
    )

    return {
      severity: 'warning',
      headline: 'Periodo publicable con puntos de vigilancia',
      summary: 'La lectura es entregable, pero hay indicadores que merecen una conversación de seguimiento.',
      bullets,
    }
  }

  const netMargin = numericValue(kpi(presentation, 'net_margin_pct'))
  const primeCost = numericValue(kpi(presentation, 'prime_cost_pct'))

  return {
    severity: 'positive',
    headline: 'Periodo estable para revisar con foco ejecutivo',
    summary: 'No aparecen indicadores críticos en la portada del informe. La conversación puede centrarse en consolidar hábitos y siguientes mejoras.',
    bullets: [
      netMargin === null ? 'Margen neto: sin dato destacado.' : `Margen neto: ${formatPct(netMargin)}.`,
      primeCost === null ? 'Prime cost: sin dato destacado.' : `Prime cost: ${formatPct(primeCost)}.`,
    ],
  }
}
