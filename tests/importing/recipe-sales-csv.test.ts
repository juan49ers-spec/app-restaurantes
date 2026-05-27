import { describe, expect, it } from 'vitest'
import { parseRecipeSalesCsvPreview } from '@/lib/importing/recipe-sales-csv'

describe('parseRecipeSalesCsvPreview', () => {
  it('parses recipe sales by recipe_name and detects duplicate rows', () => {
    const csv = [
      'date;recipe_name;quantity_sold',
      '2026-02-01;Tortilla;12',
      '2026-02-01;Tortilla;3',
      '2026-02-02;Croqueta;8',
    ].join('\n')

    const result = parseRecipeSalesCsvPreview({ csvText: csv })

    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(3)
    expect(result.invalidRows).toBe(0)
    expect(result.duplicates).toEqual([
      {
        key: '2026-02-01|name:tortilla',
        rowNumbers: [2, 3],
      },
    ])
    expect(result.summary).toEqual({
      totalUnits: 23,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-02',
      recipeRefs: 2,
    })
  })

  it('accepts recipe_id and rejects negative quantities', () => {
    const result = parseRecipeSalesCsvPreview({
      csvText: [
        'date,recipe_id,quantity_sold',
        '2026-02-01,11111111-1111-4111-8111-111111111111,5',
        '2026-02-02,22222222-2222-4222-8222-222222222222,-1',
      ].join('\n'),
    })

    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.rows[0]).toMatchObject({
      status: 'valid',
      payload: {
        date: '2026-02-01',
        recipe_id: '11111111-1111-4111-8111-111111111111',
        quantity_sold: 5,
      },
    })
    expect(result.rows[1]).toMatchObject({
      rowNumber: 3,
      status: 'invalid',
      errors: ['quantity_sold debe ser un entero mayor o igual que 0.'],
    })
  })

  it('requires date, quantity_sold and a recipe reference', () => {
    const result = parseRecipeSalesCsvPreview({
      csvText: 'date;quantity_sold\n2026-02-01;10',
    })

    expect(result.fileErrors).toEqual(['Falta la columna recipe_id o recipe_name.'])
    expect(result.validRows).toBe(0)
    expect(result.invalidRows).toBe(1)
  })
})
