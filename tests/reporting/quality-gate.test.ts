import { describe, expect, it } from 'vitest'
import { evaluateProfessionalReportQualityGate } from '@/lib/reporting'
import type { DataQualityIssue, ProfessionalRestaurantReport } from '@/lib/reporting'

const baseReport: ProfessionalRestaurantReport = {
  schemaVersion: 'professional-report/v1',
  generatedAt: '2026-05-27T10:00:00.000Z',
  restaurant: { id: 'restaurant-1', name: 'Txiquita Tasca' },
  period: { from: '2026-02-01', to: '2026-02-28', days: 28 },
  quality: {
    status: 'OK',
    confidence: 92,
    issues: [],
  },
  sourceMap: [],
  executiveSummary: {
    headline: 'Informe preparado para revision',
    keyFindings: [],
    blockingIssues: [],
  },
  sections: [
    {
      id: 'sales',
      title: 'Ventas',
      quality: {
        section: 'sales',
        status: 'OK',
        confidence: 95,
        issues: [],
        evidence: [],
      },
      metrics: [],
      narrative: [],
    },
  ],
}

function reportWith(overrides: Partial<ProfessionalRestaurantReport>): ProfessionalRestaurantReport {
  return {
    ...baseReport,
    ...overrides,
  }
}

const criticalIssue: DataQualityIssue = {
  id: 'sales.missing',
  section: 'sales',
  status: 'MISSING',
  severity: 'critical',
  message: 'No hay ventas cargadas para el periodo.',
  sourceIds: ['daily_sales'],
}

describe('evaluateProfessionalReportQualityGate', () => {
  it('allows publishing a report without blockers or warnings', () => {
    const gate = evaluateProfessionalReportQualityGate(baseReport)

    expect(gate.status).toBe('READY')
    expect(gate.canPublish).toBe(true)
    expect(gate.blockers).toEqual([])
    expect(gate.summary).toBe('Informe listo para publicar en el portal cliente.')
  })

  it('blocks publishing when the report has critical quality issues', () => {
    const gate = evaluateProfessionalReportQualityGate(reportWith({
      quality: {
        status: 'MISSING',
        confidence: 35,
        issues: [criticalIssue],
      },
    }))

    expect(gate.status).toBe('BLOCKED')
    expect(gate.canPublish).toBe(false)
    expect(gate.blockers).toHaveLength(1)
    expect(gate.blockers[0]).toEqual(expect.objectContaining({
      id: 'issue.sales.missing',
      title: 'Bloqueo crítico',
      section: 'sales',
      sourceIds: ['daily_sales'],
    }))
  })

  it('allows publishing with warnings when non-critical data is partial', () => {
    const warningIssue: DataQualityIssue = {
      id: 'menu.partial',
      section: 'menu_performance',
      status: 'PARTIAL',
      severity: 'warning',
      message: 'Faltan ventas por receta para completar la lectura de carta.',
      sourceIds: ['daily_recipe_sales'],
    }

    const gate = evaluateProfessionalReportQualityGate(reportWith({
      quality: {
        status: 'PARTIAL',
        confidence: 78,
        issues: [warningIssue],
      },
      sections: [
        ...baseReport.sections,
        {
          id: 'menu_performance',
          title: 'Carta',
          quality: {
            section: 'menu_performance',
            status: 'PARTIAL',
            confidence: 60,
            issues: [warningIssue],
            evidence: [],
          },
          metrics: [],
          narrative: [],
        },
      ],
    }))

    expect(gate.status).toBe('WARNING')
    expect(gate.canPublish).toBe(true)
    expect(gate.warnings.map(item => item.id)).toContain('issue.menu.partial')
    expect(gate.summary).toBe('Informe publicable con advertencias: revisa los avisos antes de enviarlo al cliente.')
  })

  it('treats conflicting sections as publication blockers even if the global issue is missing', () => {
    const gate = evaluateProfessionalReportQualityGate(reportWith({
      sections: [
        {
          ...baseReport.sections[0],
          quality: {
            ...baseReport.sections[0].quality,
            status: 'CONFLICT',
            confidence: 40,
          },
        },
      ],
    }))

    expect(gate.status).toBe('BLOCKED')
    expect(gate.canPublish).toBe(false)
    expect(gate.blockers[0]).toEqual(expect.objectContaining({
      id: 'section.sales.conflict',
      title: 'Conflicto en Ventas',
      section: 'sales',
    }))
  })
})
