import { useState, useMemo, useCallback } from 'react'
import { MasterIngredient, Recipe } from '@/types/schema'

export type RecipeIngredientInput = {
    id: string
    master_ingredient_id?: string
    sub_recipe_id?: string
    type: 'INGREDIENT' | 'RECIPE'
    name: string
    category?: string
    base_unit: string
    price_per_unit: number
    cost_per_unit?: number

    quantity_gross: number
    quantity_net: number
    yield_pct: number

    manual_cost?: number
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

    const addIngredient = useCallback((item: MasterIngredient | Recipe, type: 'INGREDIENT' | 'RECIPE' = 'INGREDIENT') => {
        const isRecipe = type === 'RECIPE'
        const name = item.name
        const id = item.id!

        let unit = 'u';
        let price = 0;
        let waste = 0;
        let category = 'Otros';

        if (isRecipe) {
            const r = item as Recipe
            unit = 'u'
            price = r.current_cost || 0
            waste = 0
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
        setIngredients(prev => [...prev, newItem])
    }, [])

    const removeIngredient = useCallback((id: string) => {
        setIngredients(prev => prev.filter(i => i.id !== id))
    }, [])

    const updateIngredient = useCallback((id: string, updates: Partial<RecipeIngredientInput>) => {
        setIngredients(prev => prev.map(item => {
            if (item.id !== id) return item

            const newItem = { ...item, ...updates }

            if ('quantity_net' in updates) {
                newItem.quantity_gross = newItem.quantity_net / newItem.yield_pct
            } else if ('quantity_gross' in updates) {
                newItem.quantity_net = newItem.quantity_gross * newItem.yield_pct
            } else if ('yield_pct' in updates) {
                newItem.quantity_gross = newItem.quantity_net / newItem.yield_pct
                newItem.is_yield_custom = true
            }

            return newItem
        }))
    }, [])

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
        return ((sellingPrice - totalCost) / sellingPrice) * 100
    }, [totalCost, sellingPrice])

    const suggestedPrice = useMemo(() => {
        const marginDecimal = targetMargin / 100
        if (marginDecimal >= 1) return 0
        return totalCost / (1 - marginDecimal)
    }, [totalCost, targetMargin])

    const scaledIngredients = useMemo(() => {
        const factor = productionTarget / yields
        if (factor === 1) return ingredients

        return ingredients.map(i => ({
            ...i,
            quantity_gross: i.quantity_gross * factor,
            quantity_net: i.quantity_net * factor,
        }))
    }, [ingredients, productionTarget, yields])

    const metrics = useMemo(() => ({
        totalCost,
        laborCost,
        primeCost,
        calculatedMargin,
        suggestedPrice,
        allergens: []
    }), [totalCost, laborCost, primeCost, calculatedMargin, suggestedPrice])

    return {
        ingredients,
        scaledIngredients,
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
        metrics
    }
}
