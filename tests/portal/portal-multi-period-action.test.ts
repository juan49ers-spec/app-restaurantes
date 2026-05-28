import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string } | null }
type Filter = ['eq' | 'gte' | 'lte', string, unknown]

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

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
    if (this.table === 'daily_sales') {
      return {
        data: [
          { date: '2026-03-05', revenue_total: 12000 },
          { date: '2026-04-05', revenue_total: 15000 },
          { date: '2026-05-05', revenue_total: 18000 },
        ],
        error: null,
      }
    }
    if (this.table === 'operating_expenses') {
      return {
        data: [
          { expense_date: '2026-03-10', amount: 8000 },
          { expense_date: '2026-04-10', amount: 9500 },
          { expense_date: '2026-05-10', amount: 11200 },
        ],
        error: null,
      }
    }
    return { data: [], error: null }
  }
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => new MockQuery(table),
  })),
}))

describe('getPortalMultiPeriodTrendForRestaurant', () => {
  beforeEach(() => {
    calls = []
  })

  it('loads three-month trend data scoped to the active restaurant period', async () => {
    const { getPortalMultiPeriodTrendForRestaurant } = await import('@/lib/portal')

    const result = await getPortalMultiPeriodTrendForRestaurant({
      restaurantId: RESTAURANT_ID,
      periodFrom: '2026-05-01',
      periodTo: '2026-05-31',
    })

    expect(result.success).toBe(true)
    expect(result.data?.periods.map(period => period.label)).toEqual(['Mar 2026', 'Abr 2026', 'May 2026'])
    expect(result.data?.periods[2]?.netResult).toBe(6800)
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'daily_sales',
        select: 'date, revenue_total',
        filters: expect.arrayContaining([
          ['eq', 'restaurant_id', RESTAURANT_ID],
          ['gte', 'date', '2026-03-01'],
          ['lte', 'date', '2026-05-31'],
        ]),
      }),
      expect.objectContaining({
        table: 'operating_expenses',
        select: 'expense_date, amount',
        filters: expect.arrayContaining([
          ['eq', 'restaurant_id', RESTAURANT_ID],
          ['gte', 'expense_date', '2026-03-01'],
          ['lte', 'expense_date', '2026-05-31'],
        ]),
      }),
    ]))
  })
})
