import { memo } from 'react'

interface MemoizedMetricProps {
  label: string
  value: string | number
  trend?: number
  color?: string
}

export const MetricCard = memo(function MetricCard({ 
  label, 
  value, 
  trend, 
  color = 'text-foreground' 
}: MemoizedMetricProps) {
  return (
    <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/10 rounded-[1.5rem] p-5">
      <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-black tabular-nums ${color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && (
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
})