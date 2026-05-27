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
      reason: 'Sin una matriz BCG analizada, las recomendaciones de carta quedan menos accionables para el cliente.',
    })
  })

  it('weights operational blockers higher than delivery warnings in completion percentage', () => {
    const missingPublication = buildChecklist({ publishedCount: 0 })
    const missingSales = buildChecklist({ salesCount: 0, publishedCount: 1 })

    expect(missingPublication.completionPct).toBe(95)
    expect(missingSales.completionPct).toBe(84)
    expect(missingSales.completionPct).toBeLessThan(missingPublication.completionPct)
  })

  it('counts partial preparation items as half of their weighted value', () => {
    const checklist = buildChecklist({
      recipeCount: 12,
      recipeSalesCount: 0,
      publishedCount: 1,
    })

    expect(checklist.completionPct).toBe(95)
    expect(checklist.items.find(item => item.id === 'menu')?.status).toBe('partial')
  })

  it('explains recipe sales warnings with a contextual reason', () => {
    const checklist = buildChecklist({
      recipeCount: 12,
      recipeSalesCount: 0,
      menuEngineeringCount: 1,
      publishedCount: 1,
    })

    expect(checklist.nextAction).toEqual({
      itemId: 'menu',
      label: 'Cargar ventas por receta',
      href: '/stock',
      severity: 'warning',
      reason: 'Hay recetas, pero faltan ventas por receta; el análisis de mix, margen y carta quedará incompleto.',
    })
  })
})
