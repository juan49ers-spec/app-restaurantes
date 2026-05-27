import type {
  ConsultantDeliveryReport,
  ConsultantMeetingRequest,
  ReadyReportRow,
} from './types'

export function buildDeliveryReports(
  rows: ReadyReportRow[],
  meetingRequests: ConsultantMeetingRequest[]
): ConsultantDeliveryReport[] {
  return rows.map(row => {
    const requests = meetingRequests.filter(request => request.reportId === row.id)
    const openRequestCount = requests.filter(request => request.status !== 'COMPLETED').length
    const completedRequestCount = requests.filter(request => request.status === 'COMPLETED').length
    const periodHref = `/reports?from=${row.period_from}&to=${row.period_to}`

    if (!row.published_at) {
      return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        publishedAt: null,
        viewedAt: row.viewed_at ?? null,
        status: 'READY_TO_PUBLISH',
        openRequestCount,
        completedRequestCount,
        nextActionHref: periodHref,
        nextActionLabel: 'Publicar desde informes',
      }
    }

    if (openRequestCount > 0) {
      return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        publishedAt: row.published_at,
        viewedAt: row.viewed_at ?? null,
        status: 'MEETING_REQUESTED',
        openRequestCount,
        completedRequestCount,
        nextActionHref: '/consultant',
        nextActionLabel: 'Atender solicitud',
      }
    }

    if (completedRequestCount > 0) {
      return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        publishedAt: row.published_at,
        viewedAt: row.viewed_at ?? null,
        status: 'FOLLOW_UP_COMPLETE',
        openRequestCount,
        completedRequestCount,
        nextActionHref: `/portal/reports/${row.id}`,
        nextActionLabel: 'Ver entrega',
      }
    }

    return {
      id: row.id,
      periodFrom: row.period_from,
      periodTo: row.period_to,
      version: row.version,
      publishedAt: row.published_at,
      viewedAt: row.viewed_at ?? null,
      status: 'PUBLISHED',
      openRequestCount,
      completedRequestCount,
      nextActionHref: `/portal/reports/${row.id}`,
      nextActionLabel: 'Revisar portal',
    }
  })
}
