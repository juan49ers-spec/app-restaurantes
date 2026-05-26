import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

let mockRestaurantId: string | null = RESTAURANT_ID
let tableResults: Record<string, QueryResult> = {}
let calls: Array<{ table: string; filters: Array<[string, string, unknown]>; select?: string }> = []

class MockQuery {
  private filters: Array<[string, string, unknown]> = []
  private selectValue?: string

  constructor(private readonly table: string) {}

  select(value?: string) {
    this.selectValue = value
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push(['gte', column, value])
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push(['lte', column, value])
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.resolve())
  }

  single() {
    return Promise.resolve(this.resolve())
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolve()).then(resolve, reject)
  }

  private resolve(): QueryResult {
    calls.push({ table: this.table, filters: this.filters, select: this.selectValue })
    return tableResults[this.table] ?? { data: [], error: null }
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => new MockQuery(table)),
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => mockRestaurantId),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('professional-reporting server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRestaurantId = RESTAURANT_ID
    calls = []
    tableResults = {
      restaurants: { data: { id: RESTAURANT_ID, name: 'Demo Restaurante' }, error: null },
      daily_sales: {
        data: [
          {
            date: '2026-02-01',
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
          },
        ],
        error: null,
      },
      operating_expenses: {
        data: [
          { expense_date: '2026-02-01', category: 'PROVEEDORES_COMIDA', amount: 300, is_professional_invoice: true },
        ],
        error: null,
      },
      monthly_targets: {
        data: [{ month_year: '2026-02', revenue_target: 1200, cogs_target_pct: 30, labor_target_pct: 25 }],
        error: null,
      },
      employees: {
        data: [{ id: 'employee-1', role: 'FLOOR_STAFF', status: 'ACTIVE', hourly_rate: 12 }],
        error: null,
      },
      shifts: {
        data: [{ date: '2026-02-01', status: 'completed', actual_cost: 100 }],
        error: null,
      },
      suppliers: {
        data: [{ id: 'supplier-1', name: 'Proveedor', reliability_score: 90 }],
        error: null,
      },
      invoices: {
        data: [{ date: '2026-02-01', status: 'completed', total_amount: 300, supplier_id: 'supplier-1' }],
        error: null,
      },
      daily_recipe_sales: {
        data: [{ date: '2026-02-01', recipe_id: 'recipe-1', quantity_sold: 10 }],
        error: null,
      },
      recipes: {
        data: [{ id: 'recipe-1', name: 'Plato rentable', selling_price: 20, current_cost: 8 }],
        error: null,
      },
    }
  })

  it('loads every reporting source server-side and never accepts restaurant_id from input', async () => {
    const { getProfessionalReportDraft } = await import('@/app/actions/professional-reporting')

    const result = await getProfessionalReportDraft({ from: '2026-02-01', to: '2026-02-28' })

    expect(result.success).toBe(true)
    expect(result.data?.restaurant.id).toBe(RESTAURANT_ID)
    expect(result.data?.sections.map(section => section.id)).toContain('menu_performance')
    expect(calls.map(call => call.table)).toEqual(expect.arrayContaining([
      'restaurants',
      'daily_sales',
      'operating_expenses',
      'monthly_targets',
      'employees',
      'shifts',
      'suppliers',
      'invoices',
      'daily_recipe_sales',
      'recipes',
    ]))
    expect(calls.every(call => call.filters.some(filter => filter[1] !== 'restaurant_id' || filter[2] === RESTAURANT_ID))).toBe(true)
  })

  it('returns a clean validation error for invalid periods', async () => {
    const { getProfessionalReportDraft } = await import('@/app/actions/professional-reporting')

    const result = await getProfessionalReportDraft({ from: '2026-02-28', to: '2026-02-01' })

    expect(result).toEqual({ success: false, error: 'Periodo de informe inválido.' })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('does not query Supabase when no active restaurant exists', async () => {
    mockRestaurantId = null
    const { getProfessionalReportDraft } = await import('@/app/actions/professional-reporting')

    const result = await getProfessionalReportDraft({ from: '2026-02-01', to: '2026-02-28' })

    expect(result).toEqual({ success: false, error: 'No hay restaurante activo para generar el informe.' })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})
