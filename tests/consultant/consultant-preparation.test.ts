import { describe, expect, it } from 'vitest'
import { buildPreparationChecklist } from '@/lib/consultant'
import type { ConsultantPreparationQualityGate } from '@/lib/consultant'

const period = {
  from: '2026-02-01',
  to: '2026-02-28',
  month: '2026-02',
}

const readyQualityGate: ConsultantPreparationQualityGate = {
  status: 'READY',
  canPublish: true,
  summary: 'Informe publicable.',
  blockerCount: 0,
  warningCount: 0,
  infoCount: 0,
  draftId: '11111111-1111-4111-8111-111111111111',
  version: 1,
  href: '/reports?from=2026-02-01&to=2026-02-28',
}

function buildChecklist(overrides: Partial<Parameters<typeof buildPreparationChecklist>[0]> = {}) {
  return buildPreparationChecklist({
    period,
    salesCount: 28,
    expensesCount: 12,
    invoiceCount: 6,
    invoiceReviewCount: 0,
    employeeCount: 4,
    shiftCount: 20,
    recipeCount: 12,
    recipeSalesCount: 18,
    menuEngineeringCount: 1,
    readyDraftCount: 1,
    publishedCount: 0,
    openRequestCount: 0,
    qualityGate: readyQualityGate,
    ...overrides,
  })
}

describe('buildPreparationChecklist', () => {
  it('prioritizes missing sales as the next blocking action', () => {
    const checklist = buildChecklist({ salesCount: 0 })

    const sales = checklist.items.find(item => item.id === 'sales')

    expect(sales?.severity).toBe('blocker')
    expect(sales?.actionLabel).toBe('Cargar ventas')
    expect(checklist.nextAction).toEqual({
      itemId: 'sales',
      label: 'Cargar ventas',
      href: '/financial-control?from=2026-02-01&to=2026-02-28',
      severity: 'blocker',
      reason: 'Sin ventas no se puede construir un informe fiable del periodo.',
    })
  })

  it('prioritizes creating a READY report after operational blockers are complete', () => {
    const checklist = buildChecklist({
      readyDraftCount: 0,
      qualityGate: null,
    })

    const readyReport = checklist.items.find(item => item.id === 'ready_report')

    expect(readyReport?.severity).toBe('blocker')
    expect(readyReport?.actionLabel).toBe('Crear READY')
    expect(checklist.nextAction?.itemId).toBe('ready_report')
    expect(checklist.nextAction?.href).toBe('/reports?from=2026-02-01&to=2026-02-28')
  })

  it('uses the first warning as next action when blockers are complete', () => {
    const checklist = buildChecklist({
      menuEngineeringCount: 0,
      publishedCount: 0,
    })

    const menuEngineering = checklist.items.find(item => item.id === 'menu_engineering')

    expect(menuEngineering?.severity).toBe('warning')
    expect(checklist.nextAction).toEqual({
      itemId: 'menu_engineering',
      label: 'Calcular Menu Engineering',
      href: '/menu-engineering',
      severity: 'warning',
      reason: 'El informe puede avanzar, pero falta completar este bloque para mejorar la entrega.',
    })
  })
})
