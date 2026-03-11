import { Skeleton } from "@/components/ui/skeleton"

export default function SuppliersLoading() {
    return (
        <div className="container mx-auto py-10 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
            <div className="bg-white rounded-xl border overflow-hidden mt-8">
                <div className="p-4 border-b flex justify-between">
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-9 w-36 rounded-lg" />
                </div>
                <div className="space-y-0">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
