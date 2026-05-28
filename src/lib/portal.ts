import {
    buildPortalExpenseCategoryBreakdown,
    buildPortalMultiPeriodTrend,
    buildPortalPeriodComparison,
    previousCalendarMonthBounds,
    type PortalExpenseCategoryBreakdown,
    type PortalMultiPeriodTrend,
    type PortalPeriodComparison,
} from '@/lib/portal-insights'
import { createActionLogger } from '@/lib/logger'
import {
    fetchMeetingRequestRowsForReports,
    fetchOpenMeetingRequest,
    fetchPortalAuthUser,
    fetchPortalContextRows,
    fetchPortalExpenseBreakdownRows,
    fetchPortalMultiPeriodTrendRows,
    fetchPortalPeriodComparisonRows,
    fetchPublishedReportDetailRow,
    fetchPublishedReportForMeetingRequest,
    fetchPublishedReportRows,
    insertMeetingRequest,
    insertPortalNotification,
    updatePublishedReportViewedRow,
} from '@/lib/portal-queries'
import type { ProfessionalRestaurantReport } from '@/lib/reporting'
import { logAuditEvent } from '@/lib/audit'

const log = createActionLogger('portal')

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export interface PublishedReportSummary {
    id: string
    periodFrom: string
    periodTo: string
    version: number
    status: 'DRAFT' | 'REVIEWED' | 'READY'
    schemaVersion: string
    createdAt: string
    updatedAt: string
    exportedAt: string | null
    publishedAt: string
    publishedBy: string | null
    viewedAt: string | null
    meetingStatus: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | null
}

export interface PublishedReportDetail extends PublishedReportSummary {
    report: ProfessionalRestaurantReport
    narrativeOverrides: Record<string, string>
}

export interface PortalLiveRevenueProgress {
    month: string
    revenueActual: number
    revenueTarget: number
    completionPct: number
}

export interface PortalContext {
    restaurantId: string
    restaurantName: string
    consultantName: string | null
    consultantEmail: string | null
    consultantLogoUrl: string | null
    liveRevenue: PortalLiveRevenueProgress | null
}

export interface PortalMeetingRequestResult {
    id: string
    reused: boolean
}

type NumericRow = Record<string, number | null | undefined>
type DatedNumericRow = Record<string, string | number | null | undefined>

export function buildPortalContextFallback(input: {
    restaurantId: string
    restaurantName: string
    consultantName?: string | null
    consultantEmail?: string | null
    consultantLogoUrl?: string | null
}): PortalContext {
    return {
        restaurantId: input.restaurantId,
        restaurantName: input.restaurantName,
        consultantName: input.consultantName ?? null,
        consultantEmail: input.consultantEmail ?? null,
        consultantLogoUrl: input.consultantLogoUrl ?? null,
        liveRevenue: null,
    }
}

function mapPublishedSummary(row: {
    id: string
    period_from: string
    period_to: string
    version: number
    status: PublishedReportSummary['status']
    schema_version: string
    created_at: string
    updated_at: string
    exported_at: string | null
    published_at: string | null
    published_by: string | null
    viewed_at?: string | null
}, meetingStatus: PublishedReportSummary['meetingStatus'] = null): PublishedReportSummary {
    return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        status: row.status,
        schemaVersion: row.schema_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        exportedAt: row.exported_at,
        publishedAt: row.published_at ?? '',
        publishedBy: row.published_by,
        viewedAt: row.viewed_at ?? null,
        meetingStatus,
    }
}

function currentMonth() {
    return new Date().toISOString().slice(0, 7)
}

function monthBounds(month: string) {
    const [year, monthIndex] = month.split('-').map(Number)
    const from = `${month}-01`
    const to = new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10)
    return { from, to }
}

function roundRatio(value: number) {
    return Math.round(value * 10000) / 10000
}

function sumRows(rows: NumericRow[] | null, key: string) {
    return (rows || []).reduce((sum, row) => sum + (row[key] ?? 0), 0)
}

function addMonths(month: string, delta: number) {
    const [year, monthIndex] = month.split('-').map(Number)
    const target = new Date(Date.UTC(year, monthIndex - 1 + delta, 1))
    return target.toISOString().slice(0, 7)
}

function monthFromDate(date: string) {
    return date.slice(0, 7)
}

function monthSequence(periodFrom: string, count: number) {
    const currentMonthValue = monthFromDate(periodFrom)
    return Array.from({ length: count }, (_, index) => addMonths(currentMonthValue, index - (count - 1)))
}

function sumRowsByMonth(rows: DatedNumericRow[] | null, dateKey: string, valueKey: string) {
    const totals = new Map<string, number>()
    for (const row of rows || []) {
        const date = row[dateKey]
        const value = row[valueKey]
        if (typeof date !== 'string' || typeof value !== 'number') continue
        const month = monthFromDate(date)
        totals.set(month, (totals.get(month) ?? 0) + value)
    }
    return totals
}

