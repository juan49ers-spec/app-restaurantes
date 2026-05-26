import type {
  ProfessionalReportSection,
  ProfessionalRestaurantReport,
  ReportMetric,
  ReportSectionId,
} from './types'

type MetricTone = 'positive' | 'neutral' | 'warning' | 'critical'

export interface PresentationKpi {
  id: string
  label: string
  value: number | string | null
  unit: ReportMetric['unit']
  note: string
  tone: MetricTone
  sourceIds: string[]
}

export interface PresentationChapter {
  id: string
  label: string
  title: string
  subtitle: string
  sectionIds: ReportSectionId[]
}

export interface PresentationConclusion {
  id: string
  order: number
  title: string
  body: string
  tone: MetricTone
  sourceIds: string[]
}

export interface ProfessionalReportPresentation {
  eyebrow: string
  title: string
  subtitle: string
  periodLabel: string
  kpis: PresentationKpi[]
  chapters: PresentationChapter[]
  conclusions: PresentationConclusion[]
}

const COGS_TARGET_PCT = 33
const LABOR_TARGET_PCT = 33
const PRIME_COST_LIMIT_PCT = 60

function section(report: ProfessionalRestaurantReport, id: ReportSectionId) {
  return report.sections.find(item => item.id === id)
}

function metric(sectionData: ProfessionalReportSection | undefined, id: string) {
  return sectionData?.metrics.find(item => item.id === id)
}

