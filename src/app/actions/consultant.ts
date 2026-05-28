'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import {
  buildDeliveryReports,
  buildPreparationChecklist,
  buildPreparationQualityGate,
  currentMonthPeriod,
  mapConsultantClientRow,
  mapOwnedRestaurantClient,
  mapPublishedReport,
  mapRestaurant,
  mergeConsultantPortfolio,
  periodFromMonth,
  type ConsultantClientLinkRow,
  type ConsultantClientRestaurantRow,
  type ConsultantClientSummary,
  type ConsultantMeetingRequest,
  type ConsultantPreparationChecklist,
  type ConsultantWorkspace,
  type ConsultantWorkspaceRestaurant,
  type MeetingRequestRow,
  type PublishedReportRow,
  type ReadyReportQualityRow,
  type ReadyReportRow,
  type RestaurantRow,
} from '@/lib/consultant'
import { fail, ok, type ActionResult } from './action-result'
import { getUserRestaurant } from './utils'

export type {
  ConsultantChecklistStatus,
  ConsultantClientRole,
  ConsultantClientStatus,
  ConsultantClientSummary,
  ConsultantDeliveryReport,
  ConsultantDeliveryStatus,
  ConsultantMeetingRequest,
  ConsultantPreparationChecklist,
  ConsultantPreparationChecklistItem,
  ConsultantPreparationNextAction,
  ConsultantPreparationQualityGate,
  ConsultantPreparationSeverity,
  ConsultantPublishedReport,
  ConsultantWorkspace,
  ConsultantWorkspaceRestaurant,
} from '@/lib/consultant'

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

const ChecklistPeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido.'),
})

const SelectConsultantClientSchema = z.object({
  restaurantId: z.string().uuid(),
})

type ActionResponse<T> = ActionResult<T>

type CountResult = {
  count: number | null
  error: { message: string } | null
}

function countValue(result: CountResult) {
  return result.error ? 0 : result.count ?? 0
}

async function canAccessRestaurantAsConsultant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  restaurantId: string,
) {
  const [ownedRes, linkedRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('owner_id', userId)
      .maybeSingle(),
    supabase
      .from('consultant_restaurants')
      .select('restaurant_id')
      .eq('consultant_user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('status', 'ACTIVE')
      .maybeSingle(),
  ])

  return Boolean(ownedRes.data || linkedRes.data)
}

async function fetchChecklistCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  period: { from: string; to: string },
) {
  const checklistRes = await Promise.all([
    supabase.from('daily_sales').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gt('revenue_total', 0).gte('date', period.from).lte('date', period.to),
    supabase.from('operating_expenses').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('expense_date', period.from).lte('expense_date', period.to),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'completed').gte('date', period.from).lte('date', period.to),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).in('status', ['review_required', 'processing']).gte('date', period.from).lte('date', period.to),
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'ACTIVE'),
    supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('date', period.from).lte('date', period.to),
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('daily_recipe_sales').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('date', period.from).lte('date', period.to),
    supabase.from('menu_reports').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'ANALYZED').lte('date_from', period.to).gte('date_to', period.from),
    supabase.from('professional_report_drafts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('period_from', period.from).eq('period_to', period.to).eq('status', 'READY'),
    supabase.from('professional_report_drafts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('period_from', period.from).eq('period_to', period.to).not('published_at', 'is', null),
    supabase.from('portal_meeting_requests').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).neq('status', 'COMPLETED'),
  ]) as CountResult[]

  return {
    salesCount: countValue(checklistRes[0]),
    expensesCount: countValue(checklistRes[1]),
    invoiceCount: countValue(checklistRes[2]),
    invoiceReviewCount: countValue(checklistRes[3]),
    employeeCount: countValue(checklistRes[4]),
    shiftCount: countValue(checklistRes[5]),
    recipeCount: countValue(checklistRes[6]),
    recipeSalesCount: countValue(checklistRes[7]),
    menuEngineeringCount: countValue(checklistRes[8]),
    readyDraftCount: countValue(checklistRes[9]),
    publishedCount: countValue(checklistRes[10]),
    openRequestCount: countValue(checklistRes[11]),
    hasWarning: checklistRes.some(result => result.error),
  }
}

async function fetchLatestReadyReportQualityGate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  period: { from: string; to: string },
) {
  const { data, error } = await supabase
    .from('professional_report_drafts')
    .select('id, version, updated_at, report_snapshot')
    .eq('restaurant_id', restaurantId)
    .eq('period_from', period.from)
    .eq('period_to', period.to)
    .eq('status', 'READY')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) return { qualityGate: null, hasWarning: true }

  const latest = Array.isArray(data) ? data[0] : data
  if (!latest) return { qualityGate: null, hasWarning: false }

  return {
    qualityGate: buildPreparationQualityGate(latest as ReadyReportQualityRow, restaurantId, period),
    hasWarning: false,
  }
}

export async function getConsultantPortfolio(): Promise<ActionResponse<ConsultantClientSummary[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado.')

  const activeRestaurantId = await getUserRestaurant()
  const [ownedRes, linkedRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, consultant_name')
      .eq('owner_id', user.id),
    supabase
      .from('consultant_restaurants')
      .select('restaurant_id, role, status, restaurants(id, name, consultant_name)')
      .eq('consultant_user_id', user.id)
      .eq('status', 'ACTIVE'),
  ])

  if (ownedRes.error || linkedRes.error) {
    return fail('No se pudo cargar la cartera de clientes.')
  }

  const ownedClients = ((ownedRes.data || []) as ConsultantClientRestaurantRow[])
    .map(row => mapOwnedRestaurantClient(row, activeRestaurantId))
  const linkedClients = ((linkedRes.data || []) as ConsultantClientLinkRow[])
    .map(row => mapConsultantClientRow(row, activeRestaurantId))
    .filter((client): client is ConsultantClientSummary => Boolean(client))

  return ok(mergeConsultantPortfolio(ownedClients, linkedClients))
}

