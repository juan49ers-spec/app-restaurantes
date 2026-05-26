'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import type { ProfessionalRestaurantReport } from '@/lib/reporting'
import { getUserRestaurant } from './utils'

type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

const DraftIdSchema = z.string().uuid()
const MeetingRequestSchema = z.object({
    reportId: z.string().uuid(),
    message: z.string().max(2000).optional(),
})

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

export async function publishReportDraft(id: string): Promise<ActionResponse<{ id: string; publishedAt: string }>> {
    const parsed = DraftIdSchema.safeParse(id)
    if (!parsed.success) return { success: false, error: 'Informe inválido.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' }

    const publishedAt = new Date().toISOString()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .update({ published_at: publishedAt, published_by: user.id })
        .eq('id', parsed.data)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'READY')
        .select('id, published_at')
        .single()

    if (error || !data) return { success: false, error: 'No se pudo publicar el informe.' }

    revalidatePath('/reports')
    revalidatePath('/portal')
    revalidatePath(`/portal/reports/${parsed.data}`)

    return { success: true, data: { id: data.id, publishedAt: data.published_at } }
}

export async function unpublishReportDraft(id: string): Promise<ActionResponse<{ id: string }>> {
    const parsed = DraftIdSchema.safeParse(id)
    if (!parsed.success) return { success: false, error: 'Informe inválido.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .update({ published_at: null, published_by: null })
        .eq('id', parsed.data)
        .eq('restaurant_id', restaurantId)
        .select('id')
        .single()

    if (error || !data) return { success: false, error: 'No se pudo despublicar el informe.' }

    revalidatePath('/reports')
    revalidatePath('/portal')
    revalidatePath(`/portal/reports/${parsed.data}`)

    return { success: true, data: { id: data.id } }
}

export async function getPublishedReports(): Promise<ActionResponse<PublishedReportSummary[]>> {
    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

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

export async function getPublishedReportDetail(id: string): Promise<ActionResponse<PublishedReportDetail>> {
    const parsed = DraftIdSchema.safeParse(id)
    if (!parsed.success) return { success: false, error: 'Informe inválido.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, report_snapshot, narrative_overrides, created_at, updated_at, exported_at, published_at, published_by')
        .eq('id', parsed.data)
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

export async function getPortalContext(): Promise<ActionResponse<PortalContext>> {
    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

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
            restaurantId,
            restaurantName: restaurantRes.data.name,
            consultantName: restaurantRes.data.consultant_name ?? null,
            consultantEmail: restaurantRes.data.consultant_email ?? null,
            consultantLogoUrl: restaurantRes.data.consultant_logo_url ?? null,
            liveRevenue: revenueTarget > 0
                ? {
                    month,
                    revenueActual,
                    revenueTarget,
                    completionPct: revenueActual / revenueTarget,
                }
                : null,
        },
    }
}

export async function requestConsultantMeeting(input: z.input<typeof MeetingRequestSchema>): Promise<ActionResponse<{ id: string }>> {
    const parsed = MeetingRequestSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Solicitud inválida.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' }

    const { data: report, error: reportError } = await supabase
        .from('professional_report_drafts')
        .select('id')
        .eq('id', parsed.data.reportId)
        .eq('restaurant_id', restaurantId)
        .not('published_at', 'is', null)
        .maybeSingle()

    if (reportError) return { success: false, error: 'No se pudo validar el informe.' }
    if (!report) return { success: false, error: 'Informe publicado no encontrado.' }

    const { data, error } = await supabase
        .from('portal_meeting_requests')
        .insert({
            restaurant_id: restaurantId,
            report_id: parsed.data.reportId,
            message: parsed.data.message?.trim() || null,
            status: 'PENDING',
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error || !data) return { success: false, error: 'No se pudo solicitar la reunión.' }

    revalidatePath('/portal')
    revalidatePath(`/portal/reports/${parsed.data.reportId}`)

    return { success: true, data: { id: data.id } }
}
