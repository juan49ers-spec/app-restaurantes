import { describe, expect, it } from 'vitest'
import { buildPortalPeriodComparison, buildPortalSuggestedActions, previousCalendarMonthBounds } from '@/lib/portal-insights'
import type { ProfessionalReportPresentation } from '@/lib/reporting'

describe('portal insights', () => {
  it('calculates previous calendar month bounds across year boundaries', () => {
    expect(previousCalendarMonthBounds('2026-01-01')).toEqual({
      previousFrom: '2025-12-01',
      previousTo: '2025-12-31',
    })
  })

  it('builds period comparison with deltas and expense pressure', () => {
    const comparison = buildPortalPeriodComparison({
      currentFrom: '2026-02-01',
      currentTo: '2026-02-28',
      currentRevenue: 12000,
      currentExpenses: 7800,
      previousRevenue: 10000,
      previousExpenses: 7000,
    })

    expect(comparison.current.netResult).toBe(4200)
    expect(comparison.previous.netResult).toBe(3000)
    expect(comparison.deltas.revenue).toEqual({ value: 2000, pct: 20 })
    expect(comparison.deltas.expenses).toEqual({ value: 800, pct: 11.43 })
    expect(comparison.deltas.netResult).toEqual({ value: 1200, pct: 40 })
    expect(comparison.deltas.expenseRatioPct).toBe(-5)
    expect(comparison.hasPreviousData).toBe(true)
  })

  it('prioritizes suggested actions from warning and critical KPIs', () => {
    const presentation: ProfessionalReportPresentation = {
      eyebrow: 'Informe profesional',
      title: 'Casa Juan',
      subtitle: 'Cierre del periodo',
      periodLabel: '2026-02-01 a 2026-02-28',
      kpis: [
        {
          id: 'prime_cost_pct',
          label: 'Prime cost',
          value: 67,
          unit: 'pct',
          note: 'Límite recomendado 60%',
          tone: 'critical',
          sourceIds: ['profitability'],
        },
        {
          id: 'cogs_ratio',
          label: 'Materia prima',
          value: 38,
          unit: 'pct',
          note: 'Objetivo 33%',
          tone: 'warning',
          sourceIds: ['costs'],
        },
      ],
      chapters: [],
      conclusions: [],
    }

    expect(buildPortalSuggestedActions(presentation)).toEqual([
      expect.objectContaining({
        id: 'review-prime-cost',
        tone: 'critical',
      }),
      expect.objectContaining({
        id: 'review-cogs',
        tone: 'warning',
      }),
    ])
  })
})
