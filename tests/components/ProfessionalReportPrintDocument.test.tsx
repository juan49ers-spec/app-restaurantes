import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfessionalReportPrintDocument } from '@/components/reports/ProfessionalReportPrintDocument'
import type { SavedProfessionalReportDraftDetail } from '@/app/actions/professional-reporting'

const draft: SavedProfessionalReportDraftDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  periodFrom: '2026-02-01',
  periodTo: '2026-02-28',
  version: 3,
  status: 'READY',
  schemaVersion: 'professional-report/v1',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
  exportedAt: null,
  publishedAt: '2026-03-02T10:00:00.000Z',
  publishedBy: 'user-1',
  narrativeOverrides: {},
  report: {
    schemaVersion: 'professional-report/v1',
    generatedAt: '2026-03-01T09:00:00.000Z',
    restaurant: { id: 'restaurant-1', name: 'Casa Juan' },
    period: { from: '2026-02-01', to: '2026-02-28', days: 28 },
    quality: { status: 'OK', confidence: 92, issues: [] },
    sourceMap: [
      {
        id: 'daily_sales.revenue',
        label: 'Ventas diarias',
        tables: ['daily_sales'],
        calculation: 'Suma de revenue_total del periodo.',
        kind: 'actual',
        requiredFor: ['sales', 'profitability'],
      },
    ],
    executiveSummary: {
      headline: 'Informe preparado para revisión',
      keyFindings: ['El periodo deja margen positivo.'],
      blockingIssues: [],
    },
    sections: [
      {
        id: 'profitability',
        title: 'Rentabilidad',
        quality: {
          section: 'profitability',
          status: 'OK',
          confidence: 92,
          issues: [],
          evidence: [
            {
              sourceId: 'daily_sales.revenue',
              tables: ['daily_sales'],
              rowCount: 28,
              kind: 'actual',
            },
          ],
        },
        metrics: [
          {
            id: 'net_profit',
            label: 'Resultado estimado',
            value: 4500,
            unit: 'eur',
            kind: 'derived',
            sourceIds: ['daily_sales.revenue'],
          },
        ],
        narrative: ['La rentabilidad queda en positivo y debe protegerse.'],
      },
    ],
  },
}

describe('ProfessionalReportPrintDocument', () => {
  it('renders a branded printable report with index and data-quality appendix', () => {
    render(
      <ProfessionalReportPrintDocument
        draft={draft}
        branding={{
          consultantName: 'ControlHub Consulting',
          consultantEmail: 'consultor@controlhub.es',
        }}
      />
    )

    expect(screen.getByText('Casa Juan')).toBeInTheDocument()
    expect(screen.getByText('ControlHub Consulting')).toBeInTheDocument()
    expect(screen.getByText(/consultor@controlhub.es/)).toBeInTheDocument()
    expect(screen.getByText('Índice')).toBeInTheDocument()
    expect(screen.getByText('Conclusiones ejecutivas')).toBeInTheDocument()
    expect(screen.getByText('Anexo de calidad de dato')).toBeInTheDocument()
    expect(screen.getAllByText('Resultado estimado')).toHaveLength(2)
    expect(screen.getByText('Ventas diarias')).toBeInTheDocument()
  })
})
