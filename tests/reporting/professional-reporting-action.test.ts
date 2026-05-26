import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

let mockRestaurantId: string | null = RESTAURANT_ID
let tableResults: Record<string, QueryResult> = {}
let calls: Array<{ table: string; filters: Array<[string, string, unknown]>; select?: string }> = []
let insertedDrafts: Record<string, unknown>[] = []
let draftInsertErrors: Array<{ message: string; code?: string } | null> = []

class MockQuery {
  private filters: Array<[string, string, unknown]> = []
  private selectValue?: string

  constructor(
    private readonly table: string,
    private readonly operation: 'select' | 'insert' | null = null,
    private readonly insertValue?: Record<string, unknown>
  ) {}

  select(value?: string) {
    this.selectValue = value
    return this
  }

  insert(value: Record<string, unknown>) {
    return new MockQuery(this.table, 'insert', value)
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

    if (this.table === 'professional_report_drafts' && this.operation === 'insert') {
      const nextError = draftInsertErrors.shift()
      if (nextError) {
        return { data: null, error: nextError }
      }

      const inserted = this.insertValue ?? {}
      insertedDrafts.push(inserted)

      return {
        data: {
          id: 'draft-1',
          period_from: inserted.period_from,
          period_to: inserted.period_to,
          version: inserted.version,
          status: inserted.status,
          schema_version: inserted.schema_version,
          created_at: '2026-02-28T10:00:00.000Z',
          updated_at: '2026-02-28T10:00:00.000Z',
          exported_at: null,
        },
        error: null,
      }
    }

    return tableResults[this.table] ?? { data: [], error: null }
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => new MockQuery(table)),
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    })),
  },
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
    insertedDrafts = []
    draftInsertErrors = []
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
      professional_report_drafts: {
        data: null,
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

  it('saves a regenerated server-side snapshot with sanitized narrative overrides', async () => {
    tableResults.professional_report_drafts = {
      data: { version: 2 },
      error: null,
    }
    const { saveProfessionalReportDraft } = await import('@/app/actions/professional-reporting')

    const result = await saveProfessionalReportDraft({
      period: { from: '2026-02-01', to: '2026-02-28' },
      status: 'REVIEWED',
      narrativeOverrides: {
        sales: '  Ventas revisadas  ',
        invalid_section: 'No debe guardarse',
      },
    })

    expect(result.success).toBe(true)
    expect(result.data?.version).toBe(3)
    expect(insertedDrafts).toHaveLength(1)
    expect(insertedDrafts[0]).toEqual(expect.objectContaining({
      restaurant_id: RESTAURANT_ID,
      period_from: '2026-02-01',
      period_to: '2026-02-28',
      version: 3,
      status: 'REVIEWED',
      created_by: 'user-1',
    }))
    expect(insertedDrafts[0].narrative_overrides).toEqual({
      sales: 'Ventas revisadas',
    })
    expect((insertedDrafts[0].report_snapshot as { restaurant: { id: string } }).restaurant.id).toBe(RESTAURANT_ID)
  })

  it('does not save when regenerated report belongs to a different restaurant', async () => {
    tableResults.restaurants = { data: { id: 'other-restaurant', name: 'Otro Restaurante' }, error: null }
    const { saveProfessionalReportDraft } = await import('@/app/actions/professional-reporting')

    const result = await saveProfessionalReportDraft({
      period: { from: '2026-02-01', to: '2026-02-28' },
      status: 'REVIEWED',
      narrativeOverrides: {},
    })

    expect(result).toEqual({ success: false, error: 'El informe no pertenece al restaurante activo.' })
    expect(insertedDrafts).toHaveLength(0)
  })

  it('retries once when the next draft version collides', async () => {
    tableResults.professional_report_drafts = {
      data: { version: 1 },
      error: null,
    }
    draftInsertErrors = [{ message: 'duplicate key', code: '23505' }, null]
    const { saveProfessionalReportDraft } = await import('@/app/actions/professional-reporting')

    const result = await saveProfessionalReportDraft({
      period: { from: '2026-02-01', to: '2026-02-28' },
      status: 'DRAFT',
      narrativeOverrides: {},
    })

    expect(result.success).toBe(true)
    expect(insertedDrafts).toHaveLength(1)
    expect(calls.filter(call => call.table === 'professional_report_drafts' && call.select === 'version')).toHaveLength(2)
  })
})