function mapPortalContextBase(restaurantId: string, row: {
    name: string
    consultant_name?: string | null
    consultant_email?: string | null
    consultant_logo_url?: string | null
}) {
    return {
        restaurantId,
        restaurantName: row.name,
        consultantName: row.consultant_name ?? null,
        consultantEmail: row.consultant_email ?? null,
        consultantLogoUrl: row.consultant_logo_url ?? null,
    }
}

export async function getPublishedReportsForRestaurant(restaurantId: string): Promise<ActionResponse<PublishedReportSummary[]>> {
    const { data, error } = await fetchPublishedReportRows(restaurantId)

    if (error) return { success: false, error: 'No se pudieron cargar los informes publicados.' }

    const reportRows = data || []
    const reportIds = reportRows.map(row => row.id).filter(Boolean)
    const meetingStatusByReport = new Map<string, PublishedReportSummary['meetingStatus']>()

    if (reportIds.length > 0) {
        const meetingRes = await fetchMeetingRequestRowsForReports(restaurantId, reportIds)

        if (!meetingRes.error) {
            for (const request of meetingRes.data || []) {
                const reportId = request.report_id as string | undefined
                const status = request.status as PublishedReportSummary['meetingStatus']
                if (reportId && !meetingStatusByReport.has(reportId)) {
                    meetingStatusByReport.set(reportId, status)
                }
            }
        }
    }

    return {
        success: true,
        data: reportRows.map(row =>
            mapPublishedSummary(
                row as Parameters<typeof mapPublishedSummary>[0],
                meetingStatusByReport.get(row.id) ?? null
            )
        ),
    }
}

export async function getPublishedReportDetailForRestaurant(id: string, restaurantId: string): Promise<ActionResponse<PublishedReportDetail>> {
    const { data, error } = await fetchPublishedReportDetailRow(id, restaurantId)

    if (error) return { success: false, error: 'No se pudo cargar el informe publicado.' }
    if (!data) return { success: false, error: 'Informe publicado no encontrado.' }

    return {
        success: true,
        data: {
            ...mapPublishedSummary(data as Parameters<typeof mapPublishedSummary>[0]),
            report: data.report_snapshot as ProfessionalRestaurantReport,
            narrativeOverrides: (data.narrative_overrides || {}) as Record<string, string>,
        },
    }
}

export async function markPublishedReportViewedForRestaurant(
    id: string,
    restaurantId: string
): Promise<ActionResponse<{ id: string; viewedAt: string }>> {
    const viewedAt = new Date().toISOString()
    const { data, error } = await updatePublishedReportViewedRow(id, restaurantId, viewedAt)

    if (error || !data) return { success: false, error: 'No se pudo marcar el informe como visto.' }

    return {
        success: true,
        data: {
            id: data.id,
            viewedAt: data.viewed_at ?? viewedAt,
        },
    }
}

export async function getPortalContextForRestaurant(restaurantId: string): Promise<ActionResponse<PortalContext>> {
    const month = currentMonth()
    const { from, to } = monthBounds(month)

    const [restaurantRes, salesRes, targetRes] = await fetchPortalContextRows(restaurantId, { month, from, to })

    const firstError = restaurantRes.error || salesRes.error || targetRes.error
    if (firstError) return { success: false, error: 'No se pudo cargar el contexto del portal.' }
    if (!restaurantRes.data) return { success: false, error: 'Restaurante no encontrado.' }

    const revenueActual = (salesRes.data || []).reduce((sum: number, row: { revenue_total?: number | null }) => sum + (row.revenue_total ?? 0), 0)
    const revenueTarget = targetRes.data?.revenue_target ?? 0

    return {
        success: true,
        data: {
            ...mapPortalContextBase(restaurantId, restaurantRes.data),
            liveRevenue: revenueTarget > 0
                ? {
                    month,
                    revenueActual,
                    revenueTarget,
                    completionPct: roundRatio(revenueActual / revenueTarget),
                }
                : null,
        },
    }
}

