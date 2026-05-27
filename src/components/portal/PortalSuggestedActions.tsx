import { AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PortalSuggestedAction } from '@/lib/portal-insights'
import { cn } from '@/lib/utils'

interface PortalSuggestedActionsProps {
  actions: PortalSuggestedAction[]
}

const TONE_COPY: Record<PortalSuggestedAction['tone'], string> = {
  positive: 'Mantener',
  neutral: 'Revisar',
  warning: 'Prioridad',
  critical: 'Urgente',
}

const TONE_CLASS: Record<PortalSuggestedAction['tone'], string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-rose-200 bg-rose-50 text-rose-800',
}

function ToneIcon({ tone }: { tone: PortalSuggestedAction['tone'] }) {
  if (tone === 'critical' || tone === 'warning') return <AlertTriangle className="h-4 w-4" />
  if (tone === 'positive') return <CheckCircle2 className="h-4 w-4" />
  return <CircleDot className="h-4 w-4" />
}

export function PortalSuggestedActions({ actions }: PortalSuggestedActionsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próximas decisiones</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">Acciones sugeridas para revisar</h2>
      <div className="mt-4 grid gap-3">
        {actions.map(action => (
          <article key={action.id} className={cn('rounded-md border p-4', TONE_CLASS[action.tone])}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ToneIcon tone={action.tone} />
                <h3 className="text-sm font-semibold">{action.title}</h3>
              </div>
              <Badge variant="outline" className="rounded-md bg-white/70">
                {TONE_COPY[action.tone]}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6">{action.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
