import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalChapterNavigation } from '@/components/portal/PortalChapterNavigation'
import { PortalExecutiveBrief } from '@/components/portal/PortalExecutiveBrief'
import type { ProfessionalReportPresentation } from '@/lib/reporting'

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
})
