import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/date-format'
import {
  evaluateProfessionalReportQualityGate,
  type ProfessionalRestaurantReport,
} from '@/lib/reporting'
import type {
  ConsultantChecklistStatus,
  ConsultantPreparationChecklist,
  ConsultantPreparationChecklistItem,
  ConsultantPreparationNextAction,
  ConsultantPreparationSeverity,
  ConsultantPreparationQualityGate,
  ReadyReportQualityRow,
} from './types'

export function periodFromMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { month, from: `${month}-01`, to }
}

export function currentMonthPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone: DEFAULT_BUSINESS_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now)
  const year = parts.find(part => part.type === 'year')?.value ?? now.getUTCFullYear().toString()
  const month = parts.find(part => part.type === 'month')?.value ?? String(now.getUTCMonth() + 1).padStart(2, '0')
  return periodFromMonth(`${year}-${month}`)
}

function statusFromCount(count: number, partialThreshold = 1): ConsultantChecklistStatus {
  if (count <= 0) return 'missing'
  if (count < partialThreshold) return 'partial'
  return 'complete'
}

function severityFor(status: ConsultantChecklistStatus, incompleteSeverity: ConsultantPreparationSeverity) {
  return status === 'complete' ? 'info' : incompleteSeverity
}

function nextActionFromItems(items: ConsultantPreparationChecklistItem[]): ConsultantPreparationNextAction | null {
  const nextItem =
    items.find(item => item.status !== 'complete' && item.severity === 'blocker') ??
    items.find(item => item.status !== 'complete' && item.severity === 'warning')

  if (!nextItem) return null

  return {
    itemId: nextItem.id,
    label: nextItem.actionLabel,
    href: nextItem.href,
    severity: nextItem.severity,
    reason: reasonForItem(nextItem),
  }
}

function reasonForItem(item: ConsultantPreparationChecklistItem) {
  if (item.severity === 'blocker') return blockerReason(item.id)
  return warningReason(item)
}

function blockerReason(itemId: string) {
  if (itemId === 'sales') return 'Sin ventas no se puede construir un informe fiable del periodo.'
  if (itemId === 'expenses') return 'Sin gastos no se puede validar la rentabilidad real del periodo.'
  if (itemId === 'ready_report') return 'Sin una versión READY no hay snapshot validado para publicar en el portal.'
  return 'Este bloqueo debe resolverse antes de entregar el informe al cliente.'
}

function warningReason(item: ConsultantPreparationChecklistItem) {
  if (item.id === 'invoices') {
    return 'Las facturas deben quedar revisadas para reforzar compras y proveedores; las cabeceras CSV históricas no sustituyen líneas de factura ni movimientos de stock.'
  }
  if (item.id === 'staff') {
    return 'Hay datos de equipo o turnos incompletos; el coste laboral puede quedar parcial en el informe.'
  }
  if (item.id === 'menu') {
    return 'Hay recetas, pero faltan ventas por receta; el análisis de mix, margen y carta quedará incompleto.'
  }
  if (item.id === 'menu_engineering') {
    return 'Sin una matriz BCG analizada, las recomendaciones de carta quedan menos accionables para el cliente.'
  }
  if (item.id === 'published_report') {
    return 'El informe READY todavía no está visible en el portal cliente.'
  }
  if (item.id === 'meeting_requests') {
    return 'Quedan solicitudes abiertas del cliente; conviene atenderlas para cerrar el seguimiento.'
  }
  return 'El informe puede avanzar, pero falta completar este bloque para mejorar la entrega.'
}

function checklistItemWeight(itemId: string) {
  if (itemId === 'sales' || itemId === 'expenses' || itemId === 'ready_report') return 3
  if (itemId === 'invoices' || itemId === 'staff' || itemId === 'menu' || itemId === 'menu_engineering') return 2
  return 1
}

function statusCompletionFactor(status: ConsultantChecklistStatus) {
  if (status === 'complete') return 1
  if (status === 'partial') return 0.5
  return 0
}

function weightedCompletionPct(items: ConsultantPreparationChecklistItem[]) {
  const totalWeight = items.reduce((total, item) => total + checklistItemWeight(item.id), 0)
  if (totalWeight === 0) return 0

  const completedWeight = items.reduce(
    (total, item) => total + checklistItemWeight(item.id) * statusCompletionFactor(item.status),
    0,
  )

  return Math.round((completedWeight / totalWeight) * 100)
}

