import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  className?: string
  indicatorClassName?: string
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const indicatorStyle = { width: `${Math.min(Math.max(value, 0), 100)}%` };
  return (
    <div className={cn("w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden", className)}>
      <div
        className={cn("bg-primary h-full rounded-full transition-all duration-300 ease-out", indicatorClassName)}
        style={indicatorStyle}
      />
    </div>
  )
}
