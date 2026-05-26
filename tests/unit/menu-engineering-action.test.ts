import { beforeEach, describe, expect, it, vi } from 'vitest'

const REPORT_ID = '550e8400-e29b-41d4-a716-446655440001'
const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

const reportItems = [
  { id: 'item-1', report_id: REPORT_ID, recipe_id: 'recipe-1', quantity_sold: 18, cost_per_unit: 2, price_per_unit: 20 },
  { id: 'item-2', report_id: REPORT_ID, recipe_id: 'recipe-2', quantity_sold: 40, cost_per_unit: 3, price_per_unit: 18 },
  { id: 'item-3', report_id: REPORT_ID, recipe_id: 'recipe-3', quantity_sold: 21, cost_per_unit: 8, price_per_unit: 10 },
  { id: 'item-4', report_id: REPORT_ID, recipe_id: 'recipe-4', quantity_sold: 21, cost_per_unit: 9, price_per_unit: 10 },
]

const itemUpdates: Array<{ id: string; values: Record<string, unknown> }> = []
const reportUpdates: Array<{ id: string; values: Record<string, unknown> }> = []

class MockQuery {
  private filter: { column: string; value: unknown } | null = null

  constructor(
    private readonly table: string,
    private readonly operation: 'select' | 'update' | null = null,
    private readonly values: Record<string, unknown> | null = null
  ) {}

  select() {
    return new MockQuery(this.table, 'select')
  }

  update(values: Record<string, unknown>) {
    return new MockQuery(this.table, 'update', values)
  }

  upsert(values: Record<string, unknown>[]) {
    if (this.table === 'menu_report_items') {
      values.forEach((value) => {
        itemUpdates.push({ id: String(value.id), values: value })
      })
    }
    return this
  }

  eq(column: string, value: unknown) {
    this.filter = { column, value }
    return this
  }

  then(resolve: (value: { data: unknown; error: null }) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolve()).then(resolve, reject)
  }

  private resolve() {
    if (this.table === 'menu_report_items' && this.operation === 'select') {
      return { data: reportItems, error: null }
    }

    if (this.table === 'menu_report_items' && this.operation === 'update') {
      itemUpdates.push({ id: String(this.filter?.value), values: this.values ?? {} })
      return { data: null, error: null }
    }

    if (this.table === 'menu_reports' && this.operation === 'update') {
      reportUpdates.push({ id: String(this.filter?.value), values: this.values ?? {} })
      return { data: null, error: null }
    }

    return { data: null, error: null }
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => new MockQuery(table)),
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => RESTAURANT_ID),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('calculateMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    itemUpdates.length = 0
    reportUpdates.length = 0
  })

  it('persists classifications using the shared average mix threshold', async () => {
    const { calculateMatrix } = await import('@/app/actions/menu-engineering')

    const result = await calculateMatrix({ reportId: REPORT_ID })

    expect(result.success).toBe(true)
    expect(itemUpdates).toHaveLength(4)

    const borderline = itemUpdates.find((update) => update.id === 'item-1')
    expect(borderline?.values.classification).toBe('PUZZLE')
    expect(borderline?.values.popularity_pct).toBeCloseTo(0.18)
    expect(borderline?.values.report_id).toBe(REPORT_ID)
    expect(borderline?.values.recipe_id).toBe('recipe-1')

    expect(reportUpdates).toEqual([
      {
        id: REPORT_ID,
        values: expect.objectContaining({
          status: 'ANALYZED',
          avg_popularity: 0.25,
          avg_margin: 9.87,
        }),
      },
    ])
  })
})
