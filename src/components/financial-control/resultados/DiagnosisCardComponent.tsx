"use client"

import { memo } from "react"
import { m } from "framer-motion"
import { cn } from "@/lib/utils"
import type { DiagnosisCard } from "./types"

const styles = {
  alert: {
    container: "bg-amber-50 border-amber-200",
    icon: "text-amber-600 bg-amber-100",
    title: "text-amber-900",
    desc: "text-amber-800"
  },
  info: {
    container: "bg-blue-50 border-blue-200",
    icon: "text-blue-600 bg-blue-100",
    title: "text-blue-900",
    desc: "text-blue-800"
  },
  success: {
    container: "bg-emerald-50 border-emerald-200",
    icon: "text-emerald-600 bg-emerald-100",
    title: "text-emerald-900",
    desc: "text-emerald-800"
  }
}

export const DiagnosisCardComponent = memo(function DiagnosisCardComponent({ card }: { card: DiagnosisCard }) {
  const style = styles[card.type]
  const Icon = card.icon

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("p-4 rounded-xl border", style.container)}
      role="article"
      aria-label={`Diagnóstico: ${card.title}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg flex-shrink-0", style.icon)}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-bold text-sm mb-1", style.title)}>
            {card.title}
          </h4>
          <p className={cn("text-xs leading-relaxed", style.desc)}>
            {card.description}
          </p>
          {card.metric && (
            <p className="text-xs font-bold mt-2 opacity-75">
              {card.metric}
            </p>
          )}
        </div>
      </div>
    </m.div>
  )
})
