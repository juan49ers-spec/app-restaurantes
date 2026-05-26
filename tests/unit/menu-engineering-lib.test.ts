import { describe, expect, it } from 'vitest'
import { calculateMenuEngineeringAnalysis } from '@/lib/menu-engineering'

describe('calculateMenuEngineeringAnalysis', () => {
  it('uses the average item mix as popularity threshold without the 70% discount', () => {
    const analysis = calculateMenuEngineeringAnalysis([
      { id: 'borderline-puzzle', quantity_sold: 18, cost_per_unit: 2, price_per_unit: 20 },
      { id: 'star', quantity_sold: 40, cost_per_unit: 3, price_per_unit: 18 },
      { id: 'plowhorse', quantity_sold: 21, cost_per_unit: 8, price_per_unit: 10 },
      { id: 'dog', quantity_sold: 21, cost_per_unit: 9, price_per_unit: 10 },
    ])

    expect(analysis.thresholds.avgPopularityPct).toBeCloseTo(0.25)
    expect(analysis.thresholds.avgQuantity).toBe(25)

    const borderline = analysis.items.find((item) => item.id === 'borderline-puzzle')
    expect(borderline?.popularity_pct).toBeCloseTo(0.18)
    expect(borderline?.classification).toBe('PUZZLE')
  })

  it('refuses to classify a menu with zero total sales', () => {
    expect(() =>
      calculateMenuEngineeringAnalysis([
        { id: 'zero-a', quantity_sold: 0, cost_per_unit: 2, price_per_unit: 10 },
        { id: 'zero-b', quantity_sold: 0, cost_per_unit: 3, price_per_unit: 12 },
      ])
    ).toThrow('Total quantity sold is 0. Cannot calculate popularity.')
  })
})