export async function selectConsultantClient(
  input: z.input<typeof SelectConsultantClientSchema>
): Promise<ActionResponse<{ restaurantId: string }>> {
  const parsed = SelectConsultantClientSchema.safeParse(input)
  if (!parsed.success) return fail('Cliente inválido.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado.')

  const hasAccess = await canAccessRestaurantAsConsultant(supabase, user.id, parsed.data.restaurantId)
  if (!hasAccess) return fail('No tienes acceso a este restaurante.')

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  cookieStore.set('active_consultant_restaurant_id', parsed.data.restaurantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  revalidatePath('/consultant')
  revalidatePath('/', 'layout')

  return ok({ restaurantId: parsed.data.restaurantId })
}

export async function getConsultantWorkspace(): Promise<ActionResponse<ConsultantWorkspace>> {
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return fail('No hay restaurante activo.')

  const supabase = await createClient()
  const period = currentMonthPeriod()
  const [restaurantRes, reportsRes, readyReportsRes, requestsRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, consultant_name, consultant_email, consultant_logo_url')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('professional_report_drafts')
      .select('id, period_from, period_to, version, status, published_at, viewed_at')
      .eq('restaurant_id', restaurantId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false }),
    supabase
      .from('professional_report_drafts')
      .select('id, period_from, period_to, version, status, published_at, viewed_at')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'READY')
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('portal_meeting_requests')
      .select('id, report_id, message, status, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false }),
  ])

  if (restaurantRes.error) return fail('No se pudo cargar el restaurante activo.')
  if (!restaurantRes.data) return fail('Restaurante no encontrado.')

  const warnings = [
    reportsRes.error ? 'No se pudieron cargar los informes publicados.' : null,
    readyReportsRes.error ? 'No se pudo cargar el flujo de entrega.' : null,
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
  const deliveryReports = readyReportsRes.error
    ? []
    : buildDeliveryReports((readyReportsRes.data || []) as ReadyReportRow[], meetingRequests)

  const [checklistCounts, qualityGateRes] = await Promise.all([
    fetchChecklistCounts(supabase, restaurantId, period),
    fetchLatestReadyReportQualityGate(supabase, restaurantId, period),
  ])
  const checklistWarnings = checklistCounts.hasWarning || qualityGateRes.hasWarning
    ? ['No se pudo completar toda la checklist de preparación.']
    : []
  const preparation = buildPreparationChecklist({
    period,
    ...checklistCounts,
    qualityGate: qualityGateRes.qualityGate,
  })

  return ok({
    restaurant: mapRestaurant(restaurantRes.data as RestaurantRow),
    publishedReports,
    meetingRequests,
    deliveryReports,
    preparation,
    warnings: [...warnings, ...checklistWarnings],
  })
}

export async function getPreparationChecklistForPeriod(
  input: z.input<typeof ChecklistPeriodSchema>
): Promise<ActionResponse<ConsultantPreparationChecklist>> {
  const parsed = ChecklistPeriodSchema.safeParse(input)
  if (!parsed.success) return fail('Periodo inválido.')

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return fail('No hay restaurante activo.')

  const supabase = await createClient()
  const period = periodFromMonth(parsed.data.month)
  const [checklistCounts, qualityGateRes] = await Promise.all([
    fetchChecklistCounts(supabase, restaurantId, period),
    fetchLatestReadyReportQualityGate(supabase, restaurantId, period),
  ])

  return ok(buildPreparationChecklist({
    period,
    ...checklistCounts,
    qualityGate: qualityGateRes.qualityGate,
  }))
}

export async function updateConsultantBranding(
  input: z.input<typeof ConsultantBrandingSchema>
): Promise<ActionResponse<ConsultantWorkspaceRestaurant>> {
  const parsed = ConsultantBrandingSchema.safeParse(input)
  if (!parsed.success) return fail('Datos de consultor inválidos.')

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return fail('No hay restaurante activo.')

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

  if (error || !data) return fail('No se pudo actualizar la identidad del consultor.')

  revalidatePath('/consultant')
  revalidatePath('/portal')
  revalidatePath('/portal', 'layout')

  return ok(mapRestaurant(data as RestaurantRow))
}

export async function updateMeetingRequestStatus(
  input: z.input<typeof UpdateMeetingRequestStatusSchema>
): Promise<ActionResponse<{ id: string; status: ConsultantMeetingRequest['status'] }>> {
  const parsed = UpdateMeetingRequestStatusSchema.safeParse(input)
  if (!parsed.success) return fail('Solicitud inválida.')

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return fail('No hay restaurante activo.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portal_meeting_requests')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)
    .eq('restaurant_id', restaurantId)
    .select('id, status')
    .single()

  if (error || !data) return fail('No se pudo actualizar la solicitud.')

  revalidatePath('/consultant')
  revalidatePath('/portal')

  return ok({
    id: data.id,
    status: data.status as ConsultantMeetingRequest['status'],
  })
}
