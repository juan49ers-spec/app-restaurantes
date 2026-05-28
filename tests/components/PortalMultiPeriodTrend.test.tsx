import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalMultiPeriodTrend } from '@/components/portal/PortalMultiPeriodTrend'
import type { PortalMultiPeriodTrend as PortalMultiPeriodTrendData } from '@/lib/portal-insights'

describe('PortalMultiPeriodTrend', () => {
  it('renders three periods with revenue, expenses and net result', () => {
    const trend: PortalMultiPeriodTrendData = {
      hasTrend: true,
      periods: [
        { from: '2026-03-01', to: '2026-03-31', label: 'Mar 2026', revenue: 12000, expenses: 8000, netResult: 4000 },
        { from: '2026-04-01', to: '2026-04-30', label: 'Abr 2026', revenue: 15000, expenses: 9500, netResult: 5500 },
        { from: '2026-05-01', to: '2026-05-31', label: 'May 2026', revenue: 18000, expenses: 11200, netResult: 6800 },
      ],
    }

    render(<PortalMultiPeriodTrend trend={trend} />)

    expect(screen.getByText('Tendencia de 3 meses')).toBeInTheDocument()
    expect(screen.getAllByText('Mar 2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Abr 2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('May 2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/18.000,00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/6800,00/).length).toBeGreaterThan(0)
  })

  it('renders a no-trend state with one period', () => {
    const trend: PortalMultiPeriodTrendData = {
      hasTrend: false,
      periods: [
        { from: '2026-05-01', to: '2026-05-31', label: 'May 2026', revenue: 18000, expenses: 11200, netResult: 6800 },
      ],
    }

    render(<PortalMultiPeriodTrend trend={trend} />)

    expect(screen.getByText('Sin tendencia histórica')).toBeInTheDocument()
  })
})
