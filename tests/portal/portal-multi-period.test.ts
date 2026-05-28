import { describe, expect, it } from 'vitest'
import { buildPortalMultiPeriodTrend } from '@/lib/portal-insights'

describe('buildPortalMultiPeriodTrend', () => {
  it('builds a three-month trend ordered by period', () => {
    const trend = buildPortalMultiPeriodTrend({
      currentFrom: '2026-05-01',
      currentTo: '2026-05-31',
      monthlyData: [
        { from: '2026-05-01', to: '2026-05-31', revenue: 18000.55, expenses: 12200.2 },
        { from: '2026-03-01', to: '2026-03-31', revenue: 15000, expenses: 10500 },
        { from: '2026-04-01', to: '2026-04-30', revenue: 16250, expenses: 11100 },
      ],
    })

    expect(trend.hasTrend).toBe(true)
    expect(trend.periods.map(period => period.label)).toEqual(['Mar 2026', 'Abr 2026', 'May 2026'])
    expect(trend.periods[2]).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
      label: 'May 2026',
      revenue: 18000.55,
      expenses: 12200.2,
      netResult: 5800.35,
    })
  })

  it('marks trend as available with two periods that have data', () => {
    const trend = buildPortalMultiPeriodTrend({
      currentFrom: '2026-05-01',
      currentTo: '2026-05-31',
      monthlyData: [
        { from: '2026-04-01', to: '2026-04-30', revenue: 12000, expenses: 8000 },
        { from: '2026-05-01', to: '2026-05-31', revenue: 13000, expenses: 8500 },
      ],
    })

    expect(trend.hasTrend).toBe(true)
    expect(trend.periods).toHaveLength(2)
  })

  it('does not claim a trend with only one populated period', () => {
    const trend = buildPortalMultiPeriodTrend({
      currentFrom: '2026-05-01',
      currentTo: '2026-05-31',
      monthlyData: [
        { from: '2026-05-01', to: '2026-05-31', revenue: 13000, expenses: 8500 },
      ],
    })

    expect(trend.hasTrend).toBe(false)
    expect(trend.periods).toHaveLength(1)
  })

  it('returns an empty trend when there is no monthly data', () => {
    const trend = buildPortalMultiPeriodTrend({
      currentFrom: '2026-05-01',
      currentTo: '2026-05-31',
      monthlyData: [],
    })

    expect(trend).toEqual({ periods: [], hasTrend: false })
  })
})
