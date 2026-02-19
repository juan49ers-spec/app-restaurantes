'use client'

import { useState } from "react"
import { MasterIngredient } from "@/types/schema"
import { RecipeWithCost } from "@/app/actions/recipes"
import { IngredientsClientPage } from "@/components/ingredients/IngredientsClientPage"
import { RecipesClientPage } from "@/components/recipes/RecipesClientPage"
import { ChefHat, UtensilsCrossed, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
    initialIngredients: MasterIngredient[]
    initialRecipes: RecipeWithCost[]
}

const tabs = [
    { id: 'recipes' as const, label: 'Recetas', icon: UtensilsCrossed },
    { id: 'ingredients' as const, label: 'Ingredientes', icon: ChefHat },
]

export function EscandallosClient({ initialIngredients, initialRecipes }: Props) {
    const [activeTab, setActiveTab] = useState<'recipes' | 'ingredients'>('recipes')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <BookOpen className="h-7 w-7 text-primary" />
                        <h1 className="text-3xl font-black italic tracking-tighter text-foreground">
                            Escandallos
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 ml-[38px]">
                        Fichas técnicas, ingredientes maestros y control de costes.
                    </p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/50 w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                                isActive
                                    ? "bg-card text-foreground shadow-sm border border-border/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            <div className="animate-in fade-in duration-300" key={activeTab}>
                {activeTab === 'recipes' ? (
                    <RecipesClientPage initialRecipes={initialRecipes} />
                ) : (
                    <IngredientsClientPage initialIngredients={initialIngredients} />
                )}
            </div>
        </div>
    )
}
