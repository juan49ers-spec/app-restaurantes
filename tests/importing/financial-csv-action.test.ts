import { beforeEach, describe, expect, it, vi } from 'vitest'

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

let mockRestaurantId: string | null = RESTAURANT_ID
let calls: Array<{
  table: string
  operation: 'insert' | 'upsert'
  rows: unknown[]
  options?: Record<string, unknown>
}> = []
let mutationError: { message: string } | null = null

class MockQuery {
  private operation: 'insert' | 'upsert' | null = null
  private rows: unknown[] = []
  private options?: Record<string, unknown>

  constructor(private readonly table: string) {}

  insert(rows: unknown[]) {
    this.operation = 'insert'
    this.rows = rows
    return this
  }

  upsert(rows: unknown[], options?: Record<string, unknown>) {
    this.operation = 'upsert'
    this.rows = rows
    this.options = options
    return this
  }

  select() {
    return this
  }

  then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) {
    if (!this.operation) throw new Error('No mutation operation called')
    calls.push({
      table: this.table,
      operation: this.operation,
      rows: this.rows,
      options: this.options,
    })
    return Promise.resolve({
      data: mutationError ? null : this.rows,
      error: mutationError,
    }).then(resolve)
  }
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => new MockQuery(table),
  }),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => mockRestaurantId),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('importFinancialCsv', () => {
  beforeEach(() => {
    vi.resetModules()
    calls = []
    mutationError = null
    mockRestaurantId = RESTAURANT_ID
  })

  it('imports valid sales CSV scoped to the active restaurant', async () => {
    const { importFinancialCsv } = await import('@/app/actions/financial-control')

    const result = await importFinancialCsv({
      kind: 'sales',
      csvText: 'date;revenue_total;total_covers\n2026-02-01;1.234,56;40\n2026-02-02;900;30',
    })

    expect(result).toEqual({
      success: true,
      data: {
        kind: 'sales',
        importedRows: 2,
        skippedRows: 0,
        summary: {
          totalRevenue: 2134.56,
          totalExpenses: 0,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-02',
        },
      },
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      table: 'daily_sales',
      operation: 'upsert',
      options: { onConflict: 'restaurant_id,date' },
    })
    expect(calls[0].rows).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        date: '2026-02-01',
        revenue_total: 1234.56,
        total_covers: 40,
        source: 'csv_import',
      }),
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        date: '2026-02-02',
        revenue_total: 900,
        total_covers: 30,
        source: 'csv_import',
      }),
    ])
  })

  it('imports valid expenses CSV with deterministic idempotency keys', async () => {
    const { importFinancialCsv } = await import('@/app/actions/financial-control')

    const result = await importFinancialCsv({
      kind: 'expenses',
      csvText: 'expense_date,category,amount,description\n2026-02-01,ALQUILER,1200,Local',
    })

    expect(result.success).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      table: 'operating_expenses',
      operation: 'upsert',
      options: { onConflict: 'idempotency_key', ignoreDuplicates: true },
    })
    expect(calls[0].rows).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        expense_date: '2026-02-01',
        category: 'ALQUILER',
        amount: 1200,
        description: 'Local',
        idempotency_key: `financial-csv:${RESTAURANT_ID}:expenses:2026-02-01|ALQUILER|1200|Local`,
      }),
    ])
  })

  it('rejects invalid CSV before writing to Supabase', async () => {
    const { importFinancialCsv } = await import('@/app/actions/financial-control')

    const result = await importFinancialCsv({
      kind: 'expenses',
      csvText: 'expense_date,category,amount\n2026-02-01,CATEGORIA_MALA,100',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('El CSV contiene errores. Revisa el preview antes de importar.')
    expect(calls).toEqual([])
  })

  it('returns an error without writing when there is no active restaurant', async () => {
    mockRestaurantId = null
    const { importFinancialCsv } = await import('@/app/actions/financial-control')

    const result = await importFinancialCsv({
      kind: 'sales',
      csvText: 'date;revenue_total\n2026-02-01;1000',
    })

    expect(result).toEqual({ success: false, error: 'No hay restaurante activo para importar datos.' })
    expect(calls).toEqual([])
  })
})
