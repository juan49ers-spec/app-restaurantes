import { useState, useMemo } from 'react'
import { MasterIngredient, Recipe } from '@/types/schema'

export type RecipeIngredientInput = {
    id: string // local generic ID (for UI key)
    master_ingredient_id?: string
    sub_recipe_id?: string
    type: 'INGREDIENT' | 'RECIPE'
    name: string
    category?: string // Added for grouping
    base_unit: string
    price_per_unit: number // from master
    cost_per_unit?: number // internal use

    // The core trio
    quantity_gross: number
    quantity_net: number
    yield_pct: number // 0.9 = 90% yield (10% waste). Stored as yield_factor in DB.

    // UI State
    manual_cost?: number // customization
    is_yield_custom: boolean
}

export type RecipeEditData = {
    name?: string
    selling_price?: number
    target_margin_pct?: number
    prep_time_minutes?: number
    hourly_rate?: number
    yields?: number
    ingredients?: RecipeIngredientInput[]
}

export function useRecipeCalculator(initialData?: RecipeEditData) {
    const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>(initialData?.ingredients || [])
    const [sellingPrice, setSellingPrice] = useState<number>(initialData?.selling_price || 0)
    const [targetMargin, setTargetMargin] = useState<number>(initialData?.target_margin_pct || 70)
    const [prepTime, setPrepTime] = useState<number>(initialData?.prep_time_minutes || 0)
    const [hourlyRate, setHourlyRate] = useState<number>(initialData?.hourly_rate || 0)
    const [yields, setYields] = useState<number>(initialData?.yields || 1)
    const [productionTarget, setProductionTarget] = useState<number>(initialData?.yields || 1)

    // ACTIONS
    const addIngredient = (item: MasterIngredient | Recipe, type: 'INGREDIENT' | 'RECIPE' = 'INGREDIENT') => {
        const isRecipe = type === 'RECIPE'

        // HACK: To keep it simple, we treat inputs as "ItemWithCost"
        // We cast because we know the shapes match our logic needs
        const name = item.name
        const id = item.id!

        let unit = 'u';
        let price = 0;
        let waste = 0;
        let category = 'Otros'; // Added default

        if (isRecipe) {
            const r = item as Recipe
            unit = 'u' // Recipes are always units
            price = r.current_cost || 0
            waste = 0 // Recipes don't have waste themselves usually, they are "finished"
            category = 'Sub-Recetas'
        } else {
            const i = item as MasterIngredient
            unit = i.base_unit
            price = i.current_avg_price || 0
            waste = i.standard_waste_pct || 0
            category = i.category || 'Sin Categoría'
        }

        const newItem: RecipeIngredientInput = {
            id: crypto.randomUUID(),
            master_ingredient_id: isRecipe ? undefined : id,
            sub_recipe_id: isRecipe ? id : undefined,
            type,
            name,
            category,
            base_unit: unit,
            price_per_unit: price,

            quantity_gross: 0,
            quantity_net: 0,
            yield_pct: (100 - (waste * 100)) / 100,
            is_yield_custom: false
        }
        setIngredients([...ingredients, newItem])
    }

    const removeIngredient = (id: string) => {
        setIngredients(ingredients.filter(i => i.id !== id))
    }

    const updateIngredient = (id: string, updates: Partial<RecipeIngredientInput>) => {
        setIngredients(prev => prev.map(item => {
            if (item.id !== id) return item

            const newItem = { ...item, ...updates }

            // MATH ENGINE: Recalculate based on what changed

            // Case A: Changed Net Quantity -> Update Gross
            if ('quantity_net' in updates) {
                // Gross = Net / Yield
                newItem.quantity_gross = newItem.quantity_net / newItem.yield_pct
            }

            // Case B: Changed Gross Quantity -> Update Net
            else if ('quantity_gross' in updates) {
                // Net = Gross * Yield
                newItem.quantity_net = newItem.quantity_gross * newItem.yield_pct
            }

            // Case C: Changed Yield -> Update Gross (keep Net constant usually, as Net is what ends on plate)
            else if ('yield_pct' in updates) {
                // If I change yield, I need more/less raw product to get same net amount
                newItem.quantity_gross = newItem.quantity_net / newItem.yield_pct
                newItem.is_yield_custom = true
            }

            return newItem
        }))
    }

    // AGGREGATES
    const totalCost = useMemo(() => {
        return ingredients.reduce((sum, item) => {
            return sum + (item.quantity_gross * item.price_per_unit)
        }, 0)
    }, [ingredients])

    const laborCost = useMemo(() => {
        return (prepTime / 60) * hourlyRate
    }, [prepTime, hourlyRate])

    const primeCost = useMemo(() => {
        return totalCost + laborCost
    }, [totalCost, laborCost])

    const calculatedMargin = useMemo(() => {
        if (!sellingPrice) return 0
        // Margin usually based on Prime Cost or Food Cost?
        // Standard is: (Price - Prime Cost) / Price if we want "Net Margin" before Fixed Costs.
        // But often in kitchens "Margin" refers to Gross Margin (Price - Food Cost) / Price.
        // Let's stick to Gross Margin for consistency with "Food Cost %" usually.
        // BUT, if we add Labor, maybe we want Contribution Margin.
        // Let's keep calculatedMargin as GROSS (Food only) for now to not confuse existing logic,
        // and add a "netMargin" or "primeMargin".
        return ((sellingPrice - totalCost) / sellingPrice) * 100
    }, [totalCost, sellingPrice])

    const suggestedPrice = useMemo(() => {
        // Price = Cost / (1 - Margin%)
        // Margin 70% -> Cost / 0.3
        const marginDecimal = targetMargin / 100
        if (marginDecimal >= 1) return 0 // avoid Infinity
        return totalCost / (1 - marginDecimal)
    }, [totalCost, targetMargin])

    // TODO: Add allergens support - requires DB migration
    // const aggregatedAllergens = useMemo(() => {
    //     const all = new Set<string>()
    //     ingredients.forEach(i => {
    //         if (i.allergens) {
    //             i.allergens.forEach(a => all.add(a))
    //         }
    //     })
    //     return Array.from(all)
    //     }, [ingredients])

    const scaledIngredients = useMemo(() => {
        const factor = productionTarget / yields
        if (factor === 1) return ingredients

        return ingredients.map(i => ({
            ...i,
            quantity_gross: i.quantity_gross * factor,
            quantity_net: i.quantity_net * factor,
            // Prices/Costs refer to unit costs, so they don't change per unit, 
            // but the *total* cost of the ingredient line will increase because qty increased.
        }))
    }, [ingredients, productionTarget, yields])

    return {
        ingredients,
        scaledIngredients, // <--- New export
        addIngredient,
        removeIngredient,
        updateIngredient,
        setSellingPrice,
        sellingPrice,
        setTargetMargin,
        targetMargin,
        setPrepTime,
        prepTime,
        setHourlyRate,
        hourlyRate,
        setYields,
        yields,
        setProductionTarget,
        productionTarget,
        scalingFactor: productionTarget / yields,
        metrics: {
            totalCost, // Food Cost (Base)
            laborCost,
            primeCost,
            calculatedMargin, // Gross Margin
            suggestedPrice,
            // TODO: Add allergens support - requires DB migration
            allergens: []
        }
    }
}
