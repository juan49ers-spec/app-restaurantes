import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentRestaurant } from '@/app/actions/user'
import { formatPortalKpiValue } from '@/components/portal/format'
import { PortalExecutiveBrief } from '@/components/portal/PortalExecutiveBrief'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'
import { PortalPeriodComparisonPanel } from '@/components/portal/PortalPeriodComparisonPanel'
import { PortalReportSummary } from '@/components/portal/PortalReportSummary'
import { PortalSuggestedActions } from '@/components/portal/PortalSuggestedActions'
import { Button } from '@/components/ui/button'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import { buildPortalContextFallback, getPortalContextForRestaurant, getPortalPeriodComparisonForRestaurant, getPublishedReportDetailForRestaurant, getPublishedReportsForRestaurant } from '@/lib/portal'
import { buildPortalSuggestedActions } from '@/lib/portal-insights'
import { formatCurrency, formatPct } from '@/lib/utils'

export default async function PortalPage() {
  const restaurant = await getCurrentRestaurant()
  if (!restaurant) redirect('/login')
  const restaurantWithConsultant = restaurant as typeof restaurant & {
    consultant_name?: string | null
    consultant_email?: string | null
    consultant_logo_url?: string | null
  }

  const [contextRes, reportsRes] = await Promise.all([
    getPortalContextForRestaurant(restaurant.id),
    getPublishedReportsForRestaurant(restaurant.id),
  ])
  const context = contextRes.data ?? buildPortalContextFallback({
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    consultantName: restaurantWithConsultant.consultant_name,
    consultantEmail: restaurantWithConsultant.consultant_email,
    consultantLogoUrl: restaurantWithConsultant.consultant_logo_url,
  })
  const reports = reportsRes.data ?? []
  const latest = reports[0]
  const detailRes = latest ? await getPublishedReportDetailForRestaurant(latest.id, restaurant.id) : null
  const detail = detailRes?.data ?? null
  const presentation = detail ? buildProfessionalReportPresentation(detail.report) : null
  const comparisonRes = detail
    ? await getPortalPeriodComparisonForRestaurant({
      restaurantId: restaurant.id,
      periodFrom: detail.periodFrom,
      periodTo: detail.periodTo,
    })
    : null
  const comparison = comparisonRes?.data ?? null
  const suggestedActions = presentation ? buildPortalSuggestedActions(presentation) : []

  if (!latest || !detail || !presentation) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Portal cliente</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">{context?.restaurantName ?? 'Tu restaurante'}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Tu consultor aún no ha publicado ningún informe. Cuando haya un informe listo, aparecerá aquí con sus KPIs, conclusiones y descarga PDF.
          </p>
          <Button asChild className="mt-6">
            <Link href="/reports">Volver a ControlHub</Link>
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PortalExecutiveBrief
          presentation={presentation}
          reportId={latest.id}
          version={detail.version}
          status={detail.status}
          mode="home"
          restaurantName={context.restaurantName}
        />

        <PortalMeetingRequestDialog reportId={latest.id} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {presentation.kpis.slice(0, 4).map(kpi => (
          <div key={kpi.id} className="min-h-32 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-slate-950">{formatPortalKpiValue(kpi)}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{kpi.note}</p>
          </div>
        ))}
      </section>

      {context?.liveRevenue && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Actualización operativa — no forma parte del informe</p>
          <p className="mt-3 text-sm leading-6 text-emerald-900">
            Ventas acumuladas de {context.liveRevenue.month}: {formatCurrency(context.liveRevenue.revenueActual)} de {formatCurrency(context.liveRevenue.revenueTarget)} objetivo ({formatPct(context.liveRevenue.completionPct)}).
          </p>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {comparison && <PortalPeriodComparisonPanel comparison={comparison} />}
        <PortalSuggestedActions actions={suggestedActions} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-slate-950">Histórico de informes publicados</h2>
        <div className="mt-4 grid gap-3">
          {reports.map(report => (
            <PortalReportSummary key={report.id} report={report} />
          ))}
        </div>
      </section>
    </main>
  )
}
