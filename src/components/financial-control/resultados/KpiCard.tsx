"use client"

import { memo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { formatPercent } from "./formatters"

interface KpiCardProps {
  title: string
  value: string
  subtitle: string
  trend?: number
  icon: React.ElementType
}

export const KpiCard = memo(function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon
}: KpiCardProps) {
  const trendPositive = trend && trend >= 0

  return (
    <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 mb-1 truncate">{title}</p>
            <p className="text-lg font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-400">{subtitle}</p>
          </div>
          <div className="ml-3">
            <Icon className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={cn(
            "mt-2 text-xs font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
            trendPositive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          )}>
            {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPercent(trend)}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
