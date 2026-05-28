import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string } | null }
type Filter = ['eq' | 'gte' | 'lte', string, unknown]

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

let callIndex = 0
let calls: Array<{ table: string; select?: string; filters: Filter[] }> = []

class MockQuery {
  private filters: Filter[] = []
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

  then(resolve: (value: QueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolve()).then(resolve, reject)
  }

  private resolve(): QueryResult {
    calls.push({ table: this.table, select: this.selectValue, filters: this.filters })
    const currentCallIndex = callIndex
    callIndex += 1
    if (this.table !== 'operating_expenses') return { data: [], error: null }
    if (currentCallIndex === 0) {
      return {
        data: [
          { category: 'PROVEEDORES_COMIDA', amount: 4200 },
          { category: 'SUMINISTROS', amount: 900 },
        ],
        error: null,
      }
    }
    return {
      data: [
        { category: 'PROVEEDORES_COMIDA', amount: 3600 },
        { category: 'SUMINISTROS', amount: 1200 },
      ],
      error: null,
    }
  }
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => new MockQuery(table),
  })),
}))

describe('getPortalExpenseBreakdownForRestaurant', () => {
  beforeEach(() => {
    callIndex = 0
    calls = []
  })

  it('loads current and previous expense categories scoped to restaurant', async () => {
    const { getPortalExpenseBreakdownForRestaurant } = await import('@/lib/portal')

    const result = await getPortalExpenseBreakdownForRestaurant({
      restaurantId: RESTAURANT_ID,
      periodFrom: '2026-05-01',
      periodTo: '2026-05-31',
    })

    expect(result.success).toBe(true)
    expect(result.data?.categories[0]).toEqual(expect.objectContaining({
      category: 'PROVEEDORES_COMIDA',
      currentAmount: 4200,
      previousAmount: 3600,
      delta: { value: 600, pct: 16.67 },
    }))
    expect(calls).toHaveLength(2)
    expect(calls[0]?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['gte', 'expense_date', '2026-05-01'],
      ['lte', 'expense_date', '2026-05-31'],
    ]))
    expect(calls[1]?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['gte', 'expense_date', '2026-04-01'],
      ['lte', 'expense_date', '2026-04-30'],
    ]))
  })
})
