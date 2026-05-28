import { ArrowDownRight, ArrowRight, ArrowUpRight, WalletCards } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PortalExpenseCategoryBreakdown } from '@/lib/portal-insights'
import { cn, formatCurrency, formatPct } from '@/lib/utils'

interface PortalExpenseBreakdownProps {
  breakdown: PortalExpenseCategoryBreakdown
}

function deltaClass(value: number) {
  if (value === 0) return 'text-slate-600'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function DeltaIcon({ value }: { value: number }) {
  if (value === 0) return <ArrowRight className="h-4 w-4" />
  return value > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />
}

function formatDelta(value: number) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatCurrency(value)}`
}

export function PortalExpenseBreakdown({ breakdown }: PortalExpenseBreakdownProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-500">
            <WalletCards className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Desglose de gastos</p>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Categorías que más cambian</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Ordenado por variación absoluta para detectar rápidamente dónde se mueve el coste.
          </p>
        </div>
        <Badge variant="outline" className="rounded-md border-slate-300 bg-slate-50">
          {breakdown.hasPreviousData ? 'Con histórico' : 'Sin histórico previo'}
        </Badge>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
          <span>Categoría</span>
          <span className="text-right">Actual</span>
          <span className="text-right">Anterior</span>
          <span className="text-right">Cambio</span>
        </div>
        {breakdown.categories.map(category => (
          <div key={category.category} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center border-t border-slate-200 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-950">{category.label}</span>
            <span className="text-right font-semibold tabular-nums text-slate-950">{formatCurrency(category.currentAmount)}</span>
            <span className="text-right tabular-nums text-slate-600">
              {breakdown.hasPreviousData ? formatCurrency(category.previousAmount) : 'Sin comparativa'}
            </span>
            <span className={cn('flex items-center justify-end gap-1 font-semibold tabular-nums', deltaClass(category.delta.value))}>
              {breakdown.hasPreviousData ? (
                <>
                  <DeltaIcon value={category.delta.value} />
                  {formatDelta(category.delta.value)}
                  {category.delta.pct !== null && <span className="text-xs">({formatPct(category.delta.pct)})</span>}
                </>
              ) : (
                'Sin comparativa'
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
