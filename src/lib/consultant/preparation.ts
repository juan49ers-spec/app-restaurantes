import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/date-format'
import {
  evaluateProfessionalReportQualityGate,
  type ProfessionalRestaurantReport,
} from '@/lib/reporting'
import type {
  ConsultantChecklistStatus,
  ConsultantPreparationChecklist,
  ConsultantPreparationChecklistItem,
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
