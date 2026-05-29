import type {
  ConsultantFirstReportGuide,
  ConsultantFirstReportGuideStep,
  ConsultantFirstReportGuideStepStatus,
  ConsultantPreparationChecklist,
} from './types'

const STEP_COPY: Record<ConsultantFirstReportGuideStep['id'], Omit<ConsultantFirstReportGuideStep, 'id' | 'status'>> = {
  data: {
    label: 'Datos base',
    description: 'Ventas y gastos mínimos para construir un diagnóstico fiable.',
  },
  ready: {
    label: 'Versión READY',
    description: 'Snapshot guardado desde la mesa de informes.',
  },
  quality: {
    label: 'Quality gate',
    description: 'Validación profesional antes de enseñar el informe.',
  },
  publication: {
    label: 'Portal cliente',
    description: 'Informe visible para el restaurante y listo para revisión.',
  },
}

function reportHref(checklist: ConsultantPreparationChecklist) {
  return `/reports?from=${checklist.period.from}&to=${checklist.period.to}`
}

function itemStatus(checklist: ConsultantPreparationChecklist, itemId: string) {
  return checklist.items.find(item => item.id === itemId)?.status ?? 'missing'
}

function hasPublishedReport(checklist: ConsultantPreparationChecklist) {
  return itemStatus(checklist, 'published_report') === 'complete'
}

function stepStatus(
  id: ConsultantFirstReportGuideStep['id'],
  current: ConsultantFirstReportGuideStep['id'] | null,
  done: Set<ConsultantFirstReportGuideStep['id']>,
): ConsultantFirstReportGuideStepStatus {
  if (done.has(id)) return 'done'
  if (id === current) return 'current'
  return 'pending'
}

function buildSteps(
  current: ConsultantFirstReportGuideStep['id'] | null,
  done: Array<ConsultantFirstReportGuideStep['id']>,
): ConsultantFirstReportGuideStep[] {
  const doneSet = new Set(done)
  return (['data', 'ready', 'quality', 'publication'] as const).map(id => ({
    id,
    ...STEP_COPY[id],
    status: stepStatus(id, current, doneSet),
  }))
}

export function buildFirstReportGuide(checklist: ConsultantPreparationChecklist): ConsultantFirstReportGuide {
  const href = reportHref(checklist)
  const readyIsComplete = itemStatus(checklist, 'ready_report') === 'complete'
  const publishedIsComplete = hasPublishedReport(checklist)
  const qualityGate = checklist.qualityGate

  if (checklist.nextAction?.severity === 'blocker' && checklist.nextAction.itemId !== 'ready_report') {
    return {
      status: 'RESOLVE_DATA',
      title: 'Primero completa los datos base',
      summary: checklist.nextAction.reason,
      primaryAction: {
        label: checklist.nextAction.label,
        href: checklist.nextAction.href,
      },
      steps: buildSteps('data', []),
    }
  }

  if (publishedIsComplete) {
    return {
      status: 'CLIENT_DELIVERY_READY',
      title: 'Primer informe entregado en portal',
      summary: 'El cliente ya tiene una versión publicada. Revisa el portal, confirma la lectura y prepara la reunión si la solicita.',
      primaryAction: {
        label: 'Ver portal cliente',
        href: '/portal',
      },
      steps: buildSteps(null, ['data', 'ready', 'quality', 'publication']),
    }
  }

  if (!readyIsComplete || !qualityGate) {
    return {
      status: 'CREATE_READY',
      title: 'Crea la primera versión READY',
      summary: 'Cuando ventas y gastos estén cargados, genera el informe desde la mesa de informes y guarda una versión READY.',
      primaryAction: {
        label: 'Crear versión READY',
        href,
      },
      steps: buildSteps('ready', ['data']),
    }
  }

  if (!qualityGate.canPublish) {
    return {
      status: 'FIX_QUALITY_GATE',
      title: 'Resuelve los bloqueos del informe',
      summary: qualityGate.summary,
      primaryAction: {
        label: 'Revisar bloqueos',
        href: qualityGate.href,
      },
      steps: buildSteps('quality', ['data', 'ready']),
    }
  }

  return {
    status: 'PUBLISH_READY',
    title: 'Publica el informe desde la mesa de informes',
    summary: 'El snapshot READY es publicable. Mantén la publicación dentro de /reports para conservar revisión, versionado y quality gate.',
    primaryAction: {
      label: 'Publicar desde informes',
      href,
    },
    steps: buildSteps('publication', ['data', 'ready', 'quality']),
  }
}
