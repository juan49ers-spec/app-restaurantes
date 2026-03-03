import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  className?: string
  indicatorClassName?: string
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div className={cn("w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden", className)}>
      <div
        className={cn("bg-primary h-full rounded-full transition-all duration-300 ease-out dyn-bar", indicatorClassName)}
        data-width={`${clampedValue}%`}
        ref={(el) => { if (el) el.style.setProperty('--dyn-w', `${clampedValue}%`) }}
      />
    </div>
  )
}
