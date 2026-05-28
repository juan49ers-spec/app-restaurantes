import { createClient } from '@/lib/supabaseServer'

export async function fetchPublishedReportRows(restaurantId: string) {
    const supabase = await createClient()
    return supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, created_at, updated_at, exported_at, published_at, published_by, viewed_at')
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
}

export async function fetchMeetingRequestRowsForReports(restaurantId: string, reportIds: string[]) {
    const supabase = await createClient()
    return supabase
        .from('portal_meeting_requests')
        .select('report_id, status, created_at')
        .eq('restaurant_id', restaurantId)
        .in('report_id', reportIds)
        .order('created_at', { ascending: false })
}

export async function fetchPublishedReportDetailRow(id: string, restaurantId: string) {
    const supabase = await createClient()
    return supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, report_snapshot, narrative_overrides, created_at, updated_at, exported_at, published_at, published_by, viewed_at')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .maybeSingle()
}

export async function updatePublishedReportViewedRow(id: string, restaurantId: string, viewedAt: string) {
    const supabase = await createClient()
    return supabase
        .from('professional_report_drafts')
        .update({ viewed_at: viewedAt })
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .select('id, viewed_at')
        .single()
}

export async function fetchPortalContextRows(restaurantId: string, period: { month: string; from: string; to: string }) {
    const supabase = await createClient()
    return Promise.all([
        supabase
            .from('restaurants')
            .select('id, name, consultant_name, consultant_email, consultant_logo_url')
            .eq('id', restaurantId)
            .maybeSingle(),
        supabase
            .from('daily_sales')
            .select('revenue_total')
            .eq('restaurant_id', restaurantId)
            .gte('date', period.from)
            .lte('date', period.to),
        supabase
            .from('monthly_targets')
            .select('revenue_target')
            .eq('restaurant_id', restaurantId)
            .eq('month_year', period.month)
            .maybeSingle(),
    ])
}

export async function fetchPortalAuthUser() {
    const supabase = await createClient()
    return supabase.auth.getUser()
}

export async function fetchPublishedReportForMeetingRequest(reportId: string, restaurantId: string) {
    const supabase = await createClient()
    return supabase
        .from('professional_report_drafts')
        .select('id')
        .eq('id', reportId)
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .maybeSingle()
}

export async function fetchOpenMeetingRequest(reportId: string, restaurantId: string) {
    const supabase = await createClient()
    return supabase
        .from('portal_meeting_requests')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('report_id', reportId)
        .in('status', ['PENDING', 'ACKNOWLEDGED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
}

export async function insertMeetingRequest(input: {
    restaurantId: string
    reportId: string
    message?: string
    userId: string
}) {
    const supabase = await createClient()
    return supabase
        .from('portal_meeting_requests')
        .insert({
            restaurant_id: input.restaurantId,
            report_id: input.reportId,
            message: input.message?.trim() || null,
            status: 'PENDING',
            created_by: input.userId,
        })
        .select('id')
        .single()
}

export async function insertPortalNotification(input: {
    restaurantId: string
    type: 'REPORT_PUBLISHED' | 'CLIENT_MEETING_REQUEST'
    severity: 'INFO' | 'WARNING'
    title: string
    message: string
    reportId: string
    entityName: string
    metadata?: Record<string, unknown>
}) {
    const supabase = await createClient()
    return supabase
        .from('alert_notifications')
        .insert({
            restaurant_id: input.restaurantId,
            rule_id: null,
            type: input.type,
            severity: input.severity,
            title: input.title,
            message: input.message,
            entity_type: 'REPORT',
            entity_id: input.reportId,
            entity_name: input.entityName,
            metadata: input.metadata ?? {},
            read: false,
        })
}

export async function fetchPortalPeriodComparisonRows(input: {
    restaurantId: string
    periodFrom: string
    periodTo: string
    previousFrom: string
    previousTo: string
}) {
    const supabase = await createClient()
    return Promise.all([
        supabase
            .from('daily_sales')
            .select('revenue_total')
            .eq('restaurant_id', input.restaurantId)
            .gte('date', input.periodFrom)
            .lte('date', input.periodTo),
        supabase
            .from('operating_expenses')
            .select('amount')
            .eq('restaurant_id', input.restaurantId)
            .gte('expense_date', input.periodFrom)
            .lte('expense_date', input.periodTo),
        supabase
            .from('daily_sales')
            .select('revenue_total')
            .eq('restaurant_id', input.restaurantId)
            .gte('date', input.previousFrom)
            .lte('date', input.previousTo),
        supabase
            .from('operating_expenses')
            .select('amount')
            .eq('restaurant_id', input.restaurantId)
            .gte('expense_date', input.previousFrom)
            .lte('expense_date', input.previousTo),
    ])
}

export async function fetchPortalMultiPeriodTrendRows(input: {
    restaurantId: string
    from: string
    to: string
}) {
    const supabase = await createClient()
    return Promise.all([
        supabase
            .from('daily_sales')
            .select('date, revenue_total')
            .eq('restaurant_id', input.restaurantId)
            .gte('date', input.from)
            .lte('date', input.to),
        supabase
            .from('operating_expenses')
            .select('expense_date, amount')
            .eq('restaurant_id', input.restaurantId)
            .gte('expense_date', input.from)
            .lte('expense_date', input.to),
    ])
}

export async function fetchPortalExpenseBreakdownRows(input: {
    restaurantId: string
    periodFrom: string
    periodTo: string
    previousFrom: string
    previousTo: string
}) {
    const supabase = await createClient()
    return Promise.all([
        supabase
            .from('operating_expenses')
            .select('category, amount')
            .eq('restaurant_id', input.restaurantId)
            .gte('expense_date', input.periodFrom)
            .lte('expense_date', input.periodTo),
        supabase
            .from('operating_expenses')
            .select('category, amount')
            .eq('restaurant_id', input.restaurantId)
            .gte('expense_date', input.previousFrom)
            .lte('expense_date', input.previousTo),
    ])
}