export async function requestConsultantMeetingForRestaurant(input: {
    restaurantId: string
    reportId: string
    message?: string
}): Promise<ActionResponse<PortalMeetingRequestResult>> {
    const { data: { user }, error: userError } = await fetchPortalAuthUser()
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' }

    const { data: report, error: reportError } = await fetchPublishedReportForMeetingRequest(input.reportId, input.restaurantId)

    if (reportError) return { success: false, error: 'No se pudo validar el informe.' }
    if (!report) return { success: false, error: 'Informe publicado no encontrado.' }

    const { data: existingRequest, error: existingRequestError } = await fetchOpenMeetingRequest(input.reportId, input.restaurantId)

    if (existingRequestError) return { success: false, error: 'No se pudo validar si ya existe una solicitud abierta.' }
    if (existingRequest) {
        await logAuditEvent({
            action: 'portal.meeting_request',
            target_type: 'portal_meeting_request',
            target_id: existingRequest.id,
            restaurantId: input.restaurantId,
            metadata: {
                report_id: input.reportId,
                reused: true,
            },
        })
        return { success: true, data: { id: existingRequest.id, reused: true } }
    }

    const { data, error } = await insertMeetingRequest({
        restaurantId: input.restaurantId,
        reportId: input.reportId,
        message: input.message,
        userId: user.id,
    })

    if (error || !data) return { success: false, error: 'No se pudo solicitar la reunión.' }

    await logAuditEvent({
        action: 'portal.meeting_request',
        target_type: 'portal_meeting_request',
        target_id: data.id,
        restaurantId: input.restaurantId,
        metadata: {
            report_id: input.reportId,
            reused: false,
        },
    })

    const notificationRes = await insertPortalNotification({
        restaurantId: input.restaurantId,
        type: 'CLIENT_MEETING_REQUEST',
        severity: 'WARNING',
        title: 'Nueva solicitud de reunión',
        message: 'El cliente ha solicitado revisar el informe publicado.',
        reportId: input.reportId,
        entityName: 'Informe publicado',
        metadata: {
            request_id: data.id,
        },
    })

    if (notificationRes.error) {
        log.warn({ err: notificationRes.error, reportId: input.reportId }, 'No se pudo crear la notificación de solicitud de reunión')
    }

    return { success: true, data: { id: data.id, reused: false } }
}

export async function getPortalPeriodComparisonForRestaurant(input: {
    restaurantId: string
    periodFrom: string
    periodTo: string
}): Promise<ActionResponse<PortalPeriodComparison>> {
    const { previousFrom, previousTo } = previousCalendarMonthBounds(input.periodFrom)

    const [currentSalesRes, currentExpensesRes, previousSalesRes, previousExpensesRes] = await fetchPortalPeriodComparisonRows({
        ...input,
        previousFrom,
        previousTo,
    })

    const firstError = currentSalesRes.error || currentExpensesRes.error || previousSalesRes.error || previousExpensesRes.error
    if (firstError) return { success: false, error: 'No se pudo cargar la comparación del periodo.' }

    return {
        success: true,
        data: buildPortalPeriodComparison({
            currentFrom: input.periodFrom,
            currentTo: input.periodTo,
            currentRevenue: sumRows(currentSalesRes.data as NumericRow[] | null, 'revenue_total'),
            currentExpenses: sumRows(currentExpensesRes.data as NumericRow[] | null, 'amount'),
            previousRevenue: sumRows(previousSalesRes.data as NumericRow[] | null, 'revenue_total'),
            previousExpenses: sumRows(previousExpensesRes.data as NumericRow[] | null, 'amount'),
        }),
    }
}

export async function getPortalMultiPeriodTrendForRestaurant(input: {
    restaurantId: string
    periodFrom: string
    periodTo: string
}): Promise<ActionResponse<PortalMultiPeriodTrend>> {
    const months = monthSequence(input.periodFrom, 3)
    const firstBounds = monthBounds(months[0] ?? monthFromDate(input.periodFrom))

    const [salesRes, expensesRes] = await fetchPortalMultiPeriodTrendRows({
        restaurantId: input.restaurantId,
        from: firstBounds.from,
        to: input.periodTo,
    })

    const firstError = salesRes.error || expensesRes.error
    if (firstError) return { success: false, error: 'No se pudo cargar la tendencia del portal.' }

    const revenueByMonth = sumRowsByMonth(salesRes.data as DatedNumericRow[] | null, 'date', 'revenue_total')
    const expensesByMonth = sumRowsByMonth(expensesRes.data as DatedNumericRow[] | null, 'expense_date', 'amount')

    return {
        success: true,
        data: buildPortalMultiPeriodTrend({
            currentFrom: input.periodFrom,
            currentTo: input.periodTo,
            monthlyData: months.map(month => {
                const bounds = monthBounds(month)
                return {
                    from: bounds.from,
                    to: month === monthFromDate(input.periodFrom) ? input.periodTo : bounds.to,
                    revenue: revenueByMonth.get(month) ?? 0,
                    expenses: expensesByMonth.get(month) ?? 0,
                }
            }),
        }),
    }
}

export async function getPortalExpenseBreakdownForRestaurant(input: {
    restaurantId: string
    periodFrom: string
    periodTo: string
}): Promise<ActionResponse<PortalExpenseCategoryBreakdown>> {
    const { previousFrom, previousTo } = previousCalendarMonthBounds(input.periodFrom)

    const [currentExpensesRes, previousExpensesRes] = await fetchPortalExpenseBreakdownRows({
        ...input,
        previousFrom,
        previousTo,
    })

    const firstError = currentExpensesRes.error || previousExpensesRes.error
    if (firstError) return { success: false, error: 'No se pudo cargar el desglose de gastos.' }

    return {
        success: true,
        data: buildPortalExpenseCategoryBreakdown({
            currentExpenses: (currentExpensesRes.data || []).map(row => ({
                category: String(row.category),
                amount: Number(row.amount ?? 0),
            })),
            previousExpenses: (previousExpensesRes.data || []).map(row => ({
                category: String(row.category),
                amount: Number(row.amount ?? 0),
            })),
        }),
    }
}
