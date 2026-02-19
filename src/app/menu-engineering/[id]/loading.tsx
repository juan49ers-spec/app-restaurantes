import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="space-y-6 relative animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="w-full">
                <div className="grid w-full grid-cols-2 lg:w-[400px] mb-6 gap-1">
                    <Skeleton className="h-10 rounded-md" />
                    <Skeleton className="h-10 rounded-md" />
                </div>

                <div className="space-y-8">
                    {/* Insight Strip Skeleton */}
                    <Skeleton className="h-12 w-full rounded-lg" />

                    {/* KPI Cards Skeleton */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2].map((i) => (
                            <Card key={i}>
                                <CardHeader className="pb-2">
                                    <Skeleton className="h-4 w-24 mb-1" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-20 mb-1" />
                                    <Skeleton className="h-3 w-32" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Matrix Skeleton */}
                    <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
                        <div className="lg:col-span-2 relative border rounded-xl bg-slate-50/50 p-4">
                            <Skeleton className="h-full w-full rounded-lg" />
                        </div>
                        <div className="space-y-4">
                            <Card className="h-full">
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1 flex-1">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-3 w-2/3" />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Strategy Cards Skeleton */}
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-[300px] rounded-xl border border-slate-200 p-6 space-y-4 bg-white">
                                <div className="flex justify-between items-start">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                                <div className="pt-4 space-y-3">
                                    <Skeleton className="h-3 w-24" />
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="flex justify-between items-center">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
