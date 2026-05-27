'use client'

import { useState } from "react"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { RecipeWithCost } from "@/app/actions/recipes"
import { RecipesTable } from "./RecipesTable"
import { RecipeSummaryCards } from "./RecipeSummaryCards"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { RecipesCsvImportPanel } from "./RecipesCsvImportPanel"

interface Props {
    initialRecipes: RecipeWithCost[]
}

export function RecipesClientPage({ initialRecipes }: Props) {
    const [searchTerm, setSearchTerm] = useState("")

    const debouncedSearch = useDebouncedValue(searchTerm, 300)
    const filteredRecipes = initialRecipes.filter(recipe =>
        recipe.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Link href="/recipes/new/edit">
                    <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                        <Plus className="h-4 w-4" />
                        Nueva Receta
                    </Button>
                </Link>
            </div>

            {/* KPI Cards */}
            <RecipeSummaryCards recipes={initialRecipes} />

            <RecipesCsvImportPanel />

            {/* Search and Filter Bar */}
            <div className="flex items-center space-x-2 bg-white/50 p-1 rounded-lg">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar receta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 bg-white"
                    />
                </div>
            </div>

            {/* Main Table */}
            <RecipesTable recipes={filteredRecipes} />
        </div>
    )
}
