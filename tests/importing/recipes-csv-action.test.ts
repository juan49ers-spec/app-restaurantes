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

describe('recipes CSV actions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRestaurantId = RESTAURANT_ID
    selectResults = { recipes: [] }
    calls = []
  })

  it('imports recipe headers scoped to the active restaurant', async () => {
    const { importRecipesCsv } = await import('@/app/actions/recipes')

    const result = await importRecipesCsv({
      csvText: 'name;selling_price;current_cost;target_margin_pct\nTortilla;12,50;3,20;72',
    })

    expect(result.success).toBe(true)
    expect(result.data?.importedRows).toBe(1)
    expect(calls[0]).toMatchObject({
      table: 'recipes',
      operation: 'select',
      filters: [['eq', 'restaurant_id', RESTAURANT_ID]],
    })
    expect(calls[1]).toMatchObject({ table: 'recipes', operation: 'insert' })
    expect(calls[1].rows).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        name: 'Tortilla',
        selling_price: 12.5,
        current_cost: 3.2,
        target_margin_pct: 72,
      }),
    ])
  })

  it('blocks existing recipe names before writing', async () => {
    selectResults.recipes = [{ id: 'recipe-1', name: 'Tortilla' }]
    const { validateRecipesCsvImport } = await import('@/app/actions/recipes')

    const result = await validateRecipesCsvImport({
      csvText: 'name;selling_price;current_cost\n tortilla ;12;3',
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(false)
    expect(result.data?.existingRows[0].message).toBe('Ya existe una receta llamada Tortilla.')
  })
})