function numericMetric(sectionData: ProfessionalReportSection | undefined, id: string) {
  const value = metric(sectionData, id)?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pct(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator === 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function toneFromDelta(value: number | null, target: number, lowerIsBetter = true): MetricTone {
  if (value === null) return 'warning'
  const delta = lowerIsBetter ? value - target : target - value
  if (delta <= 0) return 'positive'
  if (delta <= 5) return 'warning'
  return 'critical'
}

function kpiFromMetric(
  id: string,
  label: string,
  sourceMetric: ReportMetric | undefined,
  note: string,
  tone: MetricTone = 'neutral'
): PresentationKpi {
  return {
    id,
    label,
    value: sourceMetric?.value ?? null,
    unit: sourceMetric?.unit ?? 'text',
    note,
    tone,
    sourceIds: sourceMetric?.sourceIds ?? [],
  }
}

function buildKpis(report: ProfessionalRestaurantReport): PresentationKpi[] {
  const sales = section(report, 'sales')
  const costs = section(report, 'costs')
  const profitability = section(report, 'profitability')
  const staff = section(report, 'staff')

  const revenue = numericMetric(sales, 'revenue_total')
  const cogs = numericMetric(costs, 'cogs_expenses')
  const labor = numericMetric(costs, 'labor_expenses')
  const shiftCost = numericMetric(staff, 'shift_cost')
  const laborForRatio = labor && labor > 0 ? labor : shiftCost
  const cogsPct = pct(cogs, revenue)
  const laborPct = pct(laborForRatio, revenue)
  const revenueTargetCompletion = metric(profitability, 'revenue_target_completion_pct')
  const cogsTargetPct = numericMetric(profitability, 'cogs_target_pct') ?? COGS_TARGET_PCT
  const laborTargetPct = numericMetric(profitability, 'labor_target_pct') ?? LABOR_TARGET_PCT

  const revenueKpi = revenueTargetCompletion
    ? kpiFromMetric(
      'target_completion',
      'Objetivo ventas',
      revenueTargetCompletion,
      'Cumplimiento del presupuesto',
      (numericMetric(profitability, 'revenue_target_completion_pct') ?? 0) >= 100 ? 'positive' : 'warning'
    )
    : kpiFromMetric(
      'revenue_total',
      'Ingresos',
      metric(sales, 'revenue_total'),
      `${report.period.days} dias analizados`,
      revenue && revenue > 0 ? 'positive' : 'critical'
    )

  return [
    kpiFromMetric(
      'net_profit',
      'Resultado estimado',
      metric(profitability, 'net_profit'),
      'Lectura economica del periodo',
      (numericMetric(profitability, 'net_profit') ?? 0) >= 0 ? 'positive' : 'critical'
    ),
    revenueKpi,
    kpiFromMetric(
      'net_margin_pct',
      'Margen neto',
      metric(profitability, 'net_margin_pct'),
      'Resultado sobre ventas',
      (numericMetric(profitability, 'net_margin_pct') ?? 0) > 10 ? 'positive' : 'warning'
    ),
    {
      id: 'cogs_ratio',
      label: 'Materia prima',
      value: cogsPct,
      unit: 'pct',
      note: `Objetivo ${cogsTargetPct}%`,
      tone: toneFromDelta(cogsPct, cogsTargetPct),
      sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'],
    },
    {
      id: 'labor_ratio',
      label: 'Personal',
      value: laborPct,
      unit: 'pct',
      note: `Objetivo ${laborTargetPct}%`,
      tone: toneFromDelta(laborPct, laborTargetPct),
      sourceIds: ['daily_sales.revenue', labor && labor > 0 ? 'operating_expenses.amount' : 'shifts.cost'],
    },
    kpiFromMetric(
      'prime_cost_pct',
      'Prime cost',
      metric(profitability, 'prime_cost_pct'),
      `Limite recomendado ${PRIME_COST_LIMIT_PCT}%`,
      toneFromDelta(numericMetric(profitability, 'prime_cost_pct'), PRIME_COST_LIMIT_PCT)
    ),
  ]
}

function buildChapters(): PresentationChapter[] {
  return [
    {
      id: 'results',
      label: 'I',
      title: 'Resultados',
      subtitle: 'Cuenta de explotacion del periodo',
      sectionIds: ['profitability'],
    },
    {
      id: 'revenue',
      label: 'II',
      title: 'Ingresos',
      subtitle: 'Volumen, ticket medio y cobertura diaria',
      sectionIds: ['sales'],
    },
    {
      id: 'costs',
      label: 'III',
      title: 'Gastos',
      subtitle: 'Materia prima, personal y estructura operativa',
      sectionIds: ['costs', 'staff'],
    },
    {
      id: 'menu',
      label: 'IV',
      title: 'Carta',
      subtitle: 'Mix vendido, margen por producto e ingeniería BCG',
      sectionIds: ['menu_performance', 'menu_engineering'],
    },
    {
      id: 'suppliers',
      label: 'V',
      title: 'Proveedores',
      subtitle: 'Compras completadas, fiabilidad y concentracion operativa',
      sectionIds: ['suppliers'],
    },
    {
      id: 'action',
      label: 'VI',
      title: 'Conclusiones',
      subtitle: 'Lecturas clave y prioridades de gestion',
      sectionIds: ['recommendations', 'data_appendix'],
    },
  ]
}

function buildDataConclusions(report: ProfessionalRestaurantReport): PresentationConclusion[] {
  const criticalIssues = report.quality.issues.filter(issue => issue.severity === 'critical')
  const issues = criticalIssues.length > 0 ? criticalIssues : report.quality.issues

  if (issues.length === 0) return []

  return issues.slice(0, 6).map((issue, index) => ({
    id: issue.id,
    order: index + 1,
    title: 'Dato pendiente de validar',
    body: issue.message,
    tone: issue.severity === 'critical' ? 'critical' : 'warning',
    sourceIds: issue.sourceIds,
  }))
}

function buildBusinessConclusions(report: ProfessionalRestaurantReport): PresentationConclusion[] {
  const sales = section(report, 'sales')
  const costs = section(report, 'costs')
  const profitability = section(report, 'profitability')
  const suppliers = section(report, 'suppliers')
  const menuEngineering = section(report, 'menu_engineering')

  const revenue = numericMetric(sales, 'revenue_total')
  const netProfit = numericMetric(profitability, 'net_profit')
  const netMargin = numericMetric(profitability, 'net_margin_pct')
  const primeCostPct = numericMetric(profitability, 'prime_cost_pct')
  const cogsPct = pct(numericMetric(costs, 'cogs_expenses'), revenue)
  const targetCompletion = numericMetric(profitability, 'revenue_target_completion_pct')
  const supplierSpend = numericMetric(suppliers, 'completed_invoice_spend')
  const topStar = metric(menuEngineering, 'bcg_top_star')?.value
  const priorityPuzzle = metric(menuEngineering, 'bcg_priority_puzzle')?.value

  const conclusions: PresentationConclusion[] = [
    {
      id: 'profitability-read',
      order: 1,
      title: netProfit !== null && netProfit >= 0 ? 'Periodo rentable' : 'Rentabilidad tensionada',
      body: netProfit !== null && netProfit >= 0
        ? `El periodo deja resultado positivo y un margen neto estimado del ${netMargin ?? 0}%. La prioridad es proteger ese margen, no solo crecer en ventas.`
        : 'El resultado estimado no permite afirmar rentabilidad positiva. Conviene revisar ventas, gastos y cierres antes de tomar decisiones comerciales.',
      tone: netProfit !== null && netProfit >= 0 ? 'positive' : 'critical',
      sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'],
    },
  ]

  if (targetCompletion !== null) {
    conclusions.push({
      id: 'target-read',
      order: conclusions.length + 1,
      title: targetCompletion >= 100 ? 'Objetivo de ventas alcanzado' : 'Objetivo de ventas pendiente',
      body: `El periodo alcanza el ${targetCompletion}% del objetivo de ventas configurado. Esta lectura permite separar rendimiento real de sensacion operativa.`,
      tone: targetCompletion >= 100 ? 'positive' : 'warning',
      sourceIds: ['daily_sales.revenue', 'monthly_targets.targets'],
    })
  }

  if (typeof topStar === 'string' || typeof priorityPuzzle === 'string') {
    conclusions.push({
      id: 'menu-engineering-read',
      order: conclusions.length + 1,
      title: 'Carta priorizada por matriz BCG',
      body: typeof priorityPuzzle === 'string'
        ? `${priorityPuzzle} merece revisión comercial: tiene margen alto, pero necesita más tracción antes de convertirlo en apuesta de carta.`
        : `${topStar} funciona como referencia de carta: combina margen y demanda por encima del umbral del reporte.`,
      tone: 'neutral',
      sourceIds: ['menu_engineering.report'],
    })
  }

  conclusions.push(
    {
      id: 'prime-cost-read',
      order: conclusions.length + 1,
      title: primeCostPct !== null && primeCostPct <= PRIME_COST_LIMIT_PCT ? 'Prime cost bajo control' : 'Prime cost por encima del limite',
      body: primeCostPct !== null && primeCostPct <= PRIME_COST_LIMIT_PCT
        ? `El prime cost se situa en ${primeCostPct}%, dentro del limite recomendado del ${PRIME_COST_LIMIT_PCT}%.`
        : `El prime cost se situa en ${primeCostPct ?? 'sin dato'}%. Si supera el ${PRIME_COST_LIMIT_PCT}%, la mejora debe venir de compras, carta y planificacion de personal.`,
      tone: toneFromDelta(primeCostPct, PRIME_COST_LIMIT_PCT),
      sourceIds: ['daily_sales.revenue', 'operating_expenses.amount', 'shifts.cost'],
    },
    {
      id: 'cogs-read',
      order: conclusions.length + 2,
      title: cogsPct !== null && cogsPct <= COGS_TARGET_PCT ? 'Materia prima alineada' : 'Materia prima como palanca',
      body: cogsPct !== null && cogsPct <= COGS_TARGET_PCT
        ? `La materia prima esta en ${cogsPct}%, alineada con el objetivo del ${COGS_TARGET_PCT}%.`
        : `La materia prima esta en ${cogsPct ?? 'sin dato'}%. Revisar escandallos, proveedores y mix de venta puede recuperar margen.`,
      tone: toneFromDelta(cogsPct, COGS_TARGET_PCT),
      sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'],
    },
    {
      id: 'supplier-read',
      order: conclusions.length + 3,
      title: supplierSpend && supplierSpend > 0 ? 'Compras trazables' : 'Compras pendientes de cierre',
      body: supplierSpend && supplierSpend > 0
        ? `Las facturas completadas suman ${supplierSpend} EUR y permiten empezar a leer peso de proveedores.`
        : 'Sin facturas completadas, la lectura de proveedores queda limitada y no debe convertirse en conclusion final.',
      tone: supplierSpend && supplierSpend > 0 ? 'neutral' : 'warning',
      sourceIds: ['invoices.completed_spend', 'suppliers.scorecard'],
    },
  )

  return conclusions
}

function buildConclusions(report: ProfessionalRestaurantReport): PresentationConclusion[] {
  if (report.executiveSummary.blockingIssues.length > 0) {
    return buildDataConclusions(report)
  }

  return buildBusinessConclusions(report)
}

export function buildProfessionalReportPresentation(
  report: ProfessionalRestaurantReport
): ProfessionalReportPresentation {
  return {
    eyebrow: 'Informe profesional de gestion',
    title: report.restaurant.name,
    subtitle: report.quality.status === 'OK'
      ? 'Cierre y analisis del periodo'
      : 'Borrador con incidencias de calidad de dato',
    periodLabel: `${report.period.from} a ${report.period.to}`,
    kpis: buildKpis(report),
    chapters: buildChapters(),
    conclusions: buildConclusions(report),
  }
}
