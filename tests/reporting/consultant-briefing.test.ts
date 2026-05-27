import { describe, expect, it } from 'vitest'
import { buildConsultantBriefing } from '@/lib/reporting/consultant-briefing'
import type { ProfessionalReportPresentation } from '@/lib/reporting'

const presentation: ProfessionalReportPresentation = {
  eyebrow: 'Informe profesional',
  title: 'Casa Juan',
  subtitle: 'Febrero 2026',
  periodLabel: '2026-02-01 a 2026-02-28',
  kpis: [
    {
      id: 'prime_cost_pct',
      label: 'Prime cost',
      value: 67,
      unit: 'pct',
      note: 'Por encima del umbral recomendado',
      tone: 'critical',
      sourceIds: ['profitability'],
    },
    {
      id: 'net_profit',
      label: 'Resultado neto',
      value: 4200,
      unit: 'eur',
      note: 'Resultado positivo',
      tone: 'positive',
      sourceIds: ['profitability'],
    },
  ],
  chapters: [],
  conclusions: [
    {
      id: 'margin-risk',
      order: 1,
      title: 'Margen bajo presión',
      body: 'El coste combinado exige revisión.',
      tone: 'critical',
      sourceIds: ['profitability'],
    },
  ],
}

describe('buildConsultantBriefing', () => {
  it('creates deterministic client meeting talking points from presentation data', () => {
    const briefing = buildConsultantBriefing(presentation)

    expect(briefing.headline).toBe('Revisión recomendada: Casa Juan')
    expect(briefing.opening).toContain('Febrero 2026')
    expect(briefing.priorities[0]).toEqual({
      title: 'Margen bajo presión',
      body: 'El coste combinado exige revisión.',
      tone: 'critical',
    })
    expect(briefing.questions).toContain('¿Qué cambios operativos del periodo explican mejor esta lectura?')
    expect(briefing.nextSteps[0]).toBe('Confirmar con el cliente si los datos del periodo están completos y no falta documentación relevante.')
  })
})
