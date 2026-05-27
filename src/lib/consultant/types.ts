import type { ProfessionalReportQualityGateStatus } from '@/lib/reporting'

export type MeetingRequestStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED'

export interface ConsultantWorkspaceRestaurant {
  id: string
  name: string
  consultantName: string | null
  consultantEmail: string | null
  consultantLogoUrl: string | null
}

export interface ConsultantPublishedReport {
  id: string
  periodFrom: string
  periodTo: string
  version: number
  status: 'DRAFT' | 'REVIEWED' | 'READY'
  publishedAt: string
  viewedAt: string | null
}

export interface ConsultantMeetingRequest {
  id: string
  reportId: string | null
  message: string | null
  status: MeetingRequestStatus
  createdAt: string
  report: ConsultantPublishedReport | null
}

export type ConsultantDeliveryStatus =
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED'
  | 'MEETING_REQUESTED'
  | 'FOLLOW_UP_COMPLETE'

export interface ConsultantDeliveryReport {
  id: string
  periodFrom: string
  periodTo: string
  version: number
  publishedAt: string | null
  viewedAt: string | null
  status: ConsultantDeliveryStatus
  openRequestCount: number
  completedRequestCount: number
  nextActionHref: string
  nextActionLabel: string
}

export type ConsultantChecklistStatus = 'complete' | 'partial' | 'missing'
export type ConsultantPreparationSeverity = 'blocker' | 'warning' | 'info'

export interface ConsultantPreparationChecklistItem {
  id: string
  label: string
  description: string
  status: ConsultantChecklistStatus
  severity: ConsultantPreparationSeverity
  count: number
  href: string
  actionLabel: string
}

export interface ConsultantPreparationNextAction {
  itemId: string
  label: string
  href: string
  severity: ConsultantPreparationSeverity
  reason: string
}

export interface ConsultantPreparationQualityGate {
  status: ProfessionalReportQualityGateStatus
  canPublish: boolean
  summary: string
  blockerCount: number
  warningCount: number
  infoCount: number
  draftId: string
  version: number
  href: string
}

export interface ConsultantPreparationChecklist {
  period: {
    from: string
    to: string
    month: string
  }
  completionPct: number
  readyCount: number
  totalCount: number
  qualityGate: ConsultantPreparationQualityGate | null
  nextAction: ConsultantPreparationNextAction | null
  items: ConsultantPreparationChecklistItem[]
}

export interface ConsultantWorkspace {
  restaurant: ConsultantWorkspaceRestaurant
  publishedReports: ConsultantPublishedReport[]
  meetingRequests: ConsultantMeetingRequest[]
  deliveryReports: ConsultantDeliveryReport[]
  preparation: ConsultantPreparationChecklist
  warnings: string[]
}

export type RestaurantRow = {
  id: string
  name: string
  consultant_name: string | null
  consultant_email: string | null
  consultant_logo_url: string | null
}

export type PublishedReportRow = {
  id: string
  period_from: string
  period_to: string
  version: number
  status: ConsultantPublishedReport['status']
  published_at: string | null
  viewed_at?: string | null
}

export type ReadyReportRow = PublishedReportRow

export type ReadyReportQualityRow = {
  id: string
  version: number
  report_snapshot: unknown
}

export type MeetingRequestRow = {
  id: string
  report_id: string | null
  message: string | null
  status: MeetingRequestStatus
  created_at: string
}
