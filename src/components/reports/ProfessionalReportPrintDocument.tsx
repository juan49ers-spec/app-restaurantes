import { formatCurrency, formatPct } from '@/lib/utils'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import type {
  PresentationKpi,
  ProfessionalReportSection,
  ReportMetric,
} from '@/lib/reporting'
import type { SavedProfessionalReportDraftDetail } from '@/app/actions/professional-reporting'

interface PrintConsultantBranding {
  consultantName?: string | null
  consultantEmail?: string | null
  consultantLogoUrl?: string | null
}

interface ProfessionalReportPrintDocumentProps {
  draft: SavedProfessionalReportDraftDetail
  branding?: PrintConsultantBranding
}

function formatMetricValue(metric: ReportMetric) {
  if (metric.value === null || metric.kind === 'not_available') return 'Sin dato'
  if (typeof metric.value === 'string') return metric.value
  if (metric.unit === 'eur') return formatCurrency(metric.value)
  if (metric.unit === 'pct') return formatPct(metric.value)
  if (metric.unit === 'days') return `${metric.value} días`
  return new Intl.NumberFormat('es-ES').format(metric.value)
}

function formatKpiValue(kpi: PresentationKpi) {
  if (kpi.value === null) return 'Sin dato'
  if (typeof kpi.value === 'string') return kpi.value
  if (kpi.unit === 'eur') return formatCurrency(kpi.value)
  if (kpi.unit === 'pct') return formatPct(kpi.value)
  if (kpi.unit === 'days') return `${kpi.value} días`
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

function printDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ProfessionalReportPrintDocument({
  draft,
  branding,
}: ProfessionalReportPrintDocumentProps) {
  const report = draft.report
  const presentation = buildProfessionalReportPresentation(report)
  const consultantName = branding?.consultantName || 'ControlHub'
  const consultantEmail = branding?.consultantEmail
  const documentReference = `${report.restaurant.name} · ${presentation.periodLabel} · v${draft.version}`

  return (
    <article className="mx-auto max-w-5xl bg-white px-8 py-10 shadow-sm print-document print:px-0 print:shadow-none">
      <style>{`
        @page {
          size: A4;
          margin: 16mm 14mm;
        }

        @media print {
          html {
            background: white;
          }

          .print-document {
            color-adjust: exact;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-page {
            break-after: page;
            min-height: 250mm;
          }

          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-chapter {
            break-before: page;
          }

          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #64748b;
            background: white;
          }
        }
      `}</style>

      <div className="hidden print-footer print:block">
        <div className="flex items-center justify-between gap-4">
          <span>{documentReference}</span>
          <span>{consultantName}</span>
        </div>
      </div>

      <header className="print-page relative overflow-hidden border-b border-slate-300 pb-10">
        <div className="absolute right-0 top-0 h-36 w-36 border-r-8 border-t-8 border-emerald-700" aria-hidden="true" />
        <div className="flex min-h-[520px] flex-col justify-between">
          <div>
            <div className="flex items-center gap-4">
              {branding?.consultantLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.consultantLogoUrl} alt="" className="h-12 max-w-44 object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center bg-slate-950 text-lg font-semibold text-white">
                  {consultantName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {presentation.eyebrow}
                </p>
                <p className="mt-1 text-sm text-slate-500">{consultantName}</p>
              </div>
            </div>

            <h1 className="mt-14 max-w-3xl text-6xl font-semibold tracking-tight text-slate-950">
              {presentation.title}
            </h1>
            <p className="mt-5 max-w-2xl text-2xl leading-9 text-slate-600">{presentation.subtitle}</p>
          </div>

          <div className="grid gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600 sm:grid-cols-2">
            <p><span className="font-semibold text-slate-950">Periodo:</span> {presentation.periodLabel}</p>
            <p><span className="font-semibold text-slate-950">Versión:</span> {draft.version} · {draft.status}</p>
            <p><span className="font-semibold text-slate-950">Generado:</span> {printDate(report.generatedAt)}</p>
            <p><span className="font-semibold text-slate-950">Guardado:</span> {printDate(draft.createdAt)}</p>
            {consultantEmail && (
              <p className="sm:col-span-2">
                <span className="font-semibold text-slate-950">Contacto consultor:</span> {consultantEmail}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="print-page border-b border-slate-200 py-10">
        <div className="mb-8 grid gap-3 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
          <p><span className="font-semibold text-slate-950">Referencia:</span> {documentReference}</p>
          <p><span className="font-semibold text-slate-950">Estado:</span> {draft.status}</p>
          <p><span className="font-semibold text-slate-950">Calidad:</span> {report.quality.confidence}% · {report.quality.status}</p>
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resumen ejecutivo</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950">
          {report.executiveSummary.headline}
        </h2>

        <div className="mt-6 grid gap-3">
          {report.executiveSummary.keyFindings.map((finding, index) => (
            <p key={`${finding}-${index}`} className="text-base leading-7 text-slate-700">
              {finding}
            </p>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presentation.kpis.map(kpi => (
            <div key={kpi.id} className="min-h-28 border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold">{formatKpiValue(kpi)}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{kpi.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="print-page border-b border-slate-200 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Índice</p>
        <div className="mt-8 grid gap-3">
          {presentation.chapters.map(chapter => (
            <div key={chapter.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-slate-200 pb-4">
              <div className="flex h-12 w-12 items-center justify-center bg-slate-950 text-base font-semibold text-white">
                {chapter.label}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{chapter.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{chapter.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="print-section border-b border-slate-200 py-10">
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
          <section key={chapter.id} className="print-chapter border-b border-slate-200 py-10">
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
              <div key={sectionData.id} className="print-section mt-8">
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

      <section className="print-chapter py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Anexo de calidad de dato</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Estado global</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{report.quality.status}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Confianza</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{report.quality.confidence}%</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Incidencias</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{report.quality.issues.length}</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden border border-slate-200">
          {report.sourceMap.map(source => (
            <div key={source.id} className="grid gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-semibold text-slate-950">{source.label}</p>
                <p className="mt-1 text-xs text-slate-500">{source.tables.join(', ')}</p>
              </div>
              <p className="text-sm leading-6 text-slate-600">{source.calculation}</p>
            </div>
          ))}
        </div>

        <footer className="pt-8 text-xs leading-6 text-slate-500">
          <p>Schema: {draft.schemaVersion}</p>
          <p>Este informe conserva snapshot, trazabilidad de fuentes e incidencias de calidad de datos del momento de guardado.</p>
        </footer>
      </section>
    </article>
  )
}
