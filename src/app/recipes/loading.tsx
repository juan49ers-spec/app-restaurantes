import { Skeleton } from "@/components/ui/skeleton"

export default function RecipesLoading() {
    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
            </div>
        </div>
    )
}
