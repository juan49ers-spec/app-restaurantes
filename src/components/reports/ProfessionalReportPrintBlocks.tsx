import type { SavedProfessionalReportDraftDetail } from '@/app/actions/professional-reporting'
import type { DataQualityIssue } from '@/lib/reporting'

interface PrintConsultantBranding {
  consultantName?: string | null
  consultantEmail?: string | null
}

function printDate(value: string | null) {
  if (!value) return 'No registrado'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function issueSeverityLabel(severity: DataQualityIssue['severity']) {
  if (severity === 'critical') return 'Crítica'
  if (severity === 'warning') return 'Advertencia'
  return 'Informativa'
}

export function PrintDocumentControl({
  draft,
  branding,
  reference,
}: {
  draft: SavedProfessionalReportDraftDetail
  branding?: PrintConsultantBranding
  reference: string
}) {
  return (
    <section className="print-section border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ficha de control</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{reference}</h2>
        </div>
        <div className="bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
          Versión {draft.version}
        </div>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-semibold text-slate-950">Restaurante</dt>
          <dd className="mt-1 text-slate-600">{draft.report.restaurant.name}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Periodo</dt>
          <dd className="mt-1 text-slate-600">{draft.periodFrom} a {draft.periodTo}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Estado interno</dt>
          <dd className="mt-1 text-slate-600">{draft.status}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Confianza</dt>
          <dd className="mt-1 text-slate-600">{draft.report.quality.confidence}% · {draft.report.quality.status}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Generado</dt>
          <dd className="mt-1 text-slate-600">{printDate(draft.report.generatedAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Guardado</dt>
          <dd className="mt-1 text-slate-600">{printDate(draft.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Publicado</dt>
          <dd className="mt-1 text-slate-600">{printDate(draft.publishedAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-950">Exportado</dt>
          <dd className="mt-1 text-slate-600">{printDate(draft.exportedAt)}</dd>
        </div>
      </dl>

      {branding?.consultantEmail && (
        <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
          Contacto de revisión: <span className="font-semibold text-slate-950">{branding.consultantName}</span> · {branding.consultantEmail}
        </p>
      )}
    </section>
  )
}

export function PrintGlobalQualityIssues({
  issues,
}: {
  issues: DataQualityIssue[]
}) {
  if (issues.length === 0) {
    return (
      <div className="mt-6 border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-950">Sin incidencias globales críticas en el snapshot guardado.</p>
      </div>
    )
  }

  return (
    <div className="mt-6 border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-950">Incidencias globales del snapshot</p>
      <ul className="mt-3 space-y-3 text-sm text-amber-950">
        {issues.map(issue => (
          <li key={issue.id}>
            <span className="font-semibold">{issueSeverityLabel(issue.severity)}:</span> {issue.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
