'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import {
    getPortalContextForRestaurant,
    getPublishedReportDetailForRestaurant,
    getPublishedReportsForRestaurant,
    requestConsultantMeetingForRestaurant,
    type ActionResponse,
    type PublishedReportDetail,
    type PublishedReportSummary,
    type PortalMeetingRequestResult,
    type PortalContext,
} from '@/lib/portal'
import { evaluateProfessionalReportQualityGate, type ProfessionalRestaurantReport } from '@/lib/reporting'
import { getUserRestaurant } from './utils'

export type { PublishedReportDetail, PublishedReportSummary, PortalContext } from '@/lib/portal'

const DraftIdSchema = z.string().uuid()
const MeetingRequestSchema = z.object({
    reportId: z.string().uuid(),
    message: z.string().max(2000).optional(),
})

export async function publishReportDraft(id: string): Promise<ActionResponse<{ id: string; publishedAt: string }>> {
    const parsed = DraftIdSchema.safeParse(id)
    if (!parsed.success) return { success: false, error: 'Informe inválido.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' }

    const { data: draft, error: draftError } = await supabase
        .from('professional_report_drafts')
        .select('id, report_snapshot')
        .eq('id', parsed.data)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'READY')
        .maybeSingle()

    if (draftError || !draft) return { success: false, error: 'No se pudo publicar el informe.' }

    const reportSnapshot = draft.report_snapshot as Partial<ProfessionalRestaurantReport> | null
    if (
        !reportSnapshot?.restaurant?.id ||
        reportSnapshot.restaurant.id !== restaurantId ||
        !reportSnapshot.quality ||
        !Array.isArray(reportSnapshot.sections)
    ) {
        return { success: false, error: 'No se pudo publicar el informe.' }
    }

    const qualityGate = evaluateProfessionalReportQualityGate(reportSnapshot as ProfessionalRestaurantReport)
    if (!qualityGate.canPublish) {
        return { success: false, error: 'El informe tiene bloqueos criticos y no puede publicarse.' }
    }

    const publishedAt = new Date().toISOString()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .update({ published_at: publishedAt, published_by: user.id, viewed_at: null })
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
        .update({ published_at: null, published_by: null, viewed_at: null })
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

    return getPublishedReportsForRestaurant(restaurantId)
}

export async function getPublishedReportDetail(id: string): Promise<ActionResponse<PublishedReportDetail>> {
    const parsed = DraftIdSchema.safeParse(id)
    if (!parsed.success) return { success: false, error: 'Informe inválido.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    return getPublishedReportDetailForRestaurant(parsed.data, restaurantId)
}

export async function getPortalContext(): Promise<ActionResponse<PortalContext>> {
    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    return getPortalContextForRestaurant(restaurantId)
}

export async function requestConsultantMeeting(input: z.input<typeof MeetingRequestSchema>): Promise<ActionResponse<PortalMeetingRequestResult>> {
    const parsed = MeetingRequestSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Solicitud inválida.' }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

    return requestConsultantMeetingForRestaurant({
        restaurantId,
        reportId: parsed.data.reportId,
        message: parsed.data.message,
    })
}
