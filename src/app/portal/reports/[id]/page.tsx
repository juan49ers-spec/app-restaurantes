import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPortalContext, getPublishedReportDetail } from '@/app/actions/portal'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'
import { Button } from '@/components/ui/button'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import { formatCurrency, formatPct } from '@/lib/utils'
import type { PresentationKpi, ProfessionalReportSection, ReportMetric } from '@/lib/reporting'

interface PortalReportDetailPageProps {
  params: Promise<{ id: string }>
}

function formatKpiValue(kpi: PresentationKpi) {
  if (kpi.value === null) return 'Sin dato'
  if (typeof kpi.value === 'string') return kpi.value
  if (kpi.unit === 'eur') return formatCurrency(kpi.value)
  if (kpi.unit === 'pct') return formatPct(kpi.value)
  if (kpi.unit === 'days') return `${kpi.value} días`
  return new Intl.NumberFormat('es-ES').format(kpi.value)
}

function formatMetricValue(metric: ReportMetric) {
  if (metric.value === null || metric.kind === 'not_available') return 'Sin dato'
  if (typeof metric.value === 'string') return metric.value
  if (metric.unit === 'eur') return formatCurrency(metric.value)
  if (metric.unit === 'pct') return formatPct(metric.value)
  if (metric.unit === 'days') return `${metric.value} días`
  return new Intl.NumberFormat('es-ES').format(metric.value)
}

function sectionNarrative(section: ProfessionalReportSection, overrides: Record<string, string>) {
  const override = overrides[section.id]
  if (override) return override.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean)
  return section.narrative
}

export default async function PortalReportDetailPage({ params }: PortalReportDetailPageProps) {
  const { id } = await params
  const [detailRes, contextRes] = await Promise.all([
    getPublishedReportDetail(id),
    getPortalContext(),
  ])

  if (!detailRes.success || !detailRes.data) {
    notFound()
  }

  const draft = detailRes.data
  const report = draft.report
  const presentation = buildProfessionalReportPresentation(report)

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {contextRes.data?.consultantName ?? 'Informe publicado'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">{presentation.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{presentation.periodLabel} · Versión {draft.version}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/portal">Volver al portal</Link>
            </Button>
            <Button asChild>
              <Link href={`/reports/print/${draft.id}`}>Descargar PDF</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presentation.kpis.map(kpi => (
            <div key={kpi.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatKpiValue(kpi)}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{kpi.note}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">Conclusiones ejecutivas</h2>
          <div className="mt-4 grid gap-3">
            {presentation.conclusions.map(conclusion => (
              <div key={conclusion.id} className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{conclusion.order}. {conclusion.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{conclusion.body}</p>
              </div>
            ))}
          </div>
        </section>

        {presentation.chapters.map(chapter => {
          const chapterSections = chapter.sectionIds
            .map(sectionId => report.sections.find(section => section.id === sectionId))
            .filter((section): section is ProfessionalReportSection => Boolean(section))

          return (
            <section key={chapter.id} className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{chapter.label}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{chapter.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{chapter.subtitle}</p>

              {chapterSections.map(section => (
                <div key={section.id} className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {section.quality.status} · {section.quality.confidence}% confianza
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {section.quality.evidence.length} evidencias · {section.quality.issues.length} incidencias
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {section.metrics.map(metric => (
                      <div key={metric.id} className="rounded-md border border-slate-200 p-3">
                        <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{formatMetricValue(metric)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {sectionNarrative(section, draft.narrativeOverrides).map((paragraph, index) => (
                      <p key={`${section.id}-${index}`} className="text-sm leading-7 text-slate-600">{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )
        })}
      </div>

      <aside className="space-y-4">
        <PortalMeetingRequestDialog reportId={draft.id} />
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-950">Calidad del informe</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{report.quality.confidence}%</p>
          <p className="mt-2 text-sm text-slate-600">{report.quality.status}</p>
        </div>
      </aside>
    </main>
  )
}
