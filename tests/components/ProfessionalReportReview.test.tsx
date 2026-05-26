import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfessionalReportReview } from '@/components/reports/ProfessionalReportReview'
import { buildProfessionalRestaurantReport } from '@/lib/reporting'
import type { ProfessionalReportInput } from '@/lib/reporting'

const push = vi.fn()
const saveProfessionalReportDraft = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/app/actions/professional-reporting', () => ({
  saveProfessionalReportDraft: (...args: unknown[]) => saveProfessionalReportDraft(...args),
}))

const input: ProfessionalReportInput = {
  restaurant: { id: 'restaurant-1', name: 'Txiquita Tasca' },
  period: { from: '2026-02-01', to: '2026-02-10', days: 10 },
  generatedAt: '2026-05-25T10:00:00.000Z',
  sales: Array.from({ length: 10 }, (_, index) => ({
    date: `2026-02-${String(index + 1).padStart(2, '0')}`,
    revenue_total: 1000,
    revenue_dine_in: 800,
    revenue_takeout: 100,
    revenue_delivery: 100,
    base_10: 0,
    base_21: 0,
    tax_10: 0,
    tax_21: 0,
    total_covers: 40,
    labor_hours: 16,
    cost_of_goods: 0,
    labor_cost: 0,
    day_status: 'CLOSED',
  })),
  expenses: [
    { expense_date: '2026-02-02', category: 'PROVEEDORES_COMIDA', amount: 2800 },
    { expense_date: '2026-02-03', category: 'NOMINAS_LIQUIDAS', amount: 2500 },
    { expense_date: '2026-02-04', category: 'ALQUILER', amount: 1000 },
  ],
  monthlyTargets: [],
  employees: [
    { id: 'employee-1', role: 'FLOOR_STAFF', status: 'ACTIVE', hourly_rate: 12, monthly_base_salary: 0, contract_hours_weekly: 40 },
  ],
  shifts: [
    { date: '2026-02-02', status: 'completed', actual_cost: 120, estimated_cost: 100 },
  ],
  suppliers: [
    { id: 'supplier-1', name: 'Proveedor A', reliability_score: 90, trend_direction: 'stable', total_orders: 5, avg_price_variance: 0.02 },
  ],
  invoices: [
    { date: '2026-02-02', status: 'completed', total_amount: 2800, supplier_id: 'supplier-1' },
  ],
  recipeSales: [],
  recipes: [],
}

describe('ProfessionalReportReview', () => {
  beforeEach(() => {
    push.mockClear()
    saveProfessionalReportDraft.mockReset()
  })

  it('renders report quality, metrics and editable narrative', () => {
    const report = buildProfessionalRestaurantReport(input)

    render(
      <ProfessionalReportReview
        initialPeriod={{ from: '2026-02-01', to: '2026-02-10' }}
        report={report}
        error={null}
        savedDrafts={[]}
      />
    )

    expect(screen.getByText('Mesa de revision')).toBeInTheDocument()
    expect(screen.getByText('Txiquita Tasca · 2026-02-01 a 2026-02-10')).toBeInTheDocument()
    expect(screen.getByText('Ventas totales')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/El periodo registra/)).toBeInTheDocument()
  })

  it('updates the URL when generating a new period', () => {
    const report = buildProfessionalRestaurantReport(input)

    render(
      <ProfessionalReportReview
        initialPeriod={{ from: '2026-02-01', to: '2026-02-10' }}
        report={report}
        error={null}
        savedDrafts={[]}
      />
    )

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-03-01' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-03-31' } })
    fireEvent.click(screen.getByRole('button', { name: /Generar/i }))

    expect(push).toHaveBeenCalledWith('/reports?from=2026-03-01&to=2026-03-31')
  })

  it('saves a server-side version and exposes the export link', async () => {
    const report = buildProfessionalRestaurantReport(input)
    saveProfessionalReportDraft.mockResolvedValueOnce({
      success: true,
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        periodFrom: '2026-02-01',
        periodTo: '2026-02-10',
        version: 1,
        status: 'REVIEWED',
        schemaVersion: 'professional-report/v1',
        createdAt: '2026-05-25T10:00:00.000Z',
        updatedAt: '2026-05-25T10:00:00.000Z',
        exportedAt: null,
      },
    })

    render(
      <ProfessionalReportReview
        initialPeriod={{ from: '2026-02-01', to: '2026-02-10' }}
        report={report}
        error={null}
        savedDrafts={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Guardar version/i }))

    await waitFor(() => {
      expect(saveProfessionalReportDraft).toHaveBeenCalledWith({
        period: { from: '2026-02-01', to: '2026-02-10' },
        narrativeOverrides: expect.objectContaining({ sales: expect.any(String) }),
        status: 'REVIEWED',
      })
    })

    expect(await screen.findByText('Version 1 guardada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Exportar/i })).toHaveAttribute(
      'href',
      '/reports/print/11111111-1111-4111-8111-111111111111'
    )
  })
})
