"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ResultadosSkeleton() {
    return (
        <div className="space-y-4 pb-12 max-w-5xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-28" />
            </div>

            {/* Hero Skeleton */}
            <div className="rounded-xl p-4 bg-slate-100 border border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-9 w-40" />
                        </div>
                    </div>
                    <div className="space-y-2 text-right">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-7 w-24" />
                    </div>
                </div>
            </div>

            {/* KPIs Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-slate-200">
                        <CardContent className="p-4">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-6 w-28 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Section Skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Footer Skeleton */}
            <div className="flex justify-center pt-4">
                <Skeleton className="h-4 w-64" />
            </div>
        </div>
    )
}
