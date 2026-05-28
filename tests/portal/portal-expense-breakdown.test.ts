import { describe, expect, it } from 'vitest'
import { buildPortalExpenseCategoryBreakdown } from '@/lib/portal-insights'

describe('buildPortalExpenseCategoryBreakdown', () => {
  it('orders categories by absolute change and calculates deltas', () => {
    const breakdown = buildPortalExpenseCategoryBreakdown({
      currentExpenses: [
        { category: 'PROVEEDORES_COMIDA', amount: 4200 },
        { category: 'PROVEEDORES_COMIDA', amount: 300 },
        { category: 'NOMINAS_LIQUIDAS', amount: 7200 },
        { category: 'SUMINISTROS', amount: 900 },
      ],
      previousExpenses: [
        { category: 'PROVEEDORES_COMIDA', amount: 3600 },
        { category: 'NOMINAS_LIQUIDAS', amount: 7400 },
        { category: 'SUMINISTROS', amount: 1200 },
      ],
    })

    expect(breakdown.hasPreviousData).toBe(true)
    expect(breakdown.categories.map(item => item.category)).toEqual([
      'PROVEEDORES_COMIDA',
      'SUMINISTROS',
      'NOMINAS_LIQUIDAS',
    ])
    expect(breakdown.categories[0]).toEqual(expect.objectContaining({
      label: 'Proveedores Comida',
      currentAmount: 4500,
      previousAmount: 3600,
      delta: { value: 900, pct: 25 },
    }))
  })

  it('shows current breakdown without deltas when the previous period is empty', () => {
    const breakdown = buildPortalExpenseCategoryBreakdown({
      currentExpenses: [
        { category: 'ALQUILER', amount: 1800 },
        { category: 'OTROS', amount: 250 },
      ],
      previousExpenses: [],
    })

    expect(breakdown.hasPreviousData).toBe(false)
    expect(breakdown.categories).toEqual([
      expect.objectContaining({
        category: 'ALQUILER',
        currentAmount: 1800,
        previousAmount: 0,
        delta: { value: 1800, pct: null },
      }),
      expect.objectContaining({
        category: 'OTROS',
        currentAmount: 250,
        previousAmount: 0,
        delta: { value: 250, pct: null },
      }),
    ])
  })

  it('includes new categories with no historical amount', () => {
    const breakdown = buildPortalExpenseCategoryBreakdown({
      currentExpenses: [{ category: 'PUBLICIDAD', amount: 600 }],
      previousExpenses: [{ category: 'ALQUILER', amount: 1800 }],
    })

    expect(breakdown.categories.map(item => item.category)).toEqual(['ALQUILER', 'PUBLICIDAD'])
    expect(breakdown.categories.find(item => item.category === 'PUBLICIDAD')).toEqual(expect.objectContaining({
      previousAmount: 0,
      delta: { value: 600, pct: null },
    }))
  })
})
