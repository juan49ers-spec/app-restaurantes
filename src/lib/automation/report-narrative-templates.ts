import type { PresentationKpi, ProfessionalReportPresentation } from '@/lib/reporting'

type NarrativeSeverity = 'positive' | 'neutral' | 'warning' | 'critical'

export interface DeterministicReportNarrative {
  severity: NarrativeSeverity
  headline: string
  summary: string
  bullets: string[]
  recommendations: string[]
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

function formatKpiValue(item: PresentationKpi, value: number) {
  if (item.unit === 'pct') return formatPct(value)
  if (item.unit === 'eur') return `${Math.round(value).toLocaleString('es-ES')} EUR`
  return String(Math.round(value * 10) / 10)
}

function issueBullet(item: PresentationKpi | undefined, fallback: string) {
  if (!item) return fallback
  const value = numericValue(item)
  const renderedValue = value === null ? 'sin dato' : formatKpiValue(item, value)
  return `${item.label}: ${renderedValue}. ${item.note}`
}

function recommendationForKpi(item: PresentationKpi) {
  const id = item.id.toLowerCase()
  const label = item.label.toLowerCase()

  if (id.includes('cogs') || label.includes('materia') || label.includes('food')) {
    return 'Revisar compras, mermas y escandallos antes de proponer subidas de precio.'
  }

  if (id.includes('labor') || label.includes('personal')) {
    return 'Cruzar ventas por franja con turnos para ajustar cobertura sin deteriorar servicio.'
  }

  if (id.includes('prime')) {
    return 'Separar el análisis entre materia prima y personal para decidir qué palanca mover primero.'
  }

  if (id.includes('margin') || label.includes('margen') || label.includes('resultado')) {
    return 'Priorizar acciones de margen que puedan medirse en el siguiente cierre mensual.'
  }

  if (id.includes('revenue') || label.includes('venta') || label.includes('ingreso')) {
    return 'Revisar calendario, canales y ticket medio para explicar la evolución de ventas.'
  }

  return `Validar con el equipo responsable la causa principal de ${item.label}.`
}

function uniqueRecommendations(items: PresentationKpi[]) {
  return Array.from(new Set(items.map(recommendationForKpi))).slice(0, 3)
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
      summary: 'El informe muestra señales que conviene tratar antes de cerrar la lectura con el cliente. La reunión debe terminar con una decisión concreta y un responsable.',
      bullets,
      recommendations: uniqueRecommendations(criticalKpis),
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
      recommendations: uniqueRecommendations(warningKpis),
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
    recommendations: [
      'Mantener el seguimiento mensual de ventas, materia prima y personal para detectar desviaciones temprano.',
      'Elegir una mejora operativa pequeña y medirla en el siguiente informe.',
    ],
  }
}
