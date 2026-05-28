import { describe, expect, it } from 'vitest'
import {
  buildFirstReportGuide,
  type ConsultantPreparationChecklist,
  type ConsultantPreparationQualityGate,
} from '@/lib/consultant'

const period = {
  from: '2026-02-01',
  to: '2026-02-28',
  month: '2026-02',
}

const readyGate: ConsultantPreparationQualityGate = {
  status: 'READY',
  canPublish: true,
  summary: 'Informe publicable.',
  blockerCount: 0,
  warningCount: 0,
  infoCount: 0,
  draftId: '11111111-1111-4111-8111-111111111111',
  version: 2,
  href: '/reports?from=2026-02-01&to=2026-02-28',
}

function buildChecklist(
  overrides: Partial<ConsultantPreparationChecklist> = {},
): ConsultantPreparationChecklist {
  return {
    period,
    completionPct: 90,
    readyCount: 8,
    totalCount: 9,
    qualityGate: readyGate,
    nextAction: {
      itemId: 'published_report',
      label: 'Publicar informe',
      href: '/portal',
      severity: 'warning',
      reason: 'El informe READY todavía no está visible en el portal cliente.',
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
      {
        id: 'ready_report',
        label: 'Informe listo para publicar',
        description: 'Versión READY guardada desde la mesa de informes.',
        status: 'complete',
        severity: 'info',
        count: 1,
        href: '/reports?from=2026-02-01&to=2026-02-28',
        actionLabel: 'Crear READY',
      },
      {
        id: 'published_report',
        label: 'Informe publicado en portal',
        description: 'Versión visible para el cliente restaurante.',
        status: 'missing',
        severity: 'warning',
        count: 0,
        href: '/portal',
        actionLabel: 'Publicar informe',
      },
    ],
    ...overrides,
  }
}

describe('buildFirstReportGuide', () => {
  it('prioritizes operational blockers before report generation', () => {
    const checklist = buildChecklist({
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
      ],
    })

    const guide = buildFirstReportGuide(checklist)

    expect(guide.status).toBe('RESOLVE_DATA')
    expect(guide.primaryAction).toEqual({
      label: 'Cargar ventas',
      href: '/financial-control?from=2026-02-01&to=2026-02-28',
    })
    expect(guide.steps.find(step => step.id === 'data')?.status).toBe('current')
  })

  it('guides to create a READY version when data blockers are resolved', () => {
    const checklist = buildChecklist({
      qualityGate: null,
      nextAction: {
        itemId: 'ready_report',
        label: 'Crear READY',
        href: '/reports?from=2026-02-01&to=2026-02-28',
        severity: 'blocker',
        reason: 'Sin una versión READY no hay snapshot validado para publicar en el portal.',
      },
      items: [
        {
          id: 'ready_report',
          label: 'Informe listo para publicar',
          description: 'Versión READY guardada desde la mesa de informes.',
          status: 'missing',
          severity: 'blocker',
          count: 0,
          href: '/reports?from=2026-02-01&to=2026-02-28',
          actionLabel: 'Crear READY',
        },
      ],
    })

    const guide = buildFirstReportGuide(checklist)

    expect(guide.status).toBe('CREATE_READY')
    expect(guide.primaryAction).toEqual({
      label: 'Crear versión READY',
      href: '/reports?from=2026-02-01&to=2026-02-28',
    })
  })

  it('keeps publication behind the quality gate when a READY snapshot is blocked', () => {
    const checklist = buildChecklist({
      qualityGate: {
        ...readyGate,
        status: 'BLOCKED',
        canPublish: false,
        summary: 'Hay bloqueos críticos.',
        blockerCount: 1,
      },
      nextAction: null,
    })

    const guide = buildFirstReportGuide(checklist)

    expect(guide.status).toBe('FIX_QUALITY_GATE')
    expect(guide.primaryAction).toEqual({
      label: 'Revisar bloqueos',
      href: '/reports?from=2026-02-01&to=2026-02-28',
    })
    expect(guide.steps.find(step => step.id === 'quality')?.status).toBe('current')
  })

  it('guides publication from reports when the READY snapshot is publishable', () => {
    const guide = buildFirstReportGuide(buildChecklist())

    expect(guide.status).toBe('PUBLISH_READY')
    expect(guide.primaryAction).toEqual({
      label: 'Publicar desde informes',
      href: '/reports?from=2026-02-01&to=2026-02-28',
    })
    expect(guide.steps.find(step => step.id === 'publication')?.status).toBe('current')
  })

  it('points to the client portal once the first delivery is published', () => {
    const checklist = buildChecklist({
      nextAction: null,
      items: [
        {
          id: 'published_report',
          label: 'Informe publicado en portal',
          description: 'Versión visible para el cliente restaurante.',
          status: 'complete',
          severity: 'info',
          count: 1,
          href: '/portal',
          actionLabel: 'Publicar informe',
        },
      ],
    })

    const guide = buildFirstReportGuide(checklist)

    expect(guide.status).toBe('CLIENT_DELIVERY_READY')
    expect(guide.primaryAction).toEqual({
      label: 'Ver portal cliente',
      href: '/portal',
    })
    expect(guide.steps.every(step => step.status === 'done')).toBe(true)
  })
})
