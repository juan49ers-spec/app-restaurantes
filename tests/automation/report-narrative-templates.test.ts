import { describe, expect, it } from 'vitest'
import { buildDeterministicReportNarrative } from '@/lib/automation/report-narrative-templates'
import type { ProfessionalReportPresentation } from '@/lib/reporting'

function presentationWithKpis(
  kpis: ProfessionalReportPresentation['kpis'],
): ProfessionalReportPresentation {
  return {
    eyebrow: 'Informe profesional',
    title: 'Casa Juan',
    subtitle: 'Febrero 2026',
    periodLabel: 'Febrero 2026',
    kpis,
    chapters: [],
    conclusions: [],
  }
}

describe('deterministic report narrative templates', () => {
  it('prioritizes critical KPI narratives before warnings', () => {
    const narrative = buildDeterministicReportNarrative(presentationWithKpis([
      {
        id: 'cogs_ratio',
        label: 'Materia prima',
        value: 44.2,
        unit: 'pct',
        note: 'Objetivo 33%',
        tone: 'critical',
        sourceIds: [],
      },
      {
        id: 'labor_ratio',
        label: 'Personal',
        value: 36,
        unit: 'pct',
        note: 'Objetivo 33%',
        tone: 'warning',
        sourceIds: [],
      },
    ]))

    expect(narrative.severity).toBe('critical')
    expect(narrative.headline).toMatch(/Prioridad alta/i)
    expect(narrative.bullets).toEqual(['Materia prima: 44.2%. Objetivo 33%'])
  })

  it('returns a warning narrative for publishable reports with vigilance points', () => {
    const narrative = buildDeterministicReportNarrative(presentationWithKpis([
      {
        id: 'labor_ratio',
        label: 'Personal',
        value: 35.4,
        unit: 'pct',
        note: 'Objetivo 33%',
        tone: 'warning',
        sourceIds: [],
      },
    ]))

    expect(narrative.severity).toBe('warning')
    expect(narrative.summary).toMatch(/entregable/i)
    expect(narrative.bullets[0]).toBe('Personal: 35.4%. Objetivo 33%')
  })

  it('returns a positive executive narrative when no KPI is critical or warning', () => {
    const narrative = buildDeterministicReportNarrative(presentationWithKpis([
      {
        id: 'net_margin_pct',
        label: 'Margen neto',
        value: 14.8,
        unit: 'pct',
        note: 'Resultado sobre ventas',
        tone: 'positive',
        sourceIds: [],
      },
      {
        id: 'prime_cost_pct',
        label: 'Prime cost',
        value: 58.1,
        unit: 'pct',
        note: 'Límite recomendado 60%',
        tone: 'positive',
        sourceIds: [],
      },
    ]))

    expect(narrative.severity).toBe('positive')
    expect(narrative.bullets).toEqual(['Margen neto: 14.8%.', 'Prime cost: 58.1%.'])
  })
})
