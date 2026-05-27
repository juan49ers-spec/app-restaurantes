import type {
  DataQualityIssue,
  ProfessionalRestaurantReport,
  ReportSectionId,
} from './types'

export type ProfessionalReportQualityGateStatus = 'READY' | 'WARNING' | 'BLOCKED'
export type ProfessionalReportQualityGateSeverity = 'blocker' | 'warning' | 'info'

export interface ProfessionalReportQualityGateItem {
  id: string
  severity: ProfessionalReportQualityGateSeverity
  section?: ReportSectionId
  title: string
  message: string
  sourceIds: string[]
}

export interface ProfessionalReportQualityGate {
  status: ProfessionalReportQualityGateStatus
  canPublish: boolean
  blockers: ProfessionalReportQualityGateItem[]
  warnings: ProfessionalReportQualityGateItem[]
  info: ProfessionalReportQualityGateItem[]
  summary: string
}

function issueToGateItem(issue: DataQualityIssue): ProfessionalReportQualityGateItem {
  const severity: ProfessionalReportQualityGateSeverity =
    issue.severity === 'critical' ? 'blocker' : issue.severity

  return {
    id: `issue.${issue.id}`,
    severity,
    section: issue.section,
    title: issue.severity === 'critical'
      ? 'Bloqueo crítico'
      : issue.severity === 'warning'
        ? 'Advertencia'
        : 'Informativo',
    message: issue.message,
    sourceIds: issue.sourceIds,
  }
}

function sectionTitle(sectionId: ReportSectionId) {
  return sectionId
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function evaluateProfessionalReportQualityGate(report: ProfessionalRestaurantReport): ProfessionalReportQualityGate {
  const issueItems = report.quality.issues.map(issueToGateItem)
  const blockers = issueItems.filter(item => item.severity === 'blocker')
  const warnings = issueItems.filter(item => item.severity === 'warning')
  const info = issueItems.filter(item => item.severity === 'info')
  const existingBlockerIds = new Set(blockers.map(item => `${item.section}:${item.message}`))

  for (const section of report.sections) {
    if (section.quality.status === 'CONFLICT') {
      const blockerKey = `${section.id}:conflict`
      if (!existingBlockerIds.has(blockerKey)) {
        blockers.push({
          id: `section.${section.id}.conflict`,
          severity: 'blocker',
          section: section.id,
          title: `Conflicto en ${section.title || sectionTitle(section.id)}`,
          message: 'La sección contiene datos contradictorios y debe revisarse antes de publicar.',
          sourceIds: section.quality.evidence.map(item => item.sourceId),
        })
      }
      continue
    }

    if (section.quality.status === 'PARTIAL' || section.quality.status === 'MISSING') {
      const hasSectionIssue = issueItems.some(item => item.section === section.id)
      if (!hasSectionIssue) {
        warnings.push({
          id: `section.${section.id}.${section.quality.status.toLowerCase()}`,
          severity: 'warning',
          section: section.id,
          title: `${section.title || sectionTitle(section.id)} incompleta`,
          message: 'La sección no está completa. Puede publicarse, pero conviene revisar la advertencia antes de enviar al cliente.',
          sourceIds: section.quality.evidence.map(item => item.sourceId),
        })
      }
    }
  }

  if (blockers.length > 0) {
    return {
      status: 'BLOCKED',
      canPublish: false,
      blockers,
      warnings,
      info,
      summary: 'Informe bloqueado: resuelve los bloqueos críticos antes de publicarlo en el portal cliente.',
    }
  }

  if (warnings.length > 0) {
    return {
      status: 'WARNING',
      canPublish: true,
      blockers,
      warnings,
      info,
      summary: 'Informe publicable con advertencias: revisa los avisos antes de enviarlo al cliente.',
    }
  }

  return {
    status: 'READY',
    canPublish: true,
    blockers,
    warnings,
    info,
    summary: 'Informe listo para publicar en el portal cliente.',
  }
}