export function buildPreparationChecklist(input: {
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
  const salesStatus = statusFromCount(input.salesCount, 7)
  const expensesStatus = statusFromCount(input.expensesCount)
  const invoiceStatus = input.invoiceCount > 0 && input.invoiceReviewCount === 0
    ? 'complete'
    : input.invoiceCount > 0 || input.invoiceReviewCount > 0 ? 'partial' : 'missing'
  const staffStatus = input.employeeCount > 0 && input.shiftCount > 0
    ? 'complete'
    : input.employeeCount > 0 || input.shiftCount > 0 ? 'partial' : 'missing'
  const menuStatus = input.recipeCount > 0 && input.recipeSalesCount > 0
    ? 'complete'
    : input.recipeCount > 0 || input.recipeSalesCount > 0 ? 'partial' : 'missing'
  const menuEngineeringStatus = statusFromCount(input.menuEngineeringCount)
  const readyReportStatus = statusFromCount(input.readyDraftCount)
  const publishedReportStatus = statusFromCount(input.publishedCount)
  const meetingRequestsStatus = input.openRequestCount === 0 ? 'complete' : 'partial'

  const items: ConsultantPreparationChecklistItem[] = [
    {
      id: 'sales',
      label: 'Ventas cargadas',
      description: 'Días de venta registrados en el periodo.',
      status: salesStatus,
      severity: severityFor(salesStatus, 'blocker'),
      count: input.salesCount,
      href: `/financial-control?from=${period.from}&to=${period.to}`,
      actionLabel: 'Cargar ventas',
    },
    {
      id: 'expenses',
      label: 'Gastos cargados',
      description: 'Movimientos de gasto disponibles para leer costes.',
      status: expensesStatus,
      severity: severityFor(expensesStatus, 'blocker'),
      count: input.expensesCount,
      href: `/financial-control?from=${period.from}&to=${period.to}`,
      actionLabel: 'Cargar gastos',
    },
    {
      id: 'invoices',
      label: 'Facturas/proveedores revisados',
      description: 'Facturas completadas dentro del periodo.',
      status: invoiceStatus,
      severity: severityFor(invoiceStatus, 'warning'),
      count: input.invoiceCount + input.invoiceReviewCount,
      href: '/invoices',
      actionLabel: 'Revisar facturas',
    },
    {
      id: 'staff',
      label: 'Equipo y turnos revisados',
      description: 'Plantilla activa y turnos disponibles para coste laboral.',
      status: staffStatus,
      severity: severityFor(staffStatus, 'warning'),
      count: input.employeeCount + input.shiftCount,
      href: input.employeeCount > 0 && input.shiftCount === 0 ? '/staff/schedule' : '/staff/employees',
      actionLabel: input.employeeCount > 0 && input.shiftCount === 0 ? 'Revisar turnos' : 'Revisar equipo',
    },
    {
      id: 'menu',
      label: 'Carta y ventas por receta',
      description: 'Recetas y ventas por receta para analizar mix y margen.',
      status: menuStatus,
      severity: severityFor(menuStatus, 'warning'),
      count: input.recipeCount + input.recipeSalesCount,
      href: input.recipeCount > 0 && input.recipeSalesCount === 0 ? '/stock' : '/escandallos',
      actionLabel: input.recipeCount > 0 && input.recipeSalesCount === 0 ? 'Cargar ventas por receta' : 'Revisar carta',
    },
    {
      id: 'menu_engineering',
      label: 'Menu Engineering calculado',
      description: 'Snapshot BCG ANALYZED disponible para el periodo.',
      status: menuEngineeringStatus,
      severity: severityFor(menuEngineeringStatus, 'warning'),
      count: input.menuEngineeringCount,
      href: '/menu-engineering',
      actionLabel: 'Calcular Menu Engineering',
    },
    {
      id: 'ready_report',
      label: 'Informe listo para publicar',
      description: 'Versión READY guardada desde la mesa de informes.',
      status: readyReportStatus,
      severity: severityFor(readyReportStatus, 'blocker'),
      count: input.readyDraftCount,
      href: `/reports?from=${period.from}&to=${period.to}`,
      actionLabel: 'Crear READY',
    },
    {
      id: 'published_report',
      label: 'Informe publicado en portal',
      description: 'Versión visible para el cliente restaurante.',
      status: publishedReportStatus,
      severity: severityFor(publishedReportStatus, 'warning'),
      count: input.publishedCount,
      href: '/portal',
      actionLabel: 'Publicar informe',
    },
    {
      id: 'meeting_requests',
      label: 'Solicitudes pendientes atendidas',
      description: 'No quedan solicitudes abiertas del cliente.',
      status: meetingRequestsStatus,
      severity: severityFor(meetingRequestsStatus, 'warning'),
      count: input.openRequestCount,
      href: '/consultant',
      actionLabel: 'Atender solicitudes',
    },
  ]
  const readyCount = items.filter(item => item.status === 'complete').length

  return {
    period,
    completionPct: weightedCompletionPct(items),
    readyCount,
    totalCount: items.length,
    qualityGate: input.qualityGate,
    nextAction: nextActionFromItems(items),
    items,
  }
}

export function buildPreparationQualityGate(
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
