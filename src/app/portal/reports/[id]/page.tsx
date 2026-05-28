import { notFound, redirect } from 'next/navigation'
import { getCurrentRestaurant } from '@/app/actions/user'
import { formatPortalKpiValue } from '@/components/portal/format'
import { PortalChapterSection } from '@/components/portal/PortalChapterSection'
import { PortalChapterNavigation } from '@/components/portal/PortalChapterNavigation'
import { PortalExecutiveBrief } from '@/components/portal/PortalExecutiveBrief'
import { PortalExpenseBreakdown } from '@/components/portal/PortalExpenseBreakdown'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'
import { PortalMultiPeriodTrend } from '@/components/portal/PortalMultiPeriodTrend'
import { PortalPeriodComparisonPanel } from '@/components/portal/PortalPeriodComparisonPanel'
import { PortalReviewRoadmap } from '@/components/portal/PortalReviewRoadmap'
import { PortalSuggestedActions } from '@/components/portal/PortalSuggestedActions'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import {
  getPortalExpenseBreakdownForRestaurant,
  getPortalMultiPeriodTrendForRestaurant,
  getPortalPeriodComparisonForRestaurant,
  getPublishedReportDetailForRestaurant,
  markPublishedReportViewedForRestaurant,
} from '@/lib/portal'
import { buildPortalSuggestedActions } from '@/lib/portal-insights'
import type { ProfessionalReportSection } from '@/lib/reporting'

interface PortalReportDetailPageProps {
  params: Promise<{ id: string }>
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
  await markPublishedReportViewedForRestaurant(draft.id, restaurant.id)
  const report = draft.report
  const presentation = buildProfessionalReportPresentation(report)
  const [comparisonRes, trendRes, expenseBreakdownRes] = await Promise.all([
    getPortalPeriodComparisonForRestaurant({
      restaurantId: restaurant.id,
      periodFrom: draft.periodFrom,
      periodTo: draft.periodTo,
    }),
    getPortalMultiPeriodTrendForRestaurant({
      restaurantId: restaurant.id,
      periodFrom: draft.periodFrom,
      periodTo: draft.periodTo,
    }),
    getPortalExpenseBreakdownForRestaurant({
      restaurantId: restaurant.id,
      periodFrom: draft.periodFrom,
      periodTo: draft.periodTo,
    }),
  ])
  const suggestedActions = buildPortalSuggestedActions(presentation)

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <PortalExecutiveBrief
          presentation={presentation}
          reportId={draft.id}
          version={draft.version}
          status={draft.status}
          mode="detail"
          restaurantName={restaurant.name}
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presentation.kpis.map(kpi => (
            <div key={kpi.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">{formatPortalKpiValue(kpi)}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{kpi.note}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Conclusiones ejecutivas</h2>
          <div className="mt-4 grid gap-3">
            {presentation.conclusions.map(conclusion => (
              <div key={conclusion.id} className="rounded-md bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{conclusion.order}. {conclusion.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{conclusion.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          {comparisonRes.data && <PortalPeriodComparisonPanel comparison={comparisonRes.data} />}
          <PortalSuggestedActions actions={suggestedActions} />
        </section>

        {trendRes.data && <PortalMultiPeriodTrend trend={trendRes.data} />}
        {expenseBreakdownRes.data && <PortalExpenseBreakdown breakdown={expenseBreakdownRes.data} />}

        <PortalReviewRoadmap
          viewedAt={draft.viewedAt}
          meetingStatus={draft.meetingStatus}
          suggestedActionCount={suggestedActions.length}
        />

        {presentation.chapters.map(chapter => {
          const chapterSections = chapter.sectionIds
            .map(sectionId => report.sections.find(section => section.id === sectionId))
            .filter((section): section is ProfessionalReportSection => Boolean(section))

          return (
            <PortalChapterSection
              key={chapter.id}
              chapter={chapter}
              sections={chapterSections}
              narrativeOverrides={draft.narrativeOverrides}
            />
          )
        })}
      </div>

      <aside className="min-w-0 space-y-4">
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
