import { describe, expect, it } from 'vitest'
import {
  calculateMenuEngineeringAnalysis,
  MenuEngineeringCalculator,
  type SalesItemUnsynced,
} from '@/lib/menu-engineering'
import type { Recipe } from '@/types/schema'

function recipe(id: string, currentCost: number, sellingPrice: number): Recipe {
  return {
    id,
    restaurant_id: 'restaurant-1',
    name: `Recipe ${id}`,
    current_cost: currentCost,
    selling_price: sellingPrice,
    hourly_rate: 0,
    prep_time_minutes: 0,
    yields: 1,
    allergens: [],
    updated_at: new Date(),
  }
}

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

  it('keeps a one-item report on the weighted-threshold frontier', () => {
    const analysis = calculateMenuEngineeringAnalysis([
      { id: 'only-item', quantity_sold: 10, cost_per_unit: 4, price_per_unit: 12 },
    ])

    expect(analysis.thresholds.avgPopularityPct).toBe(1)
    expect(analysis.thresholds.avgContributionMargin).toBe(8)
    expect(analysis.items[0]?.classification).toBe('STAR')
  })

  it('preserves zero-price and negative-margin items without producing NaN thresholds', () => {
    const analysis = calculateMenuEngineeringAnalysis([
      { id: 'free-sample', quantity_sold: 5, cost_per_unit: 3, price_per_unit: 0 },
      { id: 'loss-leader', quantity_sold: 20, cost_per_unit: 12, price_per_unit: 10 },
      { id: 'profitable', quantity_sold: 30, cost_per_unit: 4, price_per_unit: 16 },
    ])

    const freeSample = analysis.items.find((item) => item.id === 'free-sample')
    const lossLeader = analysis.items.find((item) => item.id === 'loss-leader')

    expect(Number.isNaN(analysis.thresholds.avgContributionMargin)).toBe(false)
    expect(freeSample?.total_sales).toBe(0)
    expect(freeSample?.contribution_margin).toBe(-3)
    expect(lossLeader?.contribution_margin).toBe(-2)
    expect(lossLeader?.classification).toBe('PLOWHORSE')
  })
})

describe('MenuEngineeringCalculator.getStats', () => {
  it('reports avgMargin as weighted contribution margin, not arithmetic margin percentage', () => {
    const recipes = [
      recipe('high-volume', 5, 20),
      recipe('low-volume', 9, 10),
    ]
    const sales: SalesItemUnsynced[] = [
      { recipe_id: 'high-volume', quantity_sold: 100, revenue_total: 2000 },
      { recipe_id: 'low-volume', quantity_sold: 10, revenue_total: 100 },
    ]

    const stats = new MenuEngineeringCalculator(sales, recipes).getStats()

    expect(stats.avgMargin).toBeCloseTo(1510 / 110)
    expect(stats.averages.margin).toBeCloseTo(stats.avgMargin)
  })
})
