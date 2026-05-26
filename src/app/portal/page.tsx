import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentRestaurant } from '@/app/actions/user'
import { formatPortalKpiValue } from '@/components/portal/format'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'
import { PortalReportSummary } from '@/components/portal/PortalReportSummary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import { buildPortalContextFallback, getPortalContextForRestaurant, getPublishedReportDetailForRestaurant, getPublishedReportsForRestaurant } from '@/lib/portal'
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
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Último informe publicado</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">{presentation.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{presentation.periodLabel}</p>
            </div>
            <Badge variant="secondary" className="rounded-md">{detail.status}</Badge>
          </div>

          <div className="mt-6 grid gap-3">
            {presentation.conclusions.slice(0, 3).map(conclusion => (
              <div key={conclusion.id} className="rounded-md bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-950">{conclusion.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{conclusion.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/portal/reports/${latest.id}`}>Ver informe</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/reports/print/${latest.id}`} target="_blank" rel="noreferrer">Descargar PDF</Link>
            </Button>
          </div>
        </div>

        <PortalMeetingRequestDialog reportId={latest.id} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {presentation.kpis.slice(0, 4).map(kpi => (
          <div key={kpi.id} className="min-h-32 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatPortalKpiValue(kpi)}</p>
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

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Histórico de informes publicados</h2>
        <div className="mt-4 grid gap-3">
          {reports.map(report => (
            <PortalReportSummary key={report.id} report={report} />
          ))}
        </div>
      </section>
    </main>
  )
}
