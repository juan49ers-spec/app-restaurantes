import { Badge } from "@/components/ui/badge"
import { ALLERGENS } from "@/lib/constants"
import { cn } from "@/lib/utils"

type Props = {
    allergens: string[]
    className?: string
    showLabel?: boolean
}

export function AllergenBadges({ allergens, className, showLabel = true }: Props) {
    if (!allergens || allergens.length === 0) return null

    return (
        <div className={cn("flex flex-wrap gap-1", className)}>
            {allergens.map(id => {
                const allergen = ALLERGENS.find(a => a.id === id)
                if (!allergen) return null
                return (
                    <Badge key={id} variant="outline" className="border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 items-center gap-1">
                        <span>{allergen.icon}</span>
                        {showLabel && <span>{allergen.label}</span>}
                    </Badge>
                )
            })}
        </div>
    )
}
