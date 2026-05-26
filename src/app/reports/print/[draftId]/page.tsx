import { notFound } from 'next/navigation'
import { getSavedProfessionalReportDraft } from '@/app/actions/professional-reporting'
import { PrintReportButton } from '@/components/reports/PrintReportButton'
import { formatCurrency, formatPct } from '@/lib/utils'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import type { PresentationKpi, ProfessionalReportSection, ReportMetric } from '@/lib/reporting'

interface PrintReportPageProps {
  params: Promise<{
    draftId: string
  }>
}

function formatMetricValue(metric: ReportMetric) {
  if (metric.value === null || metric.kind === 'not_available') return 'Sin dato'
  if (typeof metric.value === 'string') return metric.value
  if (metric.unit === 'eur') return formatCurrency(metric.value)
  if (metric.unit === 'pct') return formatPct(metric.value)
  if (metric.unit === 'days') return `${metric.value} dias`
  return new Intl.NumberFormat('es-ES').format(metric.value)
}

function formatKpiValue(kpi: PresentationKpi) {
  if (kpi.value === null) return 'Sin dato'
  if (typeof kpi.value === 'string') return kpi.value
  if (kpi.unit === 'eur') return formatCurrency(kpi.value)
  if (kpi.unit === 'pct') return formatPct(kpi.value)
  if (kpi.unit === 'days') return `${kpi.value} dias`
  return new Intl.NumberFormat('es-ES').format(kpi.value)
}

function sectionNarrative(section: ProfessionalReportSection, overrides: Record<string, string>) {
  const override = overrides[section.id]
  if (override) return override.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean)
  return section.narrative
}

function statusCopy(status: ProfessionalReportSection['quality']['status']) {
  if (status === 'OK') return 'Completo'
  if (status === 'PARTIAL') return 'Parcial'
  if (status === 'CONFLICT') return 'Conflicto'
  return 'Faltan datos'
}

export default async function PrintReportPage({ params }: PrintReportPageProps) {
  const { draftId } = await params
  const response = await getSavedProfessionalReportDraft(draftId)

  if (!response.success || !response.data) {
    notFound()
  }

  const draft = response.data
  const report = draft.report
  const presentation = buildProfessionalReportPresentation(report)

  return (
    <main className="min-h-screen bg-[#f5f2ec] text-slate-950 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Informe version {draft.version}</p>
            <p className="text-xs text-slate-500">{report.restaurant.name}</p>
          </div>
          <PrintReportButton draftId={draft.id} />
        </div>
      </div>

      <article className="mx-auto max-w-5xl bg-white px-8 py-10 shadow-sm print:px-0 print:shadow-none">
        <header className="relative min-h-[520px] overflow-hidden border-b border-slate-300 pb-10 print:min-h-[600px]">
          <div className="absolute right-0 top-0 h-32 w-32 border-r-8 border-t-8 border-emerald-700" aria-hidden="true" />
          <div className="flex h-full min-h-[480px] flex-col justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">{presentation.eyebrow}</p>
              <h1 className="mt-6 max-w-3xl text-6xl font-semibold tracking-tight text-slate-950">{presentation.title}</h1>
              <p className="mt-5 max-w-2xl text-2xl leading-9 text-slate-600">{presentation.subtitle}</p>
            </div>

            <div className="grid gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600 sm:grid-cols-2">
              <p><span className="font-semibold text-slate-950">Periodo:</span> {presentation.periodLabel}</p>
              <p><span className="font-semibold text-slate-950">Version:</span> {draft.version} · {draft.status}</p>
              <p><span className="font-semibold text-slate-950">Generado:</span> {new Date(report.generatedAt).toLocaleString('es-ES')}</p>
              <p><span className="font-semibold text-slate-950">Guardado:</span> {new Date(draft.createdAt).toLocaleString('es-ES')}</p>
            </div>
          </div>
        </header>

        <section className="break-inside-avoid border-b border-slate-200 py-8">
          <h2 className="text-2xl font-semibold text-slate-950">{report.executiveSummary.headline}</h2>
          <div className="mt-4 grid gap-3">
            {report.executiveSummary.keyFindings.map((finding, index) => (
              <p key={`${finding}-${index}`} className="text-base leading-7 text-slate-700">
                {finding}
              </p>
            ))}
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presentation.kpis.map(kpi => (
              <div key={kpi.id} className="min-h-28 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold">{formatKpiValue(kpi)}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{kpi.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="break-inside-avoid border-b border-slate-200 py-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Conclusiones ejecutivas</p>
          <div className="mt-5 grid gap-4">
            {presentation.conclusions.map(conclusion => (
              <div key={conclusion.id} className="grid gap-4 border border-slate-200 p-4 sm:grid-cols-[56px_minmax(0,1fr)]">
                <div className="flex h-12 w-12 items-center justify-center bg-slate-950 text-lg font-semibold text-white">
                  {conclusion.order}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{conclusion.title}</h2>
                  <p className="mt-2 text-base leading-7 text-slate-700">{conclusion.body}</p>
                  <p className="mt-3 text-xs text-slate-500">{conclusion.sourceIds.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {presentation.chapters.map(chapter => {
          const chapterSections = chapter.sectionIds
            .map(sectionId => report.sections.find(item => item.id === sectionId))
            .filter((item): item is ProfessionalReportSection => Boolean(item))

          return (
            <section key={chapter.id} className="break-inside-avoid border-b border-slate-200 py-10">
              <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)]">
                <div className="flex h-14 w-14 items-center justify-center bg-slate-950 text-lg font-semibold text-white">
                  {chapter.label}
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-slate-950">{chapter.title}</h2>
                  <p className="mt-2 text-base text-slate-500">{chapter.subtitle}</p>
                </div>
              </div>

              {chapterSections.map(sectionData => (
                <div key={sectionData.id} className="mt-8">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-950">{sectionData.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {statusCopy(sectionData.quality.status)} · {sectionData.quality.confidence}% confianza
                      </p>
                    </div>
                    <p className="text-sm text-slate-500">
                      {sectionData.quality.evidence.length} evidencias · {sectionData.quality.issues.length} incidencias
                    </p>
                  </div>

                  <div className="mt-5 overflow-hidden border border-slate-200">
                    {sectionData.metrics.map(metric => (
                      <div key={metric.id} className="grid gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_180px]">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{metric.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{metric.sourceIds.join(', ') || 'Fuente interna'}</p>
                        </div>
                        <p className="text-left text-lg font-semibold text-slate-950 sm:text-right">{formatMetricValue(metric)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-4">
                    {sectionNarrative(sectionData, draft.narrativeOverrides).map((paragraph, index) => (
                      <p key={`${sectionData.id}-${index}`} className="text-base leading-8 text-slate-700">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {sectionData.quality.issues.length > 0 && (
                    <div className="mt-6 border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Incidencias de datos</p>
                      <ul className="mt-3 space-y-2 text-sm text-amber-900">
                        {sectionData.quality.issues.map(issue => (
                          <li key={issue.id}>{issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )
        })}

        <footer className="pt-8 text-xs leading-6 text-slate-500">
          <p>Schema: {draft.schemaVersion}</p>
          <p>Este informe conserva snapshot, trazabilidad de fuentes e incidencias de calidad de datos del momento de guardado.</p>
        </footer>
      </article>
    </main>
  )
}
