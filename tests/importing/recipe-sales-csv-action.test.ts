import { beforeEach, describe, expect, it, vi } from 'vitest'

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const RECIPE_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_RECIPE_ID = '22222222-2222-4222-8222-222222222222'

let mockRestaurantId: string | null = RESTAURANT_ID
let selectResults: Record<string, unknown[]> = {}
let selectErrors: Record<string, { message: string }> = {}
let calls: Array<{
  table: string
  operation: 'select' | 'upsert'
  rows: unknown[]
  options?: Record<string, unknown>
  filters: Array<[string, string, unknown]>
}> = []

class MockQuery {
  private operation: 'select' | 'upsert' | null = null
  private rows: unknown[] = []
  private options?: Record<string, unknown>
  private filters: Array<[string, string, unknown]> = []

  constructor(private readonly table: string) {}

  select() {
    if (!this.operation) this.operation = 'select'
    return this
  }

  upsert(rows: unknown[], options?: Record<string, unknown>) {
    this.operation = 'upsert'
    this.rows = rows
    this.options = options
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push(['in', column, value])
    return this
  }

  then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) {
    if (!this.operation) throw new Error('No operation called')
    calls.push({
      table: this.table,
      operation: this.operation,
      rows: this.rows,
      options: this.options,
      filters: this.filters,
    })

    if (this.operation === 'select') {
      if (selectErrors[this.table]) {
        return Promise.resolve({ data: null, error: selectErrors[this.table] }).then(resolve)
      }

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

describe('recipe sales CSV actions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRestaurantId = RESTAURANT_ID
    selectResults = {
      recipes: [{ id: RECIPE_ID, name: 'Tortilla' }],
      daily_recipe_sales: [],
    }
    selectErrors = {}
    calls = []
  })

  it('imports valid recipe sales scoped to the active restaurant', async () => {
    const { importRecipeSalesCsv } = await import('@/app/actions/stock-actions')

    const result = await importRecipeSalesCsv({
      csvText: 'date;recipe_name;quantity_sold\n2026-02-01;Tortilla;12',
    })

    expect(result).toEqual({
      success: true,
      data: {
        importedRows: 1,
        summary: {
          totalUnits: 12,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          recipeRefs: 1,
        },
      },
    })
    expect(calls[0]).toMatchObject({
      table: 'recipes',
      operation: 'select',
      filters: [['eq', 'restaurant_id', RESTAURANT_ID]],
    })
    expect(calls[1]).toMatchObject({
      table: 'daily_recipe_sales',
      operation: 'select',
      filters: expect.arrayContaining([
        ['eq', 'restaurant_id', RESTAURANT_ID],
        ['in', 'date', ['2026-02-01']],
        ['in', 'recipe_id', [RECIPE_ID]],
      ]),
    })
    expect(calls[2]).toMatchObject({
      table: 'daily_recipe_sales',
      operation: 'upsert',
      options: { onConflict: 'restaurant_id,date,recipe_id' },
    })
    expect(calls[2].rows).toEqual([
      {
        restaurant_id: RESTAURANT_ID,
        date: '2026-02-01',
        recipe_id: RECIPE_ID,
        quantity_sold: 12,
      },
    ])
  })

  it('blocks unknown recipe names before writing', async () => {
    selectResults.recipes = []
    const { importRecipeSalesCsv } = await import('@/app/actions/stock-actions')

    const result = await importRecipeSalesCsv({
      csvText: 'date;recipe_name;quantity_sold\n2026-02-01;Tortilla;12',
    })

    expect(result).toEqual({
      success: false,
      error: 'El CSV contiene recetas que no existen en este restaurante.',
    })
    expect(calls.some(call => call.operation === 'upsert')).toBe(false)
  })

  it('preflights existing recipe sales by date and recipe', async () => {
    selectResults.daily_recipe_sales = [{ date: '2026-02-01', recipe_id: RECIPE_ID }]
    const { validateRecipeSalesCsvImport } = await import('@/app/actions/stock-actions')

    const result = await validateRecipeSalesCsvImport({
      csvText: 'date;recipe_id;quantity_sold\n2026-02-01;11111111-1111-4111-8111-111111111111;12',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      canImport: false,
      existingRows: [
        {
          key: `2026-02-01|${RECIPE_ID}`,
          rowNumbers: [2],
          message: 'Ya existen ventas para Tortilla el 2026-02-01.',
        },
      ],
      summary: {
        totalUnits: 12,
        dateFrom: '2026-02-01',
        dateTo: '2026-02-01',
        recipeRefs: 1,
      },
    })
  })

  it('ignores existing recipe sales that do not match an exact CSV pair', async () => {
    selectResults.recipes = [
      { id: RECIPE_ID, name: 'Tortilla' },
      { id: OTHER_RECIPE_ID, name: 'Croqueta' },
    ]
    selectResults.daily_recipe_sales = [{ date: '2026-02-02', recipe_id: RECIPE_ID }]
    const { validateRecipeSalesCsvImport } = await import('@/app/actions/stock-actions')

    const result = await validateRecipeSalesCsvImport({
      csvText: [
        'date;recipe_id;quantity_sold',
        `2026-02-01;${RECIPE_ID};12`,
        `2026-02-02;${OTHER_RECIPE_ID};5`,
      ].join('\n'),
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(true)
    expect(result.data?.existingRows).toEqual([])
  })

  it('returns a controlled error when duplicate preflight fails', async () => {
    selectErrors.daily_recipe_sales = { message: 'timeout' }
    const { validateRecipeSalesCsvImport } = await import('@/app/actions/stock-actions')

    const result = await validateRecipeSalesCsvImport({
      csvText: 'date;recipe_name;quantity_sold\n2026-02-01;Tortilla;12',
    })

    expect(result).toEqual({
      success: false,
      error: 'No se pudieron comprobar duplicados existentes. Inténtalo de nuevo antes de importar.',
    })
  })
})
