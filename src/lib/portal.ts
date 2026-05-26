import { createClient } from '@/lib/supabaseServer'
import type { ProfessionalRestaurantReport } from '@/lib/reporting'

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
}): PublishedReportSummary {
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
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, created_at, updated_at, exported_at, published_at, published_by')
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })

    if (error) return { success: false, error: 'No se pudieron cargar los informes publicados.' }

    return { success: true, data: (data || []).map(row => mapPublishedSummary(row as Parameters<typeof mapPublishedSummary>[0])) }
}

export async function getPublishedReportDetailForRestaurant(id: string, restaurantId: string): Promise<ActionResponse<PublishedReportDetail>> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, report_snapshot, narrative_overrides, created_at, updated_at, exported_at, published_at, published_by')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .maybeSingle()

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

export async function getPortalContextForRestaurant(restaurantId: string): Promise<ActionResponse<PortalContext>> {
    const supabase = await createClient()
    const month = currentMonth()
    const { from, to } = monthBounds(month)

    const [restaurantRes, salesRes, targetRes] = await Promise.all([
        supabase
            .from('restaurants')
            .select('id, name, consultant_name, consultant_email, consultant_logo_url')
            .eq('id', restaurantId)
            .maybeSingle(),
        supabase
            .from('daily_sales')
            .select('revenue_total')
            .eq('restaurant_id', restaurantId)
            .gte('date', from)
            .lte('date', to),
        supabase
            .from('monthly_targets')
            .select('revenue_target')
            .eq('restaurant_id', restaurantId)
            .eq('month_year', month)
            .maybeSingle(),
    ])

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
