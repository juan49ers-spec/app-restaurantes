'use client'

import { useState, useEffect } from "react"
import { MasterIngredient } from "@/types/schema"
import { IngredientsTable } from "./IngredientsTable"
import { IngredientSummaryCards } from "./IngredientSummaryCards"
import { IngredientDialog } from "./IngredientDialog"
import { BulkImportDialog } from "./BulkImportDialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

import { useRouter } from "next/navigation"

interface Props {
    initialIngredients: MasterIngredient[]
}

export function IngredientsClientPage({ initialIngredients }: Props) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [mounted, setMounted] = useState(false)
    const [ingredients, setIngredients] = useState<MasterIngredient[]>(initialIngredients)

    useEffect(() => {

        setMounted(true)
    }, [])

    // Update local state when initialIngredients change (e.g., after router.refresh())
    useEffect(() => {
        setIngredients(initialIngredients)
    }, [initialIngredients])

    const filteredIngredients = ingredients.filter(ing =>
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ing.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleImportSuccess = () => {
        router.refresh()
    }

    const handleDeleteIngredient = (id: string) => {
        setIngredients(prev => prev.filter(ing => ing.id !== id))
    }

    if (!mounted) {
        return (
            <div className="space-y-6 opacity-0">
                <IngredientSummaryCards ingredients={ingredients} />
                <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-64 w-full bg-muted animate-pulse rounded-md" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <IngredientSummaryCards ingredients={ingredients} />

            {/* Search and Filter Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar ingredientes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex gap-2">
                    <BulkImportDialog onSuccess={handleImportSuccess} />
                    <IngredientDialog />
                </div>
            </div>

            {/* Main Table */}
            <div className="rounded-md border shadow-sm bg-white overflow-hidden">
                <IngredientsTable ingredients={filteredIngredients} onDelete={handleDeleteIngredient} />
            </div>
        </div>
    )
}
