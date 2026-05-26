'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import { getUserRestaurant } from './utils'

const MeetingRequestStatusSchema = z.enum(['PENDING', 'ACKNOWLEDGED', 'COMPLETED'])

const ConsultantBrandingSchema = z.object({
  consultantName: z.string().trim().max(120).optional(),
  consultantEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
  consultantLogoUrl: z.union([z.string().trim().url(), z.literal('')]).optional(),
})

const UpdateMeetingRequestStatusSchema = z.object({
  id: z.string().uuid(),
  status: MeetingRequestStatusSchema,
})

type ActionResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

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
}

export interface ConsultantMeetingRequest {
  id: string
  reportId: string | null
  message: string | null
  status: z.infer<typeof MeetingRequestStatusSchema>
  createdAt: string
  report: ConsultantPublishedReport | null
}

export interface ConsultantWorkspace {
  restaurant: ConsultantWorkspaceRestaurant
  publishedReports: ConsultantPublishedReport[]
  meetingRequests: ConsultantMeetingRequest[]
  warnings: string[]
}

type RestaurantRow = {
  id: string
  name: string
  consultant_name: string | null
  consultant_email: string | null
  consultant_logo_url: string | null
}

type PublishedReportRow = {
  id: string
  period_from: string
  period_to: string
  version: number
  status: ConsultantPublishedReport['status']
  published_at: string | null
}

type MeetingRequestRow = {
  id: string
  report_id: string | null
  message: string | null
  status: ConsultantMeetingRequest['status']
  created_at: string
}

function mapRestaurant(row: RestaurantRow): ConsultantWorkspaceRestaurant {
  return {
    id: row.id,
    name: row.name,
    consultantName: row.consultant_name,
    consultantEmail: row.consultant_email,
    consultantLogoUrl: row.consultant_logo_url,
  }
}

function mapPublishedReport(row: PublishedReportRow): ConsultantPublishedReport {
  return {
    id: row.id,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    version: row.version,
    status: row.status,
    publishedAt: row.published_at ?? '',
  }
}

export async function getConsultantWorkspace(): Promise<ActionResponse<ConsultantWorkspace>> {
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

  const supabase = await createClient()
  const [restaurantRes, reportsRes, requestsRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, consultant_name, consultant_email, consultant_logo_url')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('professional_report_drafts')
      .select('id, period_from, period_to, version, status, published_at')
      .eq('restaurant_id', restaurantId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false }),
    supabase
      .from('portal_meeting_requests')
      .select('id, report_id, message, status, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false }),
  ])

  if (restaurantRes.error) return { success: false, error: 'No se pudo cargar el restaurante activo.' }
  if (!restaurantRes.data) return { success: false, error: 'Restaurante no encontrado.' }

  const warnings = [
    reportsRes.error ? 'No se pudieron cargar los informes publicados.' : null,
    requestsRes.error ? 'No se pudieron cargar las solicitudes de reunión.' : null,
  ].filter((warning): warning is string => Boolean(warning))

  const publishedReports = reportsRes.error
    ? []
    : (reportsRes.data || []).map(row => mapPublishedReport(row as PublishedReportRow))
  const reportsById = new Map(publishedReports.map(report => [report.id, report]))
  const meetingRequests = requestsRes.error
    ? []
    : (requestsRes.data || []).map(row => {
        const request = row as MeetingRequestRow
        return {
          id: request.id,
          reportId: request.report_id,
          message: request.message,
          status: request.status,
          createdAt: request.created_at,
          report: request.report_id ? reportsById.get(request.report_id) ?? null : null,
        }
      })

  return {
    success: true,
    data: {
      restaurant: mapRestaurant(restaurantRes.data as RestaurantRow),
      publishedReports,
      meetingRequests,
      warnings,
    },
  }
}

export async function updateConsultantBranding(
  input: z.input<typeof ConsultantBrandingSchema>
): Promise<ActionResponse<ConsultantWorkspaceRestaurant>> {
  const parsed = ConsultantBrandingSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Datos de consultor inválidos.' }

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('restaurants')
    .update({
      consultant_name: parsed.data.consultantName || null,
      consultant_email: parsed.data.consultantEmail || null,
      consultant_logo_url: parsed.data.consultantLogoUrl || null,
    })
    .eq('id', restaurantId)
    .select('id, name, consultant_name, consultant_email, consultant_logo_url')
    .single()

  if (error || !data) return { success: false, error: 'No se pudo actualizar la identidad del consultor.' }

  revalidatePath('/consultant')
  revalidatePath('/portal')
  revalidatePath('/portal', 'layout')

  return { success: true, data: mapRestaurant(data as RestaurantRow) }
}

export async function updateMeetingRequestStatus(
  input: z.input<typeof UpdateMeetingRequestStatusSchema>
): Promise<ActionResponse<{ id: string; status: ConsultantMeetingRequest['status'] }>> {
  const parsed = UpdateMeetingRequestStatusSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Solicitud inválida.' }

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portal_meeting_requests')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)
    .eq('restaurant_id', restaurantId)
    .select('id, status')
    .single()

  if (error || !data) return { success: false, error: 'No se pudo actualizar la solicitud.' }

  revalidatePath('/consultant')
  revalidatePath('/portal')

  return {
    success: true,
    data: {
      id: data.id,
      status: data.status as ConsultantMeetingRequest['status'],
    },
  }
}
