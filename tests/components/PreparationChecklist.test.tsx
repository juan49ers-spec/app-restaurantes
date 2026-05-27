import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreparationChecklist } from '@/components/consultant/PreparationChecklist'
import type { ConsultantPreparationChecklist } from '@/app/actions/consultant'

vi.mock('@/app/actions/consultant', async () => {
  const actual = await vi.importActual<typeof import('@/app/actions/consultant')>('@/app/actions/consultant')
  return {
    ...actual,
    getPreparationChecklistForPeriod: vi.fn(),
  }
})

const baseChecklist: ConsultantPreparationChecklist = {
  period: {
    from: '2026-02-01',
    to: '2026-02-28',
    month: '2026-02',
  },
  completionPct: 89,
  readyCount: 8,
  totalCount: 9,
  qualityGate: {
    status: 'WARNING',
    canPublish: true,
    summary: 'Informe publicable con advertencias: revisa los avisos antes de enviarlo al cliente.',
    blockerCount: 0,
    warningCount: 2,
    infoCount: 1,
    draftId: '11111111-1111-4111-8111-111111111111',
    version: 3,
    href: '/reports?from=2026-02-01&to=2026-02-28',
  },
  nextAction: {
    itemId: 'menu_engineering',
    label: 'Calcular Menu Engineering',
    href: '/menu-engineering',
    severity: 'warning',
    reason: 'El informe puede avanzar, pero falta completar este bloque para mejorar la entrega.',
  },
  items: [
    {
      id: 'sales',
      label: 'Ventas cargadas',
      description: 'Días de venta registrados en el periodo.',
      status: 'complete',
      severity: 'info',
      count: 28,
      href: '/financial-control?from=2026-02-01&to=2026-02-28',
      actionLabel: 'Cargar ventas',
    },
  ],
}

const groupedChecklist: ConsultantPreparationChecklist = {
  ...baseChecklist,
  completionPct: 33,
  readyCount: 1,
  nextAction: {
    itemId: 'sales',
    label: 'Cargar ventas',
    href: '/financial-control?from=2026-02-01&to=2026-02-28',
    severity: 'blocker',
    reason: 'Sin ventas no se puede construir un informe fiable del periodo.',
  },
  items: [
    {
      id: 'sales',
      label: 'Ventas cargadas',
      description: 'Días de venta registrados en el periodo.',
      status: 'missing',
      severity: 'blocker',
      count: 0,
      href: '/financial-control?from=2026-02-01&to=2026-02-28',
      actionLabel: 'Cargar ventas',
    },
    {
      id: 'menu_engineering',
      label: 'Menu Engineering calculado',
      description: 'Snapshot BCG ANALYZED disponible para el periodo.',
      status: 'partial',
      severity: 'warning',
      count: 0,
      href: '/menu-engineering',
      actionLabel: 'Calcular Menu Engineering',
    },
    {
      id: 'expenses',
      label: 'Gastos cargados',
      description: 'Movimientos de gasto disponibles para leer costes.',
      status: 'complete',
      severity: 'info',
      count: 12,
      href: '/financial-control?from=2026-02-01&to=2026-02-28',
      actionLabel: 'Cargar gastos',
    },
  ],
}

describe('PreparationChecklist', () => {
  it('shows the latest READY report quality gate when available', () => {
    render(<PreparationChecklist initialChecklist={baseChecklist} />)

    expect(screen.getByText('Quality gate del informe')).toBeInTheDocument()
    expect(screen.getByText('Con advertencias')).toBeInTheDocument()
    expect(screen.getByText('Versión READY 3')).toBeInTheDocument()
    expect(screen.getByText('0 bloqueos · 2 avisos · 1 info')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Revisar informe/i })).toHaveAttribute(
      'href',
      '/reports?from=2026-02-01&to=2026-02-28'
    )
  })

  it('shows a preparation hint when there is no READY report yet', () => {
    render(<PreparationChecklist initialChecklist={{ ...baseChecklist, qualityGate: null }} />)

    expect(screen.getByText('Quality gate del informe')).toBeInTheDocument()
    expect(screen.getByText('Sin versión READY todavía')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Crear READY/i })).toHaveAttribute(
      'href',
      '/reports?from=2026-02-01&to=2026-02-28'
    )
  })

  it('shows the recommended next action for the selected period', () => {
    render(<PreparationChecklist initialChecklist={baseChecklist} />)

    expect(screen.getByText('Siguiente acción')).toBeInTheDocument()
    expect(screen.getByText('Calcular Menu Engineering')).toBeInTheDocument()
    expect(screen.getByText(/falta completar este bloque/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Calcular Menu Engineering/i })).toHaveAttribute(
      'href',
      '/menu-engineering'
    )
  })

  it('groups checklist items by preparation severity', () => {
    render(<PreparationChecklist initialChecklist={groupedChecklist} />)

    const blockers = screen.getByRole('region', { name: /Bloqueantes/i })
    const warnings = screen.getByRole('region', { name: /Recomendados/i })
    const ready = screen.getByRole('region', { name: /Listos/i })

    expect(within(blockers).getByText('Ventas cargadas')).toBeInTheDocument()
    expect(within(warnings).getByText('Menu Engineering calculado')).toBeInTheDocument()
    expect(within(ready).getByText('Gastos cargados')).toBeInTheDocument()
    expect(within(blockers).queryByText('Menu Engineering calculado')).not.toBeInTheDocument()
    expect(within(warnings).queryByText('Gastos cargados')).not.toBeInTheDocument()
  })
})
