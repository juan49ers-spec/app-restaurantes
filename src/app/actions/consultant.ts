'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/date-format'
import {
  evaluateProfessionalReportQualityGate,
  type ProfessionalReportQualityGateStatus,
  type ProfessionalRestaurantReport,
} from '@/lib/reporting'
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

const ChecklistPeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido.'),
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
  status: ConsultantDeliveryStatus
  openRequestCount: number
  completedRequestCount: number
  nextActionHref: string
  nextActionLabel: string
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

type ReadyReportRow = PublishedReportRow

type ReadyReportQualityRow = {
  id: string
  version: number
  report_snapshot: unknown
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

function buildDeliveryReports(
  rows: ReadyReportRow[],
  meetingRequests: ConsultantMeetingRequest[]
): ConsultantDeliveryReport[] {
  return rows.map(row => {
    const requests = meetingRequests.filter(request => request.reportId === row.id)
    const openRequestCount = requests.filter(request => request.status !== 'COMPLETED').length
    const completedRequestCount = requests.filter(request => request.status === 'COMPLETED').length
    const periodHref = `/reports?from=${row.period_from}&to=${row.period_to}`

    if (!row.published_at) {
      return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        publishedAt: null,
        status: 'READY_TO_PUBLISH',
        openRequestCount,
        completedRequestCount,
        nextActionHref: periodHref,
        nextActionLabel: 'Publicar desde informes',
      }
    }

    if (openRequestCount > 0) {
      return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        publishedAt: row.published_at,
        status: 'MEETING_REQUESTED',
        openRequestCount,
        completedRequestCount,
        nextActionHref: '/consultant',
        nextActionLabel: 'Atender solicitud',
      }
    }

    if (completedRequestCount > 0) {
      return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        publishedAt: row.published_at,
        status: 'FOLLOW_UP_COMPLETE',
        openRequestCount,
        completedRequestCount,
        nextActionHref: `/portal/reports/${row.id}`,
        nextActionLabel: 'Ver entrega',
      }
    }

    return {
      id: row.id,
      periodFrom: row.period_from,
      periodTo: row.period_to,
      version: row.version,
      publishedAt: row.published_at,
      status: 'PUBLISHED',
      openRequestCount,
      completedRequestCount,
      nextActionHref: `/portal/reports/${row.id}`,
      nextActionLabel: 'Revisar portal',
    }
  })
}

function periodFromMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { month, from: `${month}-01`, to }
}

function currentMonthPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone: DEFAULT_BUSINESS_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now)
  const year = parts.find(part => part.type === 'year')?.value ?? now.getUTCFullYear().toString()
  const month = parts.find(part => part.type === 'month')?.value ?? String(now.getUTCMonth() + 1).padStart(2, '0')
  return periodFromMonth(`${year}-${month}`)
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
  invoiceReviewCount: number
  employeeCount: number
  shiftCount: number
  recipeCount: number
  recipeSalesCount: number
  menuEngineeringCount: number
  readyDraftCount: number
  publishedCount: number
  openRequestCount: number
  qualityGate: ConsultantPreparationQualityGate | null
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
      status: statusFromCount(input.expensesCount),
      count: input.expensesCount,
      href: `/financial-control?from=${period.from}&to=${period.to}`,
    },
    {
      id: 'invoices',
      label: 'Facturas/proveedores revisados',
      description: 'Facturas completadas dentro del periodo.',
      status: input.invoiceCount > 0 && input.invoiceReviewCount === 0
        ? 'complete'
        : input.invoiceCount > 0 || input.invoiceReviewCount > 0 ? 'partial' : 'missing',
      count: input.invoiceCount + input.invoiceReviewCount,
      href: '/invoices',
    },
    {
      id: 'staff',
      label: 'Equipo y turnos revisados',
      description: 'Plantilla activa y turnos disponibles para coste laboral.',
      status: input.employeeCount > 0 && input.shiftCount > 0 ? 'complete' : input.employeeCount > 0 || input.shiftCount > 0 ? 'partial' : 'missing',
      count: input.employeeCount + input.shiftCount,
      href: input.employeeCount > 0 && input.shiftCount === 0 ? '/staff/schedule' : '/staff/employees',
    },
    {
      id: 'menu',
      label: 'Carta y ventas por receta',
      description: 'Recetas y ventas por receta para analizar mix y margen.',
      status: input.recipeCount > 0 && input.recipeSalesCount > 0 ? 'complete' : input.recipeCount > 0 || input.recipeSalesCount > 0 ? 'partial' : 'missing',
      count: input.recipeCount + input.recipeSalesCount,
      href: input.recipeCount > 0 && input.recipeSalesCount === 0 ? '/stock' : '/escandallos',
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
    qualityGate: input.qualityGate,
    items,
  }
}

function buildPreparationQualityGate(
  row: ReadyReportQualityRow,
  restaurantId: string,
  period: { from: string; to: string },
): ConsultantPreparationQualityGate {
  const href = `/reports?from=${period.from}&to=${period.to}`
  const reportSnapshot = row.report_snapshot as Partial<ProfessionalRestaurantReport> | null

  if (
    !reportSnapshot?.restaurant?.id ||
    reportSnapshot.restaurant.id !== restaurantId ||
    !reportSnapshot.quality ||
    !Array.isArray(reportSnapshot.sections)
  ) {
    return {
      status: 'BLOCKED',
      canPublish: false,
      summary: 'El último informe READY no tiene un snapshot válido para este restaurante. Regenera y guarda una nueva versión antes de publicar.',
      blockerCount: 1,
      warningCount: 0,
      infoCount: 0,
      draftId: row.id,
      version: row.version,
      href,
    }
  }

  const gate = evaluateProfessionalReportQualityGate(reportSnapshot as ProfessionalRestaurantReport)

  return {
    status: gate.status,
    canPublish: gate.canPublish,
    summary: gate.summary,
    blockerCount: gate.blockers.length,
    warningCount: gate.warnings.length,
    infoCount: gate.info.length,
    draftId: row.id,
    version: row.version,
    href,
  }
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

export async function getConsultantWorkspace(): Promise<ActionResponse<ConsultantWorkspace>> {
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

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
      .select('id, period_from, period_to, version, status, published_at')
      .eq('restaurant_id', restaurantId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false }),
    supabase
      .from('professional_report_drafts')
      .select('id, period_from, period_to, version, status, published_at')
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

  if (restaurantRes.error) return { success: false, error: 'No se pudo cargar el restaurante activo.' }
  if (!restaurantRes.data) return { success: false, error: 'Restaurante no encontrado.' }

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

  return {
    success: true,
    data: {
      restaurant: mapRestaurant(restaurantRes.data as RestaurantRow),
      publishedReports,
      meetingRequests,
      deliveryReports,
      preparation,
      warnings: [...warnings, ...checklistWarnings],
    },
  }
}

export async function getPreparationChecklistForPeriod(
  input: z.input<typeof ChecklistPeriodSchema>
): Promise<ActionResponse<ConsultantPreparationChecklist>> {
  const parsed = ChecklistPeriodSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Periodo inválido.' }

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }

  const supabase = await createClient()
  const period = periodFromMonth(parsed.data.month)
  const [checklistCounts, qualityGateRes] = await Promise.all([
    fetchChecklistCounts(supabase, restaurantId, period),
    fetchLatestReadyReportQualityGate(supabase, restaurantId, period),
  ])

  return {
    success: true,
    data: buildPreparationChecklist({
      period,
      ...checklistCounts,
      qualityGate: qualityGateRes.qualityGate,
    }),
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
