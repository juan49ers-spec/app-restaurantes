import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalChapterSection } from '@/components/portal/PortalChapterSection'
import { PortalChapterNavigation } from '@/components/portal/PortalChapterNavigation'
import { PortalExecutiveBrief } from '@/components/portal/PortalExecutiveBrief'
import { PortalPeriodComparisonPanel } from '@/components/portal/PortalPeriodComparisonPanel'
import { PortalReviewRoadmap } from '@/components/portal/PortalReviewRoadmap'
import { PortalSuggestedActions } from '@/components/portal/PortalSuggestedActions'
import type { ProfessionalReportPresentation, ProfessionalReportSection } from '@/lib/reporting'
import type { PortalPeriodComparison, PortalSuggestedAction } from '@/lib/portal-insights'

const presentation: ProfessionalReportPresentation = {
  eyebrow: 'Informe profesional de gestion',
  title: 'Txiquita Tasca',
  subtitle: 'Cierre y analisis del periodo',
  periodLabel: '2026-02-01 a 2026-02-28',
  kpis: [
    {
      id: 'net_profit',
      label: 'Resultado estimado',
      value: 12450,
      unit: 'eur',
      note: 'Lectura economica del periodo',
      tone: 'positive',
      sourceIds: ['profitability'],
    },
    {
      id: 'prime_cost_pct',
      label: 'Prime cost',
      value: 62,
      unit: 'pct',
      note: 'Limite recomendado 60%',
      tone: 'warning',
      sourceIds: ['profitability'],
    },
  ],
  chapters: [
    {
      id: 'results',
      label: 'I',
      title: 'Resultados',
      subtitle: 'Cuenta de explotacion del periodo',
      sectionIds: ['profitability'],
    },
    {
      id: 'menu',
      label: 'IV',
      title: 'Carta',
      subtitle: 'Mix vendido e ingenieria BCG',
      sectionIds: ['menu_performance', 'menu_engineering'],
    },
  ],
  conclusions: [
    {
      id: 'profitability-read',
      order: 1,
      title: 'Periodo rentable',
      body: 'El periodo deja resultado positivo y conviene proteger margen.',
      tone: 'positive',
      sourceIds: ['profitability'],
    },
    {
      id: 'prime-cost-read',
      order: 2,
      title: 'Prime cost por encima del limite',
      body: 'La mejora debe venir de compras, carta y planificacion de personal.',
      tone: 'warning',
      sourceIds: ['costs'],
    },
  ],
}

