import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PortalMultiPeriodTrend as PortalMultiPeriodTrendData } from '@/lib/portal-insights'
import { cn, formatCurrency } from '@/lib/utils'

interface PortalMultiPeriodTrendProps {
  trend: PortalMultiPeriodTrendData
}

function directionClass(value: number) {
  if (value === 0) return 'text-slate-500'
  return value > 0 ? 'text-emerald-700' : 'text-rose-700'
}

function DirectionIcon({ value }: { value: number }) {
  if (value === 0) return <ArrowRight className="h-4 w-4" />
  return value > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />
}

export function PortalMultiPeriodTrend({ trend }: PortalMultiPeriodTrendProps) {
  const previousRevenue = trend.periods.at(-2)?.revenue ?? trend.periods.at(-1)?.revenue ?? 0
  const latestRevenue = trend.periods.at(-1)?.revenue ?? 0
  const revenueTrend = latestRevenue - previousRevenue

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Tendencia de 3 meses</p>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Evolución reciente</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Lectura acumulada de ventas, gastos y resultado para entender si el periodo mejora o se deteriora.
          </p>
        </div>
        <Badge variant="outline" className="rounded-md border-slate-300 bg-slate-50">
          {trend.hasTrend ? 'Con tendencia' : 'Sin tendencia histórica'}
        </Badge>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
          <span>Periodo</span>
          <span className="text-right">Ventas</span>
          <span className="text-right">Gastos</span>
          <span className="text-right">Resultado</span>
        </div>
        {trend.periods.map(period => (
          <div key={period.from} className="grid grid-cols-[1.1fr_1fr_1fr_1fr] items-center border-t border-slate-200 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-950">{period.label}</span>
            <span className="text-right font-semibold tabular-nums text-slate-950">{formatCurrency(period.revenue)}</span>
            <span className="text-right tabular-nums text-slate-600">{formatCurrency(period.expenses)}</span>
            <span className={cn('text-right font-semibold tabular-nums', directionClass(period.netResult))}>
              {formatCurrency(period.netResult)}
            </span>
          </div>
        ))}
      </div>

      {trend.hasTrend && (
        <p className={cn('mt-4 flex items-center gap-2 text-sm font-semibold', directionClass(revenueTrend))}>
          <DirectionIcon value={revenueTrend} />
          Ventas del último periodo frente al anterior: {formatCurrency(revenueTrend)}
        </p>
      )}
    </section>
  )
}
