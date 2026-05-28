import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalExpenseBreakdown } from '@/components/portal/PortalExpenseBreakdown'
import type { PortalExpenseCategoryBreakdown } from '@/lib/portal-insights'

describe('PortalExpenseBreakdown', () => {
  it('renders category rows with semantic trend colors', () => {
    const breakdown: PortalExpenseCategoryBreakdown = {
      hasPreviousData: true,
      categories: [
        {
          category: 'PROVEEDORES_COMIDA',
          label: 'Proveedores Comida',
          currentAmount: 4200,
          previousAmount: 3600,
          delta: { value: 600, pct: 16.67 },
        },
        {
          category: 'SUMINISTROS',
          label: 'Suministros',
          currentAmount: 900,
          previousAmount: 1200,
          delta: { value: -300, pct: -25 },
        },
      ],
    }

    render(<PortalExpenseBreakdown breakdown={breakdown} />)

    expect(screen.getByText('Desglose de gastos')).toBeInTheDocument()
    expect(screen.getAllByText('Proveedores Comida').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Suministros').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\+600,00/).some((element) => element.className.includes('text-rose-700'))).toBe(true)
    expect(screen.getAllByText(/-300,00/).some((element) => element.className.includes('text-emerald-700'))).toBe(true)
  })

  it('renders current amounts without historical deltas', () => {
    const breakdown: PortalExpenseCategoryBreakdown = {
      hasPreviousData: false,
      categories: [
        {
          category: 'ALQUILER',
          label: 'Alquiler Local',
          currentAmount: 1800,
          previousAmount: 0,
          delta: { value: 1800, pct: null },
        },
      ],
    }

    render(<PortalExpenseBreakdown breakdown={breakdown} />)

    expect(screen.getByText('Sin histórico previo')).toBeInTheDocument()
    expect(screen.getAllByText('Alquiler Local').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sin comparativa').length).toBeGreaterThanOrEqual(2)
  })
})
