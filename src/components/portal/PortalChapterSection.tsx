import { AlertTriangle, CheckCircle2, CircleDot, Database, TrendingUp, Users, WalletCards, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatPortalMetricValue } from '@/components/portal/format'
import type { PresentationChapter, ProfessionalReportSection } from '@/lib/reporting'
import { cn } from '@/lib/utils'

interface PortalChapterSectionProps {
  chapter: PresentationChapter
  sections: ProfessionalReportSection[]
  narrativeOverrides: Record<string, string>
}

const QUALITY_CLASS: Record<string, string> = {
  OK: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PARTIAL: 'border-amber-200 bg-amber-50 text-amber-800',
  MISSING: 'border-rose-200 bg-rose-50 text-rose-800',
  CONFLICT: 'border-rose-200 bg-rose-50 text-rose-800',
}

function sectionNarrative(section: ProfessionalReportSection, overrides: Record<string, string>) {
  const override = overrides[section.id]
  if (override) return override.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean)
  return section.narrative
}

function qualityIcon(status: string) {
  if (status === 'OK') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'PARTIAL') return <CircleDot className="h-4 w-4" />
  return <AlertTriangle className="h-4 w-4" />
}

function chapterIcon(chapterId: string) {
  if (chapterId.includes('menu')) return <Utensils className="h-5 w-5" />
  if (chapterId.includes('staff') || chapterId.includes('team')) return <Users className="h-5 w-5" />
  if (chapterId.includes('cost') || chapterId.includes('result')) return <WalletCards className="h-5 w-5" />
  return <TrendingUp className="h-5 w-5" />
}

export function PortalChapterSection({
  chapter,
  sections,
  narrativeOverrides,
}: PortalChapterSectionProps) {
  const firstNarrative = sections
    .flatMap(section => sectionNarrative(section, narrativeOverrides))
    .find(Boolean)

  return (
    <section id={`chapter-${chapter.id}`} className="scroll-mt-24 rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-slate-500">
              {chapterIcon(chapter.id)}
              <p className="text-sm font-bold uppercase tracking-wide">{chapter.label}</p>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{chapter.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{chapter.subtitle}</p>
          </div>
          <Badge variant="outline" className="rounded-md">
            {sections.length} {sections.length === 1 ? 'bloque' : 'bloques'}
          </Badge>
        </div>

        {firstNarrative && (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lectura del capítulo</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{firstNarrative}</p>
          </div>
        )}
      </header>

      <div className="divide-y divide-slate-200">
        {sections.map(section => {
          const narratives = sectionNarrative(section, narrativeOverrides)
          const secondaryNarratives = firstNarrative === narratives[0] ? narratives.slice(1) : narratives
          const qualityClass = QUALITY_CLASS[section.quality.status] ?? QUALITY_CLASS.PARTIAL

          return (
            <article key={section.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
                  <div className={cn('mt-2 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold', qualityClass)}>
                    {qualityIcon(section.quality.status)}
                    {section.quality.status} · {section.quality.confidence}% confianza
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Database className="h-4 w-4" />
                  {section.quality.evidence.length} evidencias
                </div>
              </div>

              {secondaryNarratives.length > 0 && (
                <div className="mt-4 space-y-3">
                  {secondaryNarratives.map((paragraph, index) => (
                    <p key={`${section.id}-paragraph-${index}`} className="text-sm leading-7 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {section.metrics.map(metric => (
                  <div key={metric.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-xl font-bold tracking-tight tabular-nums text-slate-950">{formatPortalMetricValue(metric)}</p>
                  </div>
                ))}
              </div>

              {section.quality.issues.length > 0 && (
                <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Incidencias de dato</p>
                  <ul className="mt-3 space-y-2">
                    {section.quality.issues.map(issue => (
                      <li key={issue.id} className="text-sm leading-6 text-amber-900">
                        <span className="font-semibold">{issue.severity}:</span> {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
