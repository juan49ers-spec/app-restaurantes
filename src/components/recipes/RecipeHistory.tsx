"use client"

import { useEffect, useState } from "react"
import { getRecipePriceHistory } from "@/app/actions/recipes"
import { CostEvolutionChart } from "@/components/shared/CostEvolutionChart"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
    recipeId: string
    currentCost: number
}

interface PriceHistoryPoint {
    price: number
    created_at: string
    change_pct?: number
}

export function RecipeHistory({ recipeId, currentCost }: Props) {
    const [history, setHistory] = useState<PriceHistoryPoint[]>([])
    const [loading, setLoading] = useState(() => !!recipeId && recipeId !== 'new')

    useEffect(() => {
        if (!recipeId || recipeId === 'new') return

        let isMounted = true
        // setLoading(true) removed - initialized via key in parent or initial state

        getRecipePriceHistory(recipeId)
            .then(data => {
                if (isMounted) setHistory(data || [])
            })
            .catch(err => console.error(err))
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => { isMounted = false }
    }, [recipeId])

    if (loading) return <Skeleton className="h-[300px] w-full" />

    if (history.length === 0) return null // Don't show if no history

    return (
        <div className="mt-8">
            <CostEvolutionChart
                data={history}
                currentCost={currentCost}
            />
        </div>
    )
}
