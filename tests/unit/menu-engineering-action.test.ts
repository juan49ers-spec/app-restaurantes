import { beforeEach, describe, expect, it, vi } from 'vitest'

const REPORT_ID = '550e8400-e29b-41d4-a716-446655440001'
const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const ITEM_1_ID = '550e8400-e29b-41d4-a716-446655440101'
const ITEM_2_ID = '550e8400-e29b-41d4-a716-446655440102'
const ITEM_3_ID = '550e8400-e29b-41d4-a716-446655440103'
const ITEM_4_ID = '550e8400-e29b-41d4-a716-446655440104'

const reportItems = [
  { id: ITEM_1_ID, report_id: REPORT_ID, recipe_id: 'recipe-1', quantity_sold: 18, cost_per_unit: 2, price_per_unit: 20 },
  { id: ITEM_2_ID, report_id: REPORT_ID, recipe_id: 'recipe-2', quantity_sold: 40, cost_per_unit: 3, price_per_unit: 18 },
  { id: ITEM_3_ID, report_id: REPORT_ID, recipe_id: 'recipe-3', quantity_sold: 21, cost_per_unit: 8, price_per_unit: 10 },
  { id: ITEM_4_ID, report_id: REPORT_ID, recipe_id: 'recipe-4', quantity_sold: 21, cost_per_unit: 9, price_per_unit: 10 },
]

const itemUpdates: Array<{ id: string; values: Record<string, unknown> }> = []
const reportUpdates: Array<{ id: string; values: Record<string, unknown> }> = []
const reportDeletes: Array<{ filters: Array<{ column: string; value: unknown }> }> = []
const queryCalls: Array<{
  table: string
  operation: 'select' | 'update' | 'delete' | 'upsert' | null
  filters: Array<{ column: string; value: unknown }>
}> = []
type MockQueryResult = { data: unknown; error: { message: string } | null }

class MockQuery {
  private filters: Array<{ column: string; value: unknown }> = []

  constructor(
    private readonly table: string,
    private readonly operation: 'select' | 'update' | 'delete' | 'upsert' | null = null,
    private readonly values: Record<string, unknown> | null = null
  ) {}

  select() {
    return new MockQuery(this.table, 'select')
  }

  update(values: Record<string, unknown>) {
    return new MockQuery(this.table, 'update', values)
  }

  delete() {
    return new MockQuery(this.table, 'delete')
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
    this.filters.push({ column, value })
    return this
  }

  single() {
    return Promise.resolve(this.resolve())
  }

  maybeSingle() {
    return Promise.resolve(this.resolve())
  }

  order() {
    return this
  }

  then(resolve: (value: MockQueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolve()).then(resolve, reject)
  }

  private resolve() {
    queryCalls.push({ table: this.table, operation: this.operation, filters: this.filters })

    if (this.table === 'menu_reports' && this.operation === 'select') {
      const idFilter = this.filters.find((filter) => filter.column === 'id')?.value
      const restaurantFilter = this.filters.find((filter) => filter.column === 'restaurant_id')?.value
      if (idFilter === REPORT_ID && restaurantFilter === RESTAURANT_ID) {
        return { data: { id: REPORT_ID, restaurant_id: RESTAURANT_ID }, error: null }
      }

      return { data: null, error: { message: 'Report not found' } }
    }

    if (this.table === 'menu_report_items' && this.operation === 'select') {
      const idFilter = this.filters.find((filter) => filter.column === 'id')?.value
      if (idFilter) {
        return { data: reportItems.find((item) => item.id === idFilter) ?? null, error: null }
      }

      return { data: reportItems, error: null }
    }

    if (this.table === 'menu_report_items' && this.operation === 'update') {
      itemUpdates.push({
        id: String(this.filters.find((filter) => filter.column === 'id')?.value),
        values: this.values ?? {},
      })
      return { data: null, error: null }
    }

    if (this.table === 'menu_reports' && this.operation === 'update') {
      reportUpdates.push({
        id: String(this.filters.find((filter) => filter.column === 'id')?.value),
        values: this.values ?? {},
      })
      return { data: null, error: null }
    }

    if (this.table === 'menu_reports' && this.operation === 'delete') {
      reportDeletes.push({ filters: this.filters })
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
    reportDeletes.length = 0
    queryCalls.length = 0
  })

  it('updates quantities only after proving the item belongs to the active restaurant', async () => {
    const { updateReportItem } = await import('@/app/actions/menu-engineering')

    const result = await updateReportItem({ item_id: ITEM_1_ID, quantity_sold: 7 })

    expect(result.success).toBe(true)
    expect(queryCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'menu_reports',
          operation: 'select',
          filters: expect.arrayContaining([
            { column: 'id', value: REPORT_ID },
            { column: 'restaurant_id', value: RESTAURANT_ID },
          ]),
        }),
      ])
    )
    expect(itemUpdates).toEqual([
      {
        id: ITEM_1_ID,
        values: { quantity_sold: 7 },
      },
    ])
    expect(queryCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'menu_report_items',
          operation: 'update',
          filters: expect.arrayContaining([
            { column: 'id', value: ITEM_1_ID },
            { column: 'report_id', value: REPORT_ID },
          ]),
        }),
      ])
    )
  })

  it('deletes reports only inside the active restaurant', async () => {
    const { deleteReport } = await import('@/app/actions/menu-engineering')

    const result = await deleteReport({ id: REPORT_ID })

    expect(result.success).toBe(true)
    expect(reportDeletes).toEqual([
      {
        filters: expect.arrayContaining([
          { column: 'id', value: REPORT_ID },
          { column: 'restaurant_id', value: RESTAURANT_ID },
        ]),
      },
    ])
  })

  it('persists classifications using the shared average mix threshold', async () => {
    const { calculateMatrix } = await import('@/app/actions/menu-engineering')

    const result = await calculateMatrix({ reportId: REPORT_ID })

    expect(result.success).toBe(true)
    expect(itemUpdates).toHaveLength(4)

    const borderline = itemUpdates.find((update) => update.id === ITEM_1_ID)
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
    expect(queryCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'menu_reports',
          operation: 'select',
          filters: expect.arrayContaining([
            { column: 'id', value: REPORT_ID },
            { column: 'restaurant_id', value: RESTAURANT_ID },
          ]),
        }),
        expect.objectContaining({
          table: 'menu_reports',
          operation: 'update',
          filters: expect.arrayContaining([
            { column: 'id', value: REPORT_ID },
            { column: 'restaurant_id', value: RESTAURANT_ID },
          ]),
        }),
      ])
    )
  })
})
