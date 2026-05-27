import { beforeEach, describe, expect, it, vi } from 'vitest'

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'

let mockRestaurantId: string | null = RESTAURANT_ID
let selectResults: Record<string, unknown[]> = {}
let calls: Array<{
  table: string
  operation: 'select' | 'insert'
  rows: unknown[]
  filters: Array<[string, string, unknown]>
}> = []

class MockQuery {
  private operation: 'select' | 'insert' | null = null
  private rows: unknown[] = []
  private filters: Array<[string, string, unknown]> = []

  constructor(private readonly table: string) {}

  select() {
    if (!this.operation) this.operation = 'select'
    return this
  }

  insert(rows: unknown[]) {
    this.operation = 'insert'
    this.rows = rows
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) {
    if (!this.operation) throw new Error('No operation called')
    calls.push({ table: this.table, operation: this.operation, rows: this.rows, filters: this.filters })
    if (this.operation === 'select') {
      return Promise.resolve({ data: selectResults[this.table] ?? [], error: null }).then(resolve)
    }
    return Promise.resolve({ data: this.rows, error: null }).then(resolve)
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

describe('employees CSV actions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRestaurantId = RESTAURANT_ID
    selectResults = { employees: [] }
    calls = []
  })

  it('imports employees scoped to the active restaurant', async () => {
    const { importEmployeesCsv } = await import('@/app/actions/staff')

    const result = await importEmployeesCsv({
      csvText: 'first_name;last_name;role;email;hourly_rate\nMaria;Lopez;FLOOR_STAFF;maria@example.com;12',
    })

    expect(result.success).toBe(true)
    expect(result.data?.importedRows).toBe(1)
    expect(calls[0]).toMatchObject({
      table: 'employees',
      operation: 'select',
      filters: [['eq', 'restaurant_id', RESTAURANT_ID]],
    })
    expect(calls[1]).toMatchObject({ table: 'employees', operation: 'insert' })
    expect(calls[1].rows).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        first_name: 'Maria',
        last_name: 'Lopez',
        role: 'FLOOR_STAFF',
        email: 'maria@example.com',
        hourly_rate: 12,
        status: 'ACTIVE',
      }),
    ])
  })

  it('blocks existing employee email before writing', async () => {
    selectResults.employees = [{ id: 'emp-1', first_name: 'Maria', last_name: 'Lopez', email: 'maria@example.com' }]
    const { validateEmployeesCsvImport } = await import('@/app/actions/staff')

    const result = await validateEmployeesCsvImport({
      csvText: 'first_name;last_name;role;email\nMarta;Lopez;FLOOR_STAFF;maria@example.com',
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(false)
    expect(result.data?.existingRows[0].message).toBe('Ya existe un empleado con email maria@example.com.')
    expect(calls.some(call => call.operation === 'insert')).toBe(false)
  })
})
