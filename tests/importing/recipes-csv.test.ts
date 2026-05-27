import { describe, expect, it } from 'vitest'
import { parseRecipesCsvPreview } from '@/lib/importing/recipes-csv'

describe('parseRecipesCsvPreview', () => {
  it('parses recipe headers with spanish decimal formats and duplicate names', () => {
    const preview = parseRecipesCsvPreview({
      csvText: [
        'name;selling_price;current_cost;target_margin_pct;prep_time_minutes;yields',
        'Tortilla;12,50;3,20;72;15;1',
        ' tortilla ;13,00;3,40;74;20;1',
      ].join('\n'),
    })

    expect(preview.validRows).toBe(2)
    expect(preview.summary.totalRecipes).toBe(2)
    expect(preview.summary.avgSellingPrice).toBe(12.75)
    expect(preview.duplicates).toEqual([{ key: 'tortilla', rowNumbers: [2, 3] }])
  })

  it('rejects negative prices and missing names', () => {
    const preview = parseRecipesCsvPreview({
      csvText: [
        'name;selling_price;current_cost',
        ';10;3',
        'Croquetas;-1;2',
      ].join('\n'),
    })

    expect(preview.validRows).toBe(0)
    expect(preview.invalidRows).toBe(2)
    expect(preview.rows[0].errors).toContain('name es obligatorio.')
    expect(preview.rows[1].errors).toContain('selling_price debe ser mayor o igual que 0.')
  })

  it('reports required header errors', () => {
    const preview = parseRecipesCsvPreview({
      csvText: 'name;current_cost\nTortilla;3',
    })

    expect(preview.fileErrors).toEqual(['Falta la columna obligatoria selling_price.'])
    expect(preview.rows[0].status).toBe('invalid')
  })
})
