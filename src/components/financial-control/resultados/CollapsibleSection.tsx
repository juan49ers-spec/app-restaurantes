"use client"

import { useState, useCallback, memo } from "react"
import { m, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}

export const CollapsibleSection = memo(({
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const sectionId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        aria-expanded={isOpen ? "true" : "false"}
        aria-controls={sectionId}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neutral-500" aria-hidden="true" />
          <div className="text-left">
            <h3 className="font-bold text-sm text-neutral-900">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        )}
      </button>
      <div id={sectionId}>
        <AnimatePresence initial={false}>
          {isOpen && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="border-t border-neutral-100">
                {children}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
CollapsibleSection.displayName = "CollapsibleSection"
