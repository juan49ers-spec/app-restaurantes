import { describe, expect, it } from 'vitest'
import { buildProfessionalReportPresentation, buildProfessionalRestaurantReport } from '@/lib/reporting'
import type { ProfessionalReportInput } from '@/lib/reporting'

const baseInput: ProfessionalReportInput = {
  restaurant: { id: 'restaurant-1', name: 'Txiquita Tasca' },
  period: { from: '2026-02-01', to: '2026-02-10', days: 10 },
  generatedAt: '2026-05-25T10:00:00.000Z',
  sales: [],
  expenses: [],
  monthlyTargets: [],
  employees: [],
  shifts: [],
  suppliers: [],
  invoices: [],
  recipeSales: [],
  recipes: [],
  menuEngineeringReport: null,
}

describe('buildProfessionalRestaurantReport', () => {
  it('marks missing source data instead of inventing conclusions', () => {
    const report = buildProfessionalRestaurantReport(baseInput)

    expect(report.quality.status).toBe('MISSING')
    expect(report.executiveSummary.blockingIssues.map(issue => issue.id)).toContain('sales.missing')
    expect(report.sections.find(section => section.id === 'sales')?.quality.status).toBe('MISSING')
    expect(report.sections.find(section => section.id === 'profitability')?.metrics.find(metric => metric.id === 'net_margin_pct')?.kind).toBe('not_available')
  })

  it('detects sales conflicts when channel totals do not match revenue', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: [
        {
          date: '2026-02-01',
          revenue_total: 1000,
          revenue_dine_in: 700,
          revenue_takeout: 100,
          revenue_delivery: 50,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 50,
          labor_hours: 20,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
      ],
      expenses: [
        {
          expense_date: '2026-02-01',
          category: 'PROVEEDORES_COMIDA',
          amount: 300,
          is_professional_invoice: true,
        },
      ],
    })

    expect(report.quality.status).toBe('CONFLICT')
    expect(report.quality.issues.map(issue => issue.id)).toContain('sales.channel_conflict')
  })

  it('builds a traceable profitability draft when core data exists', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        revenue_total: 1000,
        revenue_dine_in: 800,
        revenue_takeout: 100,
        revenue_delivery: 100,
        base_10: 0,
        base_21: 0,
        tax_10: 0,
        tax_21: 0,
        total_covers: 40,
        labor_hours: 16,
        cost_of_goods: 0,
        labor_cost: 0,
        day_status: 'CLOSED',
      })),
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
        { expense_date: '2026-02-03', category: 'NOMINAS_LIQUIDAS', amount: 2500 },
        { expense_date: '2026-02-04', category: 'ALQUILER', amount: 1000 },
      ],
      employees: [
        { id: 'employee-1', role: 'FLOOR_STAFF', status: 'ACTIVE', hourly_rate: 12, monthly_base_salary: 0, contract_hours_weekly: 40 },
      ],
      shifts: [
        { date: '2026-02-02', status: 'completed', actual_cost: 120, estimated_cost: 100 },
      ],
      suppliers: [
        { id: 'supplier-1', name: 'Proveedor A', reliability_score: 90, trend_direction: 'stable', total_orders: 5, avg_price_variance: 0.02 },
      ],
      invoices: [
        { date: '2026-02-02', status: 'completed', total_amount: 2800, supplier_id: 'supplier-1' },
      ],
    })

    const profitability = report.sections.find(section => section.id === 'profitability')
    const netProfit = profitability?.metrics.find(metric => metric.id === 'net_profit')
    const primeCostPct = profitability?.metrics.find(metric => metric.id === 'prime_cost_pct')

    expect(report.quality.status).toBe('PARTIAL')
    expect(netProfit?.value).toBe(3700)
    expect(primeCostPct?.value).toBe(53)
    expect(report.sourceMap.map(source => source.id)).toContain('daily_sales.revenue')
  })

  it('builds a consulting-style presentation layer without changing source metrics', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        revenue_total: 1000,
        revenue_dine_in: 800,
        revenue_takeout: 100,
        revenue_delivery: 100,
        base_10: 0,
        base_21: 0,
        tax_10: 0,
        tax_21: 0,
        total_covers: 40,
        labor_hours: 16,
        cost_of_goods: 0,
        labor_cost: 0,
        day_status: 'CLOSED',
      })),
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
        { expense_date: '2026-02-03', category: 'NOMINAS_LIQUIDAS', amount: 2500 },
        { expense_date: '2026-02-04', category: 'ALQUILER', amount: 1000 },
      ],
      employees: [
        { id: 'employee-1', role: 'FLOOR_STAFF', status: 'ACTIVE', hourly_rate: 12, monthly_base_salary: 0, contract_hours_weekly: 40 },
      ],
      shifts: [
        { date: '2026-02-02', status: 'completed', actual_cost: 120, estimated_cost: 100 },
      ],
      suppliers: [
        { id: 'supplier-1', name: 'Proveedor A', reliability_score: 90, trend_direction: 'stable', total_orders: 5, avg_price_variance: 0.02 },
      ],
      invoices: [
        { date: '2026-02-02', status: 'completed', total_amount: 2800, supplier_id: 'supplier-1' },
      ],
    })

    const presentation = buildProfessionalReportPresentation(report)

    expect(presentation.eyebrow).toBe('Informe profesional de gestion')
    expect(presentation.kpis.map(kpi => kpi.id)).toEqual([
      'net_profit',
      'revenue_total',
      'net_margin_pct',
      'cogs_ratio',
      'labor_ratio',
      'prime_cost_pct',
    ])
    expect(presentation.chapters.map(chapter => chapter.title)).toEqual([
      'Resultados',
      'Ingresos',
      'Gastos',
      'Carta',
      'Proveedores',
      'Conclusiones',
    ])
    expect(presentation.conclusions.length).toBeGreaterThan(0)
    expect(presentation.conclusions[0].sourceIds.length).toBeGreaterThan(0)
  })

  it('compares revenue and cost ratios against monthly targets', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      monthlyTargets: [
        {
          month_year: '2026-02',
          revenue_target: 12000,
          cogs_target_pct: 30,
          labor_target_pct: 25,
        },
      ],
      sales: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        revenue_total: 1000,
        revenue_dine_in: 800,
        revenue_takeout: 100,
        revenue_delivery: 100,
        base_10: 0,
        base_21: 0,
        tax_10: 0,
        tax_21: 0,
        total_covers: 40,
        labor_hours: 16,
        cost_of_goods: 0,
        labor_cost: 0,
        day_status: 'CLOSED',
      })),
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
        { expense_date: '2026-02-03', category: 'NOMINAS_LIQUIDAS', amount: 2500 },
        { expense_date: '2026-02-04', category: 'ALQUILER', amount: 1000 },
      ],
    })

    const profitability = report.sections.find(section => section.id === 'profitability')

    expect(profitability?.metrics.find(metric => metric.id === 'revenue_target')?.value).toBe(12000)
    expect(profitability?.metrics.find(metric => metric.id === 'revenue_target_completion_pct')?.value).toBeCloseTo(83.33)
    expect(profitability?.metrics.find(metric => metric.id === 'cogs_vs_target_delta_pct')?.value).toBeCloseTo(-2)
    expect(profitability?.metrics.find(metric => metric.id === 'labor_vs_target_delta_pct')?.value).toBe(0)
    expect(profitability?.narrative.join(' ')).toContain('83.33% del objetivo')
  })

  it('adds weekday revenue diagnostics to sales', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: [
        {
          date: '2026-02-02',
          revenue_total: 500,
          revenue_dine_in: 500,
          revenue_takeout: 0,
          revenue_delivery: 0,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 20,
          labor_hours: 10,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
        {
          date: '2026-02-06',
          revenue_total: 1500,
          revenue_dine_in: 1500,
          revenue_takeout: 0,
          revenue_delivery: 0,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 60,
          labor_hours: 20,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
        {
          date: '2026-02-07',
          revenue_total: 2000,
          revenue_dine_in: 2000,
          revenue_takeout: 0,
          revenue_delivery: 0,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 80,
          labor_hours: 24,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
      ],
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 1000 },
      ],
    })

    const sales = report.sections.find(section => section.id === 'sales')

    expect(sales?.metrics.find(metric => metric.id === 'best_weekday')?.value).toBe('sábado')
    expect(sales?.metrics.find(metric => metric.id === 'best_weekday_revenue')?.value).toBe(2000)
    expect(sales?.metrics.find(metric => metric.id === 'weakest_weekday')?.value).toBe('lunes')
    expect(sales?.metrics.find(metric => metric.id === 'weekday_spread_pct')?.value).toBe(75)
    expect(sales?.narrative.join(' ')).toContain('sábado concentra')
    expect(sales?.narrative.join(' ')).toContain('75% por debajo')
  })

  it('surfaces target completion in the executive presentation when targets exist', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      monthlyTargets: [
        {
          month_year: '2026-02',
          revenue_target: 12000,
          cogs_target_pct: 30,
          labor_target_pct: 25,
        },
      ],
      sales: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        revenue_total: 1000,
        revenue_dine_in: 800,
        revenue_takeout: 100,
        revenue_delivery: 100,
        base_10: 0,
        base_21: 0,
        tax_10: 0,
        tax_21: 0,
        total_covers: 40,
        labor_hours: 16,
        cost_of_goods: 0,
        labor_cost: 0,
        day_status: 'CLOSED',
      })),
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
        { expense_date: '2026-02-03', category: 'NOMINAS_LIQUIDAS', amount: 2500 },
        { expense_date: '2026-02-04', category: 'ALQUILER', amount: 1000 },
      ],
      employees: [
        { id: 'employee-1', role: 'FLOOR_STAFF', status: 'ACTIVE', hourly_rate: 12, monthly_base_salary: 0, contract_hours_weekly: 40 },
      ],
      shifts: [
        { date: '2026-02-02', status: 'completed', actual_cost: 120, estimated_cost: 100 },
      ],
      suppliers: [
        { id: 'supplier-1', name: 'Proveedor A', reliability_score: 90, trend_direction: 'stable', total_orders: 5, avg_price_variance: 0.02 },
      ],
      invoices: [
        { date: '2026-02-02', status: 'completed', total_amount: 2800, supplier_id: 'supplier-1' },
      ],
    })

    const presentation = buildProfessionalReportPresentation(report)

    expect(presentation.kpis.find(kpi => kpi.id === 'target_completion')?.value).toBeCloseTo(83.33)
    expect(presentation.kpis.find(kpi => kpi.id === 'cogs_ratio')?.note).toBe('Objetivo 30%')
    expect(presentation.kpis.find(kpi => kpi.id === 'labor_ratio')?.note).toBe('Objetivo 25%')
    expect(presentation.conclusions.map(conclusion => conclusion.id)).toContain('target-read')
  })

  it('adds a traceable menu performance section from recipe sales and recipe costs', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: [
        {
          date: '2026-02-01',
          revenue_total: 350,
          revenue_dine_in: 350,
          revenue_takeout: 0,
          revenue_delivery: 0,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 20,
          labor_hours: 8,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
      ],
      expenses: [
        { expense_date: '2026-02-01', category: 'PROVEEDORES_COMIDA', amount: 120 },
      ],
      recipes: [
        { id: '11111111-1111-1111-1111-111111111111', name: 'Tortilla', selling_price: 20, current_cost: 8 },
        { id: '22222222-2222-2222-2222-222222222222', name: 'Croqueta', selling_price: 15, current_cost: 14 },
      ],
      recipeSales: [
        { date: '2026-02-01', recipe_id: '11111111-1111-1111-1111-111111111111', quantity_sold: 10 },
        { date: '2026-02-01', recipe_id: '22222222-2222-2222-2222-222222222222', quantity_sold: 10 },
      ],
    })

    const menu = report.sections.find(section => section.id === 'menu_performance')

    expect(menu?.quality.status).toBe('OK')
    expect(menu?.metrics.find(metric => metric.id === 'menu_units_sold')?.value).toBe(20)
    expect(menu?.metrics.find(metric => metric.id === 'estimated_menu_revenue')?.value).toBe(350)
    expect(menu?.metrics.find(metric => metric.id === 'estimated_menu_profit')?.value).toBe(130)
    expect(menu?.metrics.find(metric => metric.id === 'top_profit_recipe')?.value).toBe('Tortilla')
    expect(menu?.metrics.find(metric => metric.id === 'lowest_margin_recipe')?.value).toBe('Croqueta')
    expect(menu?.metrics.find(metric => metric.id === 'menu_revenue_coverage_pct')?.value).toBe(100)
    expect(menu?.narrative.join(' ')).toContain('Tortilla aporta')
    expect(report.sourceMap.map(source => source.id)).toContain('daily_recipe_sales.quantity')
  })

  it('adds a professional BCG section from an analyzed Menu Engineering snapshot', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: [
        {
          date: '2026-02-01',
          revenue_total: 800,
          revenue_dine_in: 800,
          revenue_takeout: 0,
          revenue_delivery: 0,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 40,
          labor_hours: 10,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
      ],
      expenses: [
        { expense_date: '2026-02-01', category: 'PROVEEDORES_COMIDA', amount: 240 },
      ],
      menuEngineeringReport: {
        id: 'menu-report-1',
        name: 'BCG febrero',
        date_from: '2026-02-01',
        date_to: '2026-02-10',
        avg_popularity: 0.25,
        avg_margin: 8.5,
        items: [
          { id: 'item-1', name: 'Tortilla', classification: 'STAR', quantity_sold: 40, contribution_margin: 12, total_sales: 800, total_profit: 480, popularity_pct: 0.4 },
          { id: 'item-2', name: 'Croqueta', classification: 'PLOWHORSE', quantity_sold: 30, contribution_margin: 3, total_sales: 300, total_profit: 90, popularity_pct: 0.3 },
          { id: 'item-3', name: 'Pulpo', classification: 'PUZZLE', quantity_sold: 10, contribution_margin: 18, total_sales: 250, total_profit: 180, popularity_pct: 0.1 },
          { id: 'item-4', name: 'Ensalada', classification: 'DOG', quantity_sold: 5, contribution_margin: 2, total_sales: 50, total_profit: 10, popularity_pct: 0.05 },
        ],
      },
    })

    const menuEngineering = report.sections.find(section => section.id === 'menu_engineering')

    expect(menuEngineering?.quality.status).toBe('OK')
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_report_name')?.value).toBe('BCG febrero')
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_star_count')?.value).toBe(1)
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_plowhorse_count')?.value).toBe(1)
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_puzzle_count')?.value).toBe(1)
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_dog_count')?.value).toBe(1)
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_top_star')?.value).toBe('Tortilla')
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_priority_puzzle')?.value).toBe('Pulpo')
    expect(menuEngineering?.narrative.join(' ')).toContain('Tortilla aparece como STAR')
    expect(report.sourceMap.map(source => source.id)).toContain('menu_engineering.report')
  })

  it('keeps the report usable but marks BCG as partial when there is no analyzed Menu Engineering snapshot', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: [
        {
          date: '2026-02-01',
          revenue_total: 1000,
          revenue_dine_in: 1000,
          revenue_takeout: 0,
          revenue_delivery: 0,
          base_10: 0,
          base_21: 0,
          tax_10: 0,
          tax_21: 0,
          total_covers: 40,
          labor_hours: 12,
          cost_of_goods: 0,
          labor_cost: 0,
          day_status: 'CLOSED',
        },
      ],
      expenses: [
        { expense_date: '2026-02-01', category: 'PROVEEDORES_COMIDA', amount: 300 },
      ],
      menuEngineeringReport: null,
    })

    const menuEngineering = report.sections.find(section => section.id === 'menu_engineering')

    expect(menuEngineering?.quality.status).toBe('PARTIAL')
    expect(menuEngineering?.quality.issues.map(issue => issue.id)).toContain('menu_engineering.no_analyzed_report')
    expect(menuEngineering?.metrics.find(metric => metric.id === 'bcg_report_name')?.kind).toBe('not_available')
    expect(report.executiveSummary.blockingIssues.map(issue => issue.id)).not.toContain('menu_engineering.no_analyzed_report')
  })

  it('does not block the full report when recipe sales are not available', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        revenue_total: 1000,
        revenue_dine_in: 1000,
        revenue_takeout: 0,
        revenue_delivery: 0,
        base_10: 0,
        base_21: 0,
        tax_10: 0,
        tax_21: 0,
        total_covers: 40,
        labor_hours: 16,
        cost_of_goods: 0,
        labor_cost: 0,
        day_status: 'CLOSED',
      })),
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
        { expense_date: '2026-02-03', category: 'NOMINAS_LIQUIDAS', amount: 2500 },
      ],
      employees: [
        { id: 'employee-1', role: 'FLOOR_STAFF', status: 'ACTIVE' },
      ],
      shifts: [
        { date: '2026-02-02', status: 'completed', actual_cost: 120 },
      ],
      suppliers: [
        { id: 'supplier-1', name: 'Proveedor A', reliability_score: 90 },
      ],
      invoices: [
        { date: '2026-02-02', status: 'completed', total_amount: 2800, supplier_id: 'supplier-1' },
      ],
      recipeSales: [],
      recipes: [
        { id: '11111111-1111-1111-1111-111111111111', name: 'Tortilla', selling_price: 20, current_cost: 8 },
      ],
    })

    const menu = report.sections.find(section => section.id === 'menu_performance')

    expect(menu?.quality.status).toBe('PARTIAL')
    expect(menu?.quality.issues[0]?.severity).toBe('warning')
    expect(report.quality.status).toBe('PARTIAL')
    expect(report.executiveSummary.blockingIssues.map(issue => issue.id)).not.toContain('menu.no_recipe_sales')
  })

  it('adds Menu Engineering to the professional presentation chapter without recalculating metrics', () => {
    const report = buildProfessionalRestaurantReport({
      ...baseInput,
      sales: Array.from({ length: 10 }, (_, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        revenue_total: 1000,
        revenue_dine_in: 1000,
        revenue_takeout: 0,
        revenue_delivery: 0,
        base_10: 0,
        base_21: 0,
        tax_10: 0,
        tax_21: 0,
        total_covers: 40,
        labor_hours: 16,
        cost_of_goods: 0,
        labor_cost: 0,
        day_status: 'CLOSED',
      })),
      expenses: [
        { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
      ],
      menuEngineeringReport: {
        id: 'menu-report-1',
        name: 'BCG febrero',
        date_from: '2026-02-01',
        date_to: '2026-02-10',
        avg_popularity: 0.5,
        avg_margin: 10,
        items: [
          { id: 'item-1', name: 'Tortilla', classification: 'STAR', quantity_sold: 40, contribution_margin: 12, total_sales: 800, total_profit: 480, popularity_pct: 0.67 },
          { id: 'item-2', name: 'Pulpo', classification: 'PUZZLE', quantity_sold: 20, contribution_margin: 18, total_sales: 500, total_profit: 360, popularity_pct: 0.33 },
        ],
      },
    })

    const presentation = buildProfessionalReportPresentation(report)
    const menuChapter = presentation.chapters.find(chapter => chapter.id === 'menu')

    expect(menuChapter?.sectionIds).toEqual(['menu_performance', 'menu_engineering'])
    expect(presentation.conclusions.map(conclusion => conclusion.id)).toContain('menu-engineering-read')
  })
})
