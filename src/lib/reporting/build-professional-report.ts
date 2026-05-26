import { EXPENSE_GROUPS } from '@/types/schema'
import { PROFESSIONAL_REPORT_SOURCE_MAP } from './source-map'
import type {
  DataQualityIssue,
  DataQualityStatus,
  ProfessionalReportInput,
  ProfessionalReportSection,
  ProfessionalRestaurantReport,
  ReportEvidence,
  ReportMetric,
  ReportSectionId,
  SectionQuality,
} from './types'

const COGS_CATEGORIES = new Set<string>(EXPENSE_GROUPS.COGS)
const LABOR_CATEGORIES = new Set<string>(EXPENSE_GROUPS.PERSONAL)
const FINANCIAL_CATEGORIES = new Set<string>(EXPENSE_GROUPS.FINANCIAL)
const WEEKDAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const

function round(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0
  return round((numerator / denominator) * 100, 2)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
}

function monthYear(date: string) {
  return date.slice(0, 7)
}

function weekdayLabel(date: string) {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00.000Z`).getUTCDay()]
}

function averageTargets(input: ProfessionalReportInput) {
  const fromMonth = monthYear(input.period.from)
  const toMonth = monthYear(input.period.to)
  const applicableTargets = input.monthlyTargets.filter(target => target.month_year >= fromMonth && target.month_year <= toMonth)

  if (applicableTargets.length === 0) return null

  return {
    revenueTarget: round(sum(applicableTargets.map(target => target.revenue_target || 0))),
    cogsTargetPct: round(sum(applicableTargets.map(target => target.cogs_target_pct || 0)) / applicableTargets.length, 2),
    laborTargetPct: round(sum(applicableTargets.map(target => target.labor_target_pct || 0)) / applicableTargets.length, 2),
    rowCount: applicableTargets.length,
  }
}

function evidence(sourceId: string, tables: string[], rowCount: number, notes?: string): ReportEvidence {
  return { sourceId, tables, rowCount, kind: 'actual', notes }
}

function issue(
  id: string,
  section: ReportSectionId,
  status: Exclude<DataQualityStatus, 'OK'>,
  severity: DataQualityIssue['severity'],
  message: string,
  sourceIds: string[],
): DataQualityIssue {
  return { id, section, status, severity, message, sourceIds }
}

function buildQuality(section: ReportSectionId, issues: DataQualityIssue[], evidenceRows: ReportEvidence[]): SectionQuality {
  const hasConflict = issues.some(item => item.status === 'CONFLICT')
  const hasMissing = issues.some(item => item.status === 'MISSING')
  const hasPartial = issues.some(item => item.status === 'PARTIAL')
  const status: DataQualityStatus = hasConflict ? 'CONFLICT' : hasMissing ? 'MISSING' : hasPartial ? 'PARTIAL' : 'OK'
  const penalty = issues.reduce((total, item) => {
    if (item.status === 'CONFLICT') return total + 45
    if (item.status === 'MISSING') return total + 35
    return total + 15
  }, 0)

  return {
    section,
    status,
    confidence: Math.max(0, 100 - penalty),
    issues,
    evidence: evidenceRows,
  }
}

function dateCoverage(rowCount: number, days: number) {
  if (!days) return 0
  return rowCount / days
}

function buildSalesSection(input: ProfessionalReportInput): ProfessionalReportSection {
  const revenue = sum(input.sales.map(row => row.revenue_total || 0))
  const covers = sum(input.sales.map(row => row.total_covers || 0))
  const laborHours = sum(input.sales.map(row => row.labor_hours || 0))
  const coverage = dateCoverage(new Set(input.sales.map(row => row.date)).size, input.period.days)
  const weekdayRevenue = input.sales.reduce<Record<string, number>>((acc, row) => {
    const label = weekdayLabel(row.date)
    acc[label] = (acc[label] || 0) + (row.revenue_total || 0)
    return acc
  }, {})
  const weekdayEntries = Object.entries(weekdayRevenue).sort((a, b) => b[1] - a[1])
  const bestWeekday = weekdayEntries[0] ?? null
  const weakestWeekday = weekdayEntries[weekdayEntries.length - 1] ?? null
  const weekdaySpreadPct = bestWeekday && weakestWeekday && weakestWeekday[1] > 0
    ? pct(bestWeekday[1] - weakestWeekday[1], weakestWeekday[1])
    : null
  const issues: DataQualityIssue[] = []

  if (input.sales.length === 0) {
    issues.push(issue('sales.missing', 'sales', 'MISSING', 'critical', 'No hay ventas registradas en el periodo.', ['daily_sales.revenue']))
  } else if (coverage < 0.7) {
    issues.push(issue('sales.partial_coverage', 'sales', 'PARTIAL', 'warning', `La cobertura de ventas es del ${round(coverage * 100, 1)}% del periodo.`, ['daily_sales.revenue']))
  }

  const conflictingRows = input.sales.filter(row => {
    const channelTotal = (row.revenue_dine_in || 0) + (row.revenue_takeout || 0) + (row.revenue_delivery || 0)
    if (!channelTotal || !row.revenue_total) return false
    return Math.abs(channelTotal - row.revenue_total) / row.revenue_total > 0.05
  })

  if (conflictingRows.length > 0) {
    issues.push(issue('sales.channel_conflict', 'sales', 'CONFLICT', 'critical', `${conflictingRows.length} días tienen canales que no cuadran con la venta total.`, ['daily_sales.channels']))
  }

  const metrics: ReportMetric[] = [
    { id: 'revenue_total', label: 'Ventas totales', value: round(revenue), unit: 'eur', kind: 'actual', sourceIds: ['daily_sales.revenue'] },
    { id: 'average_daily_revenue', label: 'Venta media diaria', value: round(revenue / Math.max(input.sales.length, 1)), unit: 'eur', kind: 'derived', sourceIds: ['daily_sales.revenue'] },
    { id: 'covers', label: 'Cubiertos registrados', value: covers, unit: 'count', kind: 'actual', sourceIds: ['daily_sales.revenue'] },
    { id: 'average_ticket', label: 'Ticket medio', value: covers > 0 ? round(revenue / covers) : null, unit: 'eur', kind: covers > 0 ? 'derived' : 'not_available', sourceIds: ['daily_sales.revenue'] },
    { id: 'labor_hours', label: 'Horas de personal registradas en ventas', value: round(laborHours), unit: 'count', kind: 'actual', sourceIds: ['daily_sales.revenue'] },
    { id: 'best_weekday', label: 'Día fuerte', value: bestWeekday?.[0] ?? null, unit: 'text', kind: bestWeekday ? 'derived' : 'not_available', sourceIds: ['daily_sales.revenue'] },
    { id: 'best_weekday_revenue', label: 'Venta del día fuerte', value: bestWeekday ? round(bestWeekday[1]) : null, unit: 'eur', kind: bestWeekday ? 'derived' : 'not_available', sourceIds: ['daily_sales.revenue'] },
    { id: 'weakest_weekday', label: 'Día débil', value: weakestWeekday?.[0] ?? null, unit: 'text', kind: weakestWeekday ? 'derived' : 'not_available', sourceIds: ['daily_sales.revenue'] },
    { id: 'weekday_spread_pct', label: 'Brecha día fuerte vs débil', value: weekdaySpreadPct, unit: 'pct', kind: weekdaySpreadPct === null ? 'not_available' : 'derived', sourceIds: ['daily_sales.revenue'] },
  ]

  const narrative = revenue > 0
    ? [`El periodo registra ${round(revenue)} EUR de ventas con ${input.sales.length} días informados.`]
    : ['No se puede emitir una lectura comercial fiable sin ventas registradas.']

  if (bestWeekday && weakestWeekday && weekdaySpreadPct !== null) {
    narrative.push(`${bestWeekday[0]} concentra la mayor venta registrada (${round(bestWeekday[1])} EUR), frente a ${weakestWeekday[0]} con ${round(weakestWeekday[1])} EUR; la brecha es del ${weekdaySpreadPct}%.`)
  }

  return {
    id: 'sales',
    title: 'Ventas',
    quality: buildQuality('sales', issues, [evidence('daily_sales.revenue', ['daily_sales'], input.sales.length)]),
    metrics,
    narrative,
  }
}

function buildCostsSection(input: ProfessionalReportInput): ProfessionalReportSection {
  const totalExpenses = sum(input.expenses.map(row => row.amount || 0))
  const cogs = sum(input.expenses.filter(row => COGS_CATEGORIES.has(row.category)).map(row => row.amount || 0))
  const labor = sum(input.expenses.filter(row => LABOR_CATEGORIES.has(row.category)).map(row => row.amount || 0))
  const financial = sum(input.expenses.filter(row => FINANCIAL_CATEGORIES.has(row.category)).map(row => row.amount || 0))
  const fixed = totalExpenses - cogs - labor - financial
  const professionalInvoices = input.expenses.filter(row => row.is_professional_invoice).length
  const issues: DataQualityIssue[] = []

  if (input.expenses.length === 0) {
    issues.push(issue('costs.missing', 'costs', 'MISSING', 'critical', 'No hay gastos registrados en el periodo.', ['operating_expenses.amount']))
  }

  if (input.expenses.some(row => row.amount < 0)) {
    issues.push(issue('costs.negative_adjustments', 'costs', 'PARTIAL', 'info', 'Hay gastos negativos; se tratan como correcciones y deben revisarse en anexos.', ['operating_expenses.amount']))
  }

  const metrics: ReportMetric[] = [
    { id: 'expenses_total', label: 'Gastos totales', value: round(totalExpenses), unit: 'eur', kind: 'actual', sourceIds: ['operating_expenses.amount'] },
    { id: 'cogs_expenses', label: 'Coste de producto', value: round(cogs), unit: 'eur', kind: 'actual', sourceIds: ['operating_expenses.amount'] },
    { id: 'labor_expenses', label: 'Coste de personal registrado', value: round(labor), unit: 'eur', kind: 'actual', sourceIds: ['operating_expenses.amount'] },
    { id: 'fixed_operating_expenses', label: 'Estructura y operación', value: round(fixed), unit: 'eur', kind: 'derived', sourceIds: ['operating_expenses.amount'] },
    { id: 'professional_invoice_count', label: 'Gastos con factura profesional', value: professionalInvoices, unit: 'count', kind: 'actual', sourceIds: ['operating_expenses.amount'] },
  ]

  return {
    id: 'costs',
    title: 'Costes',
    quality: buildQuality('costs', issues, [evidence('operating_expenses.amount', ['operating_expenses'], input.expenses.length)]),
    metrics,
    narrative: input.expenses.length > 0
      ? [`El periodo recoge ${input.expenses.length} movimientos de gasto por ${round(totalExpenses)} EUR.`]
      : ['No se puede analizar estructura de costes sin gastos registrados.'],
  }
}

function buildStaffSection(input: ProfessionalReportInput): ProfessionalReportSection {
  const activeEmployees = input.employees.filter(row => row.status === 'ACTIVE').length
  const inactiveEmployees = input.employees.length - activeEmployees
  const shiftCost = sum(input.shifts.map(row => row.actual_cost ?? row.estimated_cost ?? 0))
  const issues: DataQualityIssue[] = []

  if (input.employees.length === 0) {
    issues.push(issue('staff.no_employees', 'staff', 'MISSING', 'warning', 'No hay empleados registrados.', ['employees.active']))
  }

  if (input.shifts.length === 0) {
    issues.push(issue('staff.no_shifts', 'staff', 'PARTIAL', 'warning', 'No hay turnos registrados para contrastar coste laboral operativo.', ['shifts.cost']))
  }

  return {
    id: 'staff',
    title: 'Personal',
    quality: buildQuality('staff', issues, [
      evidence('employees.active', ['employees'], input.employees.length),
      evidence('shifts.cost', ['shifts'], input.shifts.length),
    ]),
    metrics: [
      { id: 'active_employees', label: 'Empleados activos', value: activeEmployees, unit: 'count', kind: 'actual', sourceIds: ['employees.active'] },
      { id: 'inactive_employees', label: 'Empleados inactivos', value: inactiveEmployees, unit: 'count', kind: 'actual', sourceIds: ['employees.active'] },
      { id: 'shift_count', label: 'Turnos registrados', value: input.shifts.length, unit: 'count', kind: 'actual', sourceIds: ['shifts.cost'] },
      { id: 'shift_cost', label: 'Coste de turnos', value: round(shiftCost), unit: 'eur', kind: 'actual', sourceIds: ['shifts.cost'] },
    ],
    narrative: activeEmployees > 0
      ? [`La plantilla activa registrada es de ${activeEmployees} personas.`]
      : ['No se puede valorar productividad de personal sin plantilla registrada.'],
  }
}

function buildSuppliersSection(input: ProfessionalReportInput): ProfessionalReportSection {
  const completedInvoices = input.invoices.filter(row => row.status === 'completed')
  const supplierSpend = sum(completedInvoices.map(row => row.total_amount || 0))
  const scoredSuppliers = input.suppliers.filter(row => typeof row.reliability_score === 'number')
  const averageReliability = scoredSuppliers.length > 0
    ? round(sum(scoredSuppliers.map(row => row.reliability_score || 0)) / scoredSuppliers.length, 1)
    : null
  const issues: DataQualityIssue[] = []

  if (input.suppliers.length === 0) {
    issues.push(issue('suppliers.missing', 'suppliers', 'MISSING', 'warning', 'No hay proveedores registrados.', ['suppliers.scorecard']))
  }

  if (completedInvoices.length === 0) {
    issues.push(issue('suppliers.no_completed_invoices', 'suppliers', 'PARTIAL', 'warning', 'No hay facturas completadas en el periodo para medir compras reales.', ['invoices.completed_spend']))
  }

  return {
    id: 'suppliers',
    title: 'Proveedores',
    quality: buildQuality('suppliers', issues, [
      evidence('suppliers.scorecard', ['suppliers'], input.suppliers.length),
      evidence('invoices.completed_spend', ['invoices'], completedInvoices.length),
    ]),
    metrics: [
      { id: 'supplier_count', label: 'Proveedores registrados', value: input.suppliers.length, unit: 'count', kind: 'actual', sourceIds: ['suppliers.scorecard'] },
      { id: 'completed_invoice_spend', label: 'Compras en facturas completadas', value: round(supplierSpend), unit: 'eur', kind: 'actual', sourceIds: ['invoices.completed_spend'] },
      { id: 'average_supplier_reliability', label: 'Fiabilidad media', value: averageReliability, unit: 'pct', kind: averageReliability === null ? 'not_available' : 'derived', sourceIds: ['suppliers.scorecard'] },
    ],
    narrative: completedInvoices.length > 0
      ? [`Las facturas completadas suman ${round(supplierSpend)} EUR en compras del periodo.`]
      : ['La lectura de compras queda limitada hasta completar facturas del periodo.'],
  }
}

function buildMenuPerformanceSection(input: ProfessionalReportInput, sales: ProfessionalReportSection): ProfessionalReportSection {
  const revenue = Number(sales.metrics.find(metric => metric.id === 'revenue_total')?.value || 0)
  const recipeById = new Map(input.recipes.map(recipe => [recipe.id, recipe]))
  const quantityByRecipe = input.recipeSales.reduce<Map<string, number>>((acc, row) => {
    acc.set(row.recipe_id, (acc.get(row.recipe_id) || 0) + (row.quantity_sold || 0))
    return acc
  }, new Map<string, number>())

  const soldRecipes = Array.from(quantityByRecipe.entries())
    .map(([recipeId, quantity]) => {
      const recipe = recipeById.get(recipeId)
      const price = recipe?.selling_price ?? 0
      const cost = recipe?.current_cost ?? 0
      const estimatedRevenue = quantity * price
      const estimatedCost = quantity * cost
      const estimatedProfit = estimatedRevenue - estimatedCost

      return {
        recipeId,
        name: recipe?.name ?? 'Receta no encontrada',
        quantity,
        price,
        cost,
        estimatedRevenue,
        estimatedCost,
        estimatedProfit,
        marginPct: estimatedRevenue > 0 ? pct(estimatedProfit, estimatedRevenue) : null,
        hasRecipe: Boolean(recipe),
      }
    })
    .filter(item => item.quantity > 0)

  const totalUnits = sum(soldRecipes.map(item => item.quantity))
  const estimatedRevenue = sum(soldRecipes.map(item => item.estimatedRevenue))
  const estimatedCost = sum(soldRecipes.map(item => item.estimatedCost))
  const estimatedProfit = estimatedRevenue - estimatedCost
  const menuRevenueCoveragePct = revenue > 0 ? pct(estimatedRevenue, revenue) : null
  const topByProfit = [...soldRecipes].sort((a, b) => b.estimatedProfit - a.estimatedProfit)[0] ?? null
  const lowestMargin = [...soldRecipes]
    .filter(item => item.marginPct !== null)
    .sort((a, b) => (a.marginPct ?? 0) - (b.marginPct ?? 0))[0] ?? null
  const topByUnits = [...soldRecipes].sort((a, b) => b.quantity - a.quantity)[0] ?? null
  const issues: DataQualityIssue[] = []

  if (input.recipeSales.length === 0) {
    issues.push(issue('menu.no_recipe_sales', 'menu_performance', 'PARTIAL', 'warning', 'No hay ventas por receta registradas; la lectura de carta queda pendiente.', ['daily_recipe_sales.quantity']))
  }

  const missingRecipes = soldRecipes.filter(item => !item.hasRecipe).length
  if (missingRecipes > 0) {
    issues.push(issue('menu.recipe_link_missing', 'menu_performance', 'PARTIAL', 'warning', `${missingRecipes} recetas vendidas no se pudieron cruzar con su ficha tecnica.`, ['daily_recipe_sales.quantity', 'recipes.recipe_cost']))
  }

  const missingPriceOrCost = soldRecipes.filter(item => item.hasRecipe && (item.price <= 0 || item.cost <= 0)).length
  if (missingPriceOrCost > 0) {
    issues.push(issue('menu.price_or_cost_missing', 'menu_performance', 'PARTIAL', 'warning', `${missingPriceOrCost} recetas vendidas no tienen PVP o coste actual suficiente.`, ['recipes.recipe_cost']))
  }

  const metrics: ReportMetric[] = [
    { id: 'sold_recipe_count', label: 'Recetas con venta', value: soldRecipes.length, unit: 'count', kind: 'actual', sourceIds: ['daily_recipe_sales.quantity'] },
    { id: 'menu_units_sold', label: 'Unidades vendidas de carta', value: totalUnits, unit: 'count', kind: 'actual', sourceIds: ['daily_recipe_sales.quantity'] },
    { id: 'estimated_menu_revenue', label: 'Venta estimada por receta', value: round(estimatedRevenue), unit: 'eur', kind: soldRecipes.length > 0 ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
    { id: 'estimated_menu_cost', label: 'Coste estimado de carta', value: round(estimatedCost), unit: 'eur', kind: soldRecipes.length > 0 ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
    { id: 'estimated_menu_profit', label: 'Margen bruto estimado de carta', value: round(estimatedProfit), unit: 'eur', kind: soldRecipes.length > 0 ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
    { id: 'menu_revenue_coverage_pct', label: 'Cobertura vs ventas diarias', value: menuRevenueCoveragePct, unit: 'pct', kind: menuRevenueCoveragePct === null ? 'not_available' : 'derived', sourceIds: ['daily_recipe_sales.quantity', 'daily_sales.revenue', 'recipes.recipe_cost'] },
    { id: 'top_profit_recipe', label: 'Producto que mas margen aporta', value: topByProfit?.name ?? null, unit: 'text', kind: topByProfit ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
    { id: 'top_profit_recipe_margin', label: 'Margen aportado por producto lider', value: topByProfit ? round(topByProfit.estimatedProfit) : null, unit: 'eur', kind: topByProfit ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
    { id: 'top_units_recipe', label: 'Producto mas vendido', value: topByUnits?.name ?? null, unit: 'text', kind: topByUnits ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity'] },
    { id: 'lowest_margin_recipe', label: 'Producto con menor margen porcentual', value: lowestMargin?.name ?? null, unit: 'text', kind: lowestMargin ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
    { id: 'lowest_margin_pct', label: 'Menor margen porcentual', value: lowestMargin?.marginPct ?? null, unit: 'pct', kind: lowestMargin ? 'derived' : 'not_available', sourceIds: ['daily_recipe_sales.quantity', 'recipes.recipe_cost'] },
  ]

  const narrative = soldRecipes.length > 0 && topByProfit
    ? [`${topByProfit.name} aporta ${round(topByProfit.estimatedProfit)} EUR de margen bruto estimado sobre ${topByProfit.quantity} unidades vendidas.`]
    : ['La carta no debe analizarse por producto hasta registrar ventas por receta y fichas tecnicas completas.']

  if (lowestMargin && lowestMargin.name !== topByProfit?.name) {
    narrative.push(`${lowestMargin.name} es el producto vendido con menor margen porcentual estimado (${lowestMargin.marginPct}%).`)
  }

  if (menuRevenueCoveragePct !== null && menuRevenueCoveragePct < 80) {
    narrative.push(`Las ventas por receta explican el ${menuRevenueCoveragePct}% de las ventas diarias; conviene mejorar la captura antes de sacar conclusiones de mix.`)
  }

  return {
    id: 'menu_performance',
    title: 'Carta',
    quality: buildQuality('menu_performance', issues, [
      evidence('daily_recipe_sales.quantity', ['daily_recipe_sales'], input.recipeSales.length),
      evidence('recipes.recipe_cost', ['recipes'], input.recipes.length),
    ]),
    metrics,
    narrative,
  }
}

function buildProfitabilitySection(input: ProfessionalReportInput, sales: ProfessionalReportSection, costs: ProfessionalReportSection, staff: ProfessionalReportSection): ProfessionalReportSection {
  const revenue = Number(sales.metrics.find(metric => metric.id === 'revenue_total')?.value || 0)
  const expenses = Number(costs.metrics.find(metric => metric.id === 'expenses_total')?.value || 0)
  const cogs = Number(costs.metrics.find(metric => metric.id === 'cogs_expenses')?.value || 0)
  const laborFromExpenses = Number(costs.metrics.find(metric => metric.id === 'labor_expenses')?.value || 0)
  const laborFromShifts = Number(staff.metrics.find(metric => metric.id === 'shift_cost')?.value || 0)
  const laborForPrimeCost = laborFromExpenses > 0 ? laborFromExpenses : laborFromShifts
  const netProfit = revenue - expenses
  const primeCost = cogs + laborForPrimeCost
  const targets = averageTargets(input)
  const revenueTargetCompletionPct = targets && targets.revenueTarget > 0 ? pct(revenue, targets.revenueTarget) : null
  const cogsPct = revenue > 0 ? pct(cogs, revenue) : null
  const laborPct = revenue > 0 ? pct(laborForPrimeCost, revenue) : null
  const cogsVsTargetDelta = targets && cogsPct !== null ? round(cogsPct - targets.cogsTargetPct, 2) : null
  const laborVsTargetDelta = targets && laborPct !== null ? round(laborPct - targets.laborTargetPct, 2) : null
  const issues: DataQualityIssue[] = []

  if (sales.quality.status === 'MISSING' || costs.quality.status === 'MISSING') {
    issues.push(issue('profitability.inputs_missing', 'profitability', 'MISSING', 'critical', 'Faltan ventas o gastos; no se puede calcular rentabilidad con rigor.', ['daily_sales.revenue', 'operating_expenses.amount']))
  }

  if (laborFromExpenses === 0 && laborFromShifts > 0) {
    issues.push(issue('profitability.labor_from_shifts', 'profitability', 'PARTIAL', 'info', 'El prime cost usa coste de turnos porque no hay gastos de personal registrados.', ['shifts.cost']))
  }

  const metrics: ReportMetric[] = [
    { id: 'net_profit', label: 'Resultado estimado', value: round(netProfit), unit: 'eur', kind: 'derived', sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'] },
    { id: 'net_margin_pct', label: 'Margen neto estimado', value: pct(netProfit, revenue), unit: 'pct', kind: revenue > 0 ? 'derived' : 'not_available', sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'] },
    { id: 'prime_cost', label: 'Prime cost', value: round(primeCost), unit: 'eur', kind: 'derived', sourceIds: ['operating_expenses.amount', laborFromExpenses > 0 ? 'operating_expenses.amount' : 'shifts.cost'] },
    { id: 'prime_cost_pct', label: 'Prime cost sobre ventas', value: pct(primeCost, revenue), unit: 'pct', kind: revenue > 0 ? 'derived' : 'not_available', sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'] },
  ]

  if (targets) {
    metrics.push(
      { id: 'revenue_target', label: 'Objetivo de ventas', value: targets.revenueTarget, unit: 'eur', kind: 'actual', sourceIds: ['monthly_targets.targets'] },
      { id: 'revenue_target_completion_pct', label: 'Cumplimiento objetivo ventas', value: revenueTargetCompletionPct, unit: 'pct', kind: revenueTargetCompletionPct === null ? 'not_available' : 'derived', sourceIds: ['daily_sales.revenue', 'monthly_targets.targets'] },
      { id: 'cogs_target_pct', label: 'Objetivo materia prima', value: targets.cogsTargetPct, unit: 'pct', kind: 'actual', sourceIds: ['monthly_targets.targets'] },
      { id: 'cogs_vs_target_delta_pct', label: 'Desvío materia prima vs objetivo', value: cogsVsTargetDelta, unit: 'pct', kind: cogsVsTargetDelta === null ? 'not_available' : 'derived', sourceIds: ['daily_sales.revenue', 'operating_expenses.amount', 'monthly_targets.targets'] },
      { id: 'labor_target_pct', label: 'Objetivo personal', value: targets.laborTargetPct, unit: 'pct', kind: 'actual', sourceIds: ['monthly_targets.targets'] },
      { id: 'labor_vs_target_delta_pct', label: 'Desvío personal vs objetivo', value: laborVsTargetDelta, unit: 'pct', kind: laborVsTargetDelta === null ? 'not_available' : 'derived', sourceIds: ['daily_sales.revenue', 'operating_expenses.amount', 'monthly_targets.targets'] },
    )
  }

  const narrative = revenue > 0 && expenses > 0
    ? [`El resultado estimado del periodo es ${round(netProfit)} EUR, con un margen neto del ${pct(netProfit, revenue)}%.`]
    : ['La rentabilidad no debe presentarse como conclusión mientras falten ventas o gastos.']

  if (targets && revenueTargetCompletionPct !== null) {
    narrative.push(`Las ventas alcanzan el ${revenueTargetCompletionPct}% del objetivo configurado (${round(revenue)} EUR sobre ${targets.revenueTarget} EUR).`)
  }

  if (targets && cogsVsTargetDelta !== null && laborVsTargetDelta !== null) {
    narrative.push(`Materia prima queda ${Math.abs(cogsVsTargetDelta)} puntos ${cogsVsTargetDelta <= 0 ? 'por debajo' : 'por encima'} del objetivo y personal ${Math.abs(laborVsTargetDelta)} puntos ${laborVsTargetDelta <= 0 ? 'por debajo' : 'por encima'} del objetivo.`)
  }

  return {
    id: 'profitability',
    title: 'Rentabilidad',
    quality: buildQuality('profitability', issues, [
      evidence('daily_sales.revenue', ['daily_sales'], input.sales.length),
      evidence('operating_expenses.amount', ['operating_expenses'], input.expenses.length),
      evidence(laborFromExpenses > 0 ? 'operating_expenses.amount' : 'shifts.cost', laborFromExpenses > 0 ? ['operating_expenses'] : ['shifts'], laborFromExpenses > 0 ? input.expenses.length : input.shifts.length),
      evidence('monthly_targets.targets', ['monthly_targets'], targets?.rowCount ?? 0),
    ]),
    metrics,
    narrative,
  }
}

function buildRecommendationsSection(sections: ProfessionalReportSection[]): ProfessionalReportSection {
  const sourceIssues = sections.flatMap(section => section.quality.issues)
  const criticalIssues = sourceIssues.filter(item => item.severity === 'critical')
  const metrics: ReportMetric[] = [
    { id: 'critical_data_issues', label: 'Bloqueos críticos de dato', value: criticalIssues.length, unit: 'count', kind: 'derived', sourceIds: criticalIssues.flatMap(item => item.sourceIds) },
    { id: 'total_data_issues', label: 'Incidencias de dato', value: sourceIssues.length, unit: 'count', kind: 'derived', sourceIds: sourceIssues.flatMap(item => item.sourceIds) },
  ]

  const narrative = criticalIssues.length > 0
    ? ['Antes de emitir recomendaciones de negocio al cliente, hay que resolver los bloqueos críticos de dato.']
    : ['El informe puede emitir recomendaciones operativas trazables con los datos disponibles.']

  return {
    id: 'recommendations',
    title: 'Recomendaciones',
    quality: buildQuality('recommendations', [], []),
    metrics,
    narrative,
  }
}

function buildDataAppendixSection(input: ProfessionalReportInput, sections: ProfessionalReportSection[]): ProfessionalReportSection {
  const evidenceRows = sections.flatMap(section => section.quality.evidence)

  return {
    id: 'data_appendix',
    title: 'Anexo de datos',
    quality: buildQuality('data_appendix', [], evidenceRows),
    metrics: [
      { id: 'source_count', label: 'Fuentes declaradas', value: PROFESSIONAL_REPORT_SOURCE_MAP.length, unit: 'count', kind: 'actual', sourceIds: PROFESSIONAL_REPORT_SOURCE_MAP.map(source => source.id) },
      { id: 'period_days', label: 'Días del periodo', value: input.period.days, unit: 'days', kind: 'actual', sourceIds: [] },
    ],
    narrative: ['Cada métrica del informe queda conectada a fuentes, tablas y calidad de dato.'],
  }
}

function globalStatus(sections: ProfessionalReportSection[]): DataQualityStatus {
  const statuses = sections.map(section => section.quality.status)
  if (statuses.includes('CONFLICT')) return 'CONFLICT'
  if (statuses.includes('MISSING')) return 'MISSING'
  if (statuses.includes('PARTIAL')) return 'PARTIAL'
  return 'OK'
}

export function buildProfessionalRestaurantReport(input: ProfessionalReportInput): ProfessionalRestaurantReport {
  const sales = buildSalesSection(input)
  const costs = buildCostsSection(input)
  const staff = buildStaffSection(input)
  const suppliers = buildSuppliersSection(input)
  const menuPerformance = buildMenuPerformanceSection(input, sales)
  const profitability = buildProfitabilitySection(input, sales, costs, staff)
  const recommendations = buildRecommendationsSection([sales, costs, staff, suppliers, menuPerformance, profitability])
  const dataAppendix = buildDataAppendixSection(input, [sales, costs, staff, suppliers, menuPerformance, profitability])
  const sections = [sales, costs, staff, suppliers, menuPerformance, profitability, recommendations, dataAppendix]
  const issues = sections.flatMap(section => section.quality.issues)
  const status = globalStatus(sections)
  const confidence = Math.max(0, Math.round(sum(sections.map(section => section.quality.confidence)) / sections.length))

  return {
    schemaVersion: 'professional-report/v1',
    generatedAt: input.generatedAt || new Date().toISOString(),
    restaurant: input.restaurant,
    period: input.period,
    quality: { status, confidence, issues },
    sourceMap: PROFESSIONAL_REPORT_SOURCE_MAP,
    executiveSummary: {
      headline: status === 'OK'
        ? 'Informe listo para revisión profesional.'
        : 'Informe en borrador: hay incidencias de calidad de dato que revisar.',
      keyFindings: sections
        .filter(section => section.id !== 'data_appendix')
        .flatMap(section => section.narrative)
        .slice(0, 6),
      blockingIssues: issues.filter(item => item.severity === 'critical'),
    },
    sections,
  }
}
