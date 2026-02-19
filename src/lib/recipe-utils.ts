/**
 * Utilidades para formatear ingredientes de recetas
 * 
 * Este archivo NO es un server action, por lo que puede exportar funciones síncronas
 */

export interface RecipeIngredientItem {
  id: string
  quantity_gross: number
  quantity_net: number
  yield_factor: number | null | undefined
  master_ingredient: {
    id: string
    name: string
    base_unit: string
    current_avg_price: number | null
    standard_waste_pct: number | null
    allergens?: string[]
  } | null
  sub_recipe: {
    id: string
    name: string
    current_cost: number
    allergens?: string[]
  } | null
}

export interface FormattedRecipeIngredient {
  id: string
  master_ingredient_id?: string
  sub_recipe_id?: string
  type: 'INGREDIENT' | 'RECIPE'
  name: string
  base_unit: string
  price_per_unit: number
  quantity_gross: number
  quantity_net: number
  yield_pct: number
  is_yield_custom: boolean
  allergens: string[]
}

/**
 * Formatea un ingrediente de receta para la UI
 */
export function formatRecipeIngredient(item: RecipeIngredientItem): FormattedRecipeIngredient {
  const isRecipe = !!item.sub_recipe
  const master = item.master_ingredient
  const sub = item.sub_recipe

  // Handle missing data gracefully
  if (!isRecipe && !master) {
    throw new Error('Invalid ingredient data: missing master_ingredient')
  }
  if (isRecipe && !sub) {
    throw new Error('Invalid ingredient data: missing sub_recipe')
  }

  const name = isRecipe ? sub!.name : master!.name
  const id = isRecipe ? sub!.id : master!.id
  const unit = isRecipe ? 'u' : master!.base_unit
  const price = isRecipe ? sub!.current_cost : (master!.current_avg_price || 0)
  const waste = isRecipe ? 0 : (master!.standard_waste_pct || 0)

  // Calculate Yield % from yield_factor
  const dbYield = item.yield_factor ?? undefined
  const masterYield = (100 - (waste * 100)) / 100
  const finalYield = dbYield !== undefined && dbYield !== null ? dbYield : masterYield

  return {
    id: item.id,
    master_ingredient_id: isRecipe ? undefined : id,
    sub_recipe_id: isRecipe ? id : undefined,
    type: isRecipe ? 'RECIPE' : 'INGREDIENT',
    name,
    base_unit: unit,
    price_per_unit: price,
    quantity_gross: item.quantity_gross,
    quantity_net: item.quantity_net,
    yield_pct: finalYield,
    is_yield_custom: Math.abs(finalYield - masterYield) > 0.001,
    allergens: isRecipe ? (sub?.allergens || []) : (master?.allergens || [])
  }
}