describe('Portal premium components', () => {
  it('renders an executive cover with primary conclusion, actions and PDF link', () => {
    render(
      <PortalExecutiveBrief
        presentation={presentation}
        reportId="report-1"
        version={3}
        status="READY"
        mode="home"
      />
    )

    expect(screen.getByText('Informe publicado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Txiquita Tasca' })).toBeInTheDocument()
    expect(screen.getByText('Prime cost por encima del limite')).toBeInTheDocument()
    expect(screen.getByText(/compras, carta y planificacion/i)).toBeInTheDocument()
    expect(screen.getByText(/Periodo rentable/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver informe completo/i })).toHaveAttribute('href', '/portal/reports/report-1')
    expect(screen.getByRole('link', { name: /Descargar PDF/i })).toHaveAttribute('href', '/reports/print/report-1')
  })

  it('renders chapter navigation with anchors for the report detail', () => {
    render(<PortalChapterNavigation chapters={presentation.chapters} />)

    const nav = screen.getByRole('navigation', { name: /Capítulos del informe/i })

    expect(within(nav).getByRole('link', { name: /Resultados/i })).toHaveAttribute('href', '#chapter-results')
    expect(within(nav).getByRole('link', { name: /Carta/i })).toHaveAttribute('href', '#chapter-menu')
  })

  it('renders period comparison with current values and previous period deltas', () => {
    const comparison: PortalPeriodComparison = {
      period: {
        currentFrom: '2026-02-01',
        currentTo: '2026-02-28',
        previousFrom: '2026-01-01',
        previousTo: '2026-01-31',
      },
      current: {
        revenue: 12000,
        expenses: 7600,
        netResult: 4400,
        expenseRatioPct: 63.33,
      },
      previous: {
        revenue: 10000,
        expenses: 7000,
        netResult: 3000,
        expenseRatioPct: 70,
      },
      deltas: {
        revenue: { value: 2000, pct: 20 },
        expenses: { value: 600, pct: 8.57 },
        netResult: { value: 1400, pct: 46.67 },
        expenseRatioPct: -6.67,
      },
      hasPreviousData: true,
    }

    render(<PortalPeriodComparisonPanel comparison={comparison} />)

    expect(screen.getByText('Evolución frente al mes anterior')).toBeInTheDocument()
    expect(screen.getByText('Con histórico')).toBeInTheDocument()
    expect(screen.getByText(/12.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/\+2000,00/)).toBeInTheDocument()
    expect(screen.getByText(/-6,67 pp/)).toBeInTheDocument()
  })

  it('renders suggested actions with tone badges', () => {
    const actions: PortalSuggestedAction[] = [
      {
        id: 'review-prime-cost',
        title: 'Revisar prime cost con el consultor',
        body: 'Cruzar materia prima, personal y carta.',
        tone: 'critical',
        sourceId: 'prime_cost_pct',
      },
    ]

    render(<PortalSuggestedActions actions={actions} />)

    expect(screen.getByText('Acciones sugeridas para revisar')).toBeInTheDocument()
    expect(screen.getByText('Revisar prime cost con el consultor')).toBeInTheDocument()
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('renders the client review roadmap with delivery status', () => {
    render(
      <PortalReviewRoadmap
        viewedAt="2026-05-28T10:00:00.000Z"
        meetingStatus="ACKNOWLEDGED"
        suggestedActionCount={2}
      />
    )

    expect(screen.getByRole('heading', { name: 'Del informe a la decisión' })).toBeInTheDocument()
    expect(screen.getByText('Informe publicado')).toBeInTheDocument()
    expect(screen.getByText('Informe leído')).toBeInTheDocument()
    expect(screen.getByText('Reunión en preparación')).toBeInTheDocument()
    expect(screen.getByText('Próximas acciones definidas')).toBeInTheDocument()
    expect(screen.getByText(/2 puntos recomendados/i)).toBeInTheDocument()
  })

  it('renders a guided chapter section with narrative, metrics and data issues', () => {
    const section: ProfessionalReportSection = {
      id: 'profitability',
      title: 'Rentabilidad',
      quality: {
        section: 'profitability',
        status: 'PARTIAL',
        confidence: 75,
        issues: [
          {
            id: 'profitability.labor_from_shifts',
            section: 'profitability',
            status: 'PARTIAL',
            severity: 'warning',
            message: 'El coste laboral usa turnos por falta de gasto de personal.',
            sourceIds: ['shifts.cost'],
          },
        ],
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
          value: 4200,
          unit: 'eur',
          kind: 'derived',
          sourceIds: ['daily_sales.revenue', 'operating_expenses.amount'],
        },
      ],
      narrative: [
        'El periodo es rentable, pero la calidad depende de completar personal.',
        'Conviene revisar nóminas antes de cerrar conclusiones.',
      ],
    }

    render(
      <PortalChapterSection
        chapter={presentation.chapters[0]}
        sections={[section]}
        narrativeOverrides={{}}
      />
    )

    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument()
    expect(screen.getByText('Lectura del capítulo')).toBeInTheDocument()
    expect(screen.getByText(/El periodo es rentable/)).toBeInTheDocument()
    expect(screen.getByText('PARTIAL · 75% confianza')).toBeInTheDocument()
    expect(screen.getByText('Resultado estimado')).toBeInTheDocument()
    expect(screen.getByText('Incidencias de dato')).toBeInTheDocument()
    expect(screen.getByText(/coste laboral usa turnos/i)).toBeInTheDocument()
  })
})
