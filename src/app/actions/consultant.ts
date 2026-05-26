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

export type ConsultantChecklistStatus = 'complete' | 'partial' | 'missing'

export interface ConsultantPreparationChecklistItem {
  id: string
  label: string
  description: string
  status: ConsultantChecklistStatus
  count: number
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
  items: ConsultantPreparationChecklistItem[]
}

export interface ConsultantWorkspace {
  restaurant: ConsultantWorkspaceRestaurant
  publishedReports: ConsultantPublishedReport[]
  meetingRequests: ConsultantMeetingRequest[]
  preparation: ConsultantPreparationChecklist
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

type CountResult = {
  count: number | null
  error: { message: string } | null
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

function currentMonthPeriod(now = new Date()) {
  const month = now.toISOString().slice(0, 7)
  const [year, monthNumber] = month.split('-').map(Number)
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { month, from: `${month}-01`, to }
}

function countValue(result: CountResult) {
  return result.error ? 0 : result.count ?? 0
}

function statusFromCount(count: number, partialThreshold = 1): ConsultantChecklistStatus {
  if (count <= 0) return 'missing'
  if (count < partialThreshold) return 'partial'
  return 'complete'
}

function buildPreparationChecklist(input: {
  period: ReturnType<typeof currentMonthPeriod>
  salesCount: number
  expensesCount: number
  invoiceCount: number
  employeeCount: number
  shiftCount: number
  recipeCount: number
  recipeSalesCount: number
  menuEngineeringCount: number
  readyDraftCount: number
  publishedCount: number
  openRequestCount: number
}): ConsultantPreparationChecklist {
  const { period } = input
  const items: ConsultantPreparationChecklistItem[] = [
    {
      id: 'sales',
      label: 'Ventas cargadas',
      description: 'Días de venta registrados en el periodo.',
      status: statusFromCount(input.salesCount, 7),
      count: input.salesCount,
      href: `/financial-control?from=${period.from}&to=${period.to}`,
    },
    {
      id: 'expenses',
      label: 'Gastos cargados',
      description: 'Movimientos de gasto disponibles para leer costes.',
      status: statusFromCount(input.expensesCount, 3),
      count: input.expensesCount,
      href: `/financial-control?from=${period.from}&to=${period.to}`,
    },
    {
      id: 'invoices',
      label: 'Facturas/proveedores revisados',
      description: 'Facturas completadas dentro del periodo.',
      status: statusFromCount(input.invoiceCount),
      count: input.invoiceCount,
      href: '/invoices',
    },
    {
      id: 'staff',
      label: 'Equipo y turnos revisados',
      description: 'Plantilla activa y turnos disponibles para coste laboral.',
      status: input.employeeCount > 0 && input.shiftCount > 0 ? 'complete' : input.employeeCount > 0 || input.shiftCount > 0 ? 'partial' : 'missing',
      count: input.employeeCount + input.shiftCount,
      href: '/staff/employees',
    },
    {
      id: 'menu',
      label: 'Carta y ventas por receta',
      description: 'Recetas y ventas por receta para analizar mix y margen.',
      status: input.recipeCount > 0 && input.recipeSalesCount > 0 ? 'complete' : input.recipeCount > 0 || input.recipeSalesCount > 0 ? 'partial' : 'missing',
      count: input.recipeCount + input.recipeSalesCount,
      href: '/escandallos',
    },
    {
      id: 'menu_engineering',
      label: 'Menu Engineering calculado',
      description: 'Snapshot BCG ANALYZED disponible para el periodo.',
      status: statusFromCount(input.menuEngineeringCount),
      count: input.menuEngineeringCount,
      href: '/menu-engineering',
    },
    {
      id: 'ready_report',
      label: 'Informe listo para publicar',
      description: 'Versión READY guardada desde la mesa de informes.',
      status: statusFromCount(input.readyDraftCount),
      count: input.readyDraftCount,
      href: `/reports?from=${period.from}&to=${period.to}`,
    },
    {
      id: 'published_report',
      label: 'Informe publicado en portal',
      description: 'Versión visible para el cliente restaurante.',
      status: statusFromCount(input.publishedCount),
      count: input.publishedCount,
      href: '/portal',
    },
    {
      id: 'meeting_requests',
      label: 'Solicitudes pendientes atendidas',
      description: 'No quedan solicitudes abiertas del cliente.',
      status: input.openRequestCount === 0 ? 'complete' : 'partial',
      count: input.openRequestCount,
      href: '/consultant',
    },
  ]
  const readyCount = items.filter(item => item.status === 'complete').length

  return {
    period,
    completionPct: Math.round((readyCount / items.length) * 100),
    readyCount,
    totalCount: items.length,
    items,
  }
}

export async function getConsultantWorkspace(): Promise<ActionResponse<ConsultantWorkspace>> {
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

  const supabase = await createClient()
  const period = currentMonthPeriod()
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

  const checklistRes = await Promise.all([
    supabase.from('daily_sales').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('date', period.from).lte('date', period.to),
    supabase.from('operating_expenses').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('expense_date', period.from).lte('expense_date', period.to),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'completed').gte('date', period.from).lte('date', period.to),
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'ACTIVE'),
    supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('date', period.from).lte('date', period.to),
    supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('daily_recipe_sales').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('date', period.from).lte('date', period.to),
    supabase.from('menu_reports').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'ANALYZED').gte('date_from', period.from).lte('date_to', period.to),
    supabase.from('professional_report_drafts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('period_from', period.from).eq('period_to', period.to).eq('status', 'READY'),
    supabase.from('professional_report_drafts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('period_from', period.from).eq('period_to', period.to).not('published_at', 'is', null),
  ]) as CountResult[]

  const checklistWarnings = checklistRes.some(result => result.error)
    ? ['No se pudo completar toda la checklist de preparación.']
    : []
  const openRequestCount = meetingRequests.filter(request => request.status !== 'COMPLETED').length
  const preparation = buildPreparationChecklist({
    period,
    salesCount: countValue(checklistRes[0]),
    expensesCount: countValue(checklistRes[1]),
    invoiceCount: countValue(checklistRes[2]),
    employeeCount: countValue(checklistRes[3]),
    shiftCount: countValue(checklistRes[4]),
    recipeCount: countValue(checklistRes[5]),
    recipeSalesCount: countValue(checklistRes[6]),
    menuEngineeringCount: countValue(checklistRes[7]),
    readyDraftCount: countValue(checklistRes[8]),
    publishedCount: countValue(checklistRes[9]),
    openRequestCount,
  })

  return {
    success: true,
    data: {
      restaurant: mapRestaurant(restaurantRes.data as RestaurantRow),
      publishedReports,
      meetingRequests,
      preparation,
      warnings: [...warnings, ...checklistWarnings],
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
