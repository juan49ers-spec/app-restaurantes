import type {
  ConsultantPublishedReport,
  ConsultantWorkspaceRestaurant,
  PublishedReportRow,
  RestaurantRow,
} from './types'

export function mapRestaurant(row: RestaurantRow): ConsultantWorkspaceRestaurant {
  return {
    id: row.id,
    name: row.name,
    consultantName: row.consultant_name,
    consultantEmail: row.consultant_email,
    consultantLogoUrl: row.consultant_logo_url,
  }
}

export function mapPublishedReport(row: PublishedReportRow): ConsultantPublishedReport {
  return {
    id: row.id,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    version: row.version,
    status: row.status,
    publishedAt: row.published_at ?? '',
    viewedAt: row.viewed_at ?? null,
  }
}
