import { ArrowDownRight, ArrowRight, ArrowUpRight, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatPortalDate } from '@/components/portal/format'
import type { PortalPeriodComparison } from '@/lib/portal-insights'
import { cn, formatCurrency, formatPct } from '@/lib/utils'

interface PortalPeriodComparisonPanelProps {
  comparison: PortalPeriodComparison
}

function formatDelta(delta: number, unit: 'eur' | 'pct-points') {
  const prefix = delta > 0 ? '+' : ''
  if (unit === 'eur') return `${prefix}${formatCurrency(delta)}`
  return `${prefix}${delta.toFixed(2).replace('.', ',')} pp`
}

function DeltaIcon({ value, lowerIsBetter = false }: { value: number; lowerIsBetter?: boolean }) {
  const isPositive = lowerIsBetter ? value <= 0 : value >= 0
  if (value === 0) return <ArrowRight className="h-4 w-4" />
  return isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />
}

function deltaClass(value: number, lowerIsBetter = false) {
  const isPositive = lowerIsBetter ? value <= 0 : value >= 0
  if (value === 0) return 'text-slate-600'
  return isPositive ? 'text-emerald-700' : 'text-rose-700'
}

export function PortalPeriodComparisonPanel({ comparison }: PortalPeriodComparisonPanelProps) {
  const expenseRatioDelta = comparison.deltas.expenseRatioPct

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Comparativa mensual</p>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Evolución frente al mes anterior</h2>
          <p className="mt-1 text-sm text-slate-600">
            {formatPortalDate(comparison.period.currentFrom)} a {formatPortalDate(comparison.period.currentTo)} frente a {formatPortalDate(comparison.period.previousFrom)} a {formatPortalDate(comparison.period.previousTo)}.
          </p>
        </div>
        <Badge variant="outline" className="rounded-md">
          {comparison.hasPreviousData ? 'Con histórico' : 'Sin histórico previo'}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Ventas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(comparison.current.revenue)}</p>
          <p className={cn('mt-2 flex items-center gap-1 text-sm font-medium', deltaClass(comparison.deltas.revenue.value))}>
            <DeltaIcon value={comparison.deltas.revenue.value} />
            {formatDelta(comparison.deltas.revenue.value, 'eur')}
            {comparison.deltas.revenue.pct !== null && <span>({formatPct(comparison.deltas.revenue.pct)})</span>}
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Gastos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(comparison.current.expenses)}</p>
          <p className={cn('mt-2 flex items-center gap-1 text-sm font-medium', deltaClass(comparison.deltas.expenses.value, true))}>
            <DeltaIcon value={comparison.deltas.expenses.value} lowerIsBetter />
            {formatDelta(comparison.deltas.expenses.value, 'eur')}
            {comparison.deltas.expenses.pct !== null && <span>({formatPct(comparison.deltas.expenses.pct)})</span>}
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Resultado operativo</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(comparison.current.netResult)}</p>
          <p className={cn('mt-2 flex items-center gap-1 text-sm font-medium', deltaClass(comparison.deltas.netResult.value))}>
            <DeltaIcon value={comparison.deltas.netResult.value} />
            {formatDelta(comparison.deltas.netResult.value, 'eur')}
            {comparison.deltas.netResult.pct !== null && <span>({formatPct(comparison.deltas.netResult.pct)})</span>}
          </p>
        </div>
      </div>

      {expenseRatioDelta !== null && (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          La presión de gasto sobre ventas cambia {formatDelta(expenseRatioDelta, 'pct-points')} frente al mes anterior.
        </p>
      )}
    </section>
  )
}
