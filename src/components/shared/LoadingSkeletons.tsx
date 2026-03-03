'use client'

import { memo } from 'react'
import { m } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonCardProps {
  className?: string
}

export const SkeletonCard = memo(function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/10 rounded-[2rem] p-6 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
})

export const SkeletonMetric = memo(function SkeletonMetric() {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/10 rounded-[1.5rem] p-5"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    </m.div>
  )
})

export const SkeletonTable = memo(function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-border/10 rounded-xl">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
})

export const SkeletonChart = memo(function SkeletonChart() {
  return (
    <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/10 rounded-[2rem] p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="h-64 flex items-end justify-between gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-full rounded-t-lg" />
          ))}
        </div>
      </div>
    </div>
  )
})