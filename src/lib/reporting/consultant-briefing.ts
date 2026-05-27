import type { PresentationConclusion, ProfessionalReportPresentation } from '@/lib/reporting'

export interface ConsultantBriefing {
  headline: string
  opening: string
  priorities: {
    title: string
    body: string
    tone: PresentationConclusion['tone']
  }[]
  questions: string[]
  nextSteps: string[]
}

export function buildConsultantBriefing(presentation: ProfessionalReportPresentation): ConsultantBriefing {
  const priorityConclusions = presentation.conclusions
    .filter(conclusion => conclusion.tone === 'critical' || conclusion.tone === 'warning')
    .slice(0, 3)

  const priorities = (priorityConclusions.length > 0
    ? priorityConclusions
    : presentation.conclusions.slice(0, 3)
  ).map(conclusion => ({
    title: conclusion.title,
    body: conclusion.body,
    tone: conclusion.tone,
  }))

  const riskKpis = presentation.kpis
    .filter(kpi => kpi.tone === 'critical' || kpi.tone === 'warning')
    .map(kpi => kpi.label)

  return {
    headline: `Revisión recomendada: ${presentation.title}`,
    opening: `Revisión ejecutiva del periodo ${presentation.subtitle || presentation.periodLabel}. Enfocar la conversación en decisiones concretas, no en repasar todas las métricas.`,
    priorities,
    questions: [
      '¿Qué cambios operativos del periodo explican mejor esta lectura?',
      riskKpis.length > 0
        ? `¿Qué responsable puede validar primero ${riskKpis.slice(0, 2).join(' y ')}?`
        : '¿Qué indicador quiere proteger el cliente durante el próximo periodo?',
      '¿Qué acción puede quedar decidida hoy con propietario y fecha?',
    ],
    nextSteps: [
      'Confirmar con el cliente si los datos del periodo están completos y no falta documentación relevante.',
      'Acordar una acción prioritaria, un responsable y una fecha de revisión.',
      'Actualizar el siguiente informe con el resultado de esa acción para cerrar el ciclo consultivo.',
    ],
  }
}
