import { notFound, redirect } from 'next/navigation'
import { getCurrentRestaurant } from '@/app/actions/user'
import { formatPortalKpiValue, formatPortalMetricValue } from '@/components/portal/format'
import { PortalChapterNavigation } from '@/components/portal/PortalChapterNavigation'
import { PortalExecutiveBrief } from '@/components/portal/PortalExecutiveBrief'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import { getPublishedReportDetailForRestaurant } from '@/lib/portal'
import type { ProfessionalReportSection } from '@/lib/reporting'

interface PortalReportDetailPageProps {
  params: Promise<{ id: string }>
}

function sectionNarrative(section: ProfessionalReportSection, overrides: Record<string, string>) {
  const override = overrides[section.id]
  if (override) return override.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean)
  return section.narrative
}

export default async function PortalReportDetailPage({ params }: PortalReportDetailPageProps) {
  const { id } = await params
  const restaurant = await getCurrentRestaurant()
  if (!restaurant) redirect('/login')

  const detailRes = await getPublishedReportDetailForRestaurant(id, restaurant.id)

  if (!detailRes.success || !detailRes.data) {
    notFound()
  }

  const draft = detailRes.data
  const report = draft.report
  const presentation = buildProfessionalReportPresentation(report)

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <PortalExecutiveBrief
          presentation={presentation}
          reportId={draft.id}
          version={draft.version}
          status={draft.status}
          mode="detail"
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presentation.kpis.map(kpi => (
            <div key={kpi.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPortalKpiValue(kpi)}</p>
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
            <section id={`chapter-${chapter.id}`} key={chapter.id} className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-6">
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
                        <p className="mt-2 text-lg font-semibold text-slate-950">{formatPortalMetricValue(metric)}</p>
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
        <div className="lg:sticky lg:top-6">
          <div className="space-y-4">
            <PortalChapterNavigation chapters={presentation.chapters} />
            <PortalMeetingRequestDialog reportId={draft.id} />
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Calidad del informe</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{report.quality.confidence}%</p>
              <p className="mt-2 text-sm text-slate-600">{report.quality.status}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Esta calidad pertenece al snapshot publicado. El portal no recalcula datos vivos del informe.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  )
}
