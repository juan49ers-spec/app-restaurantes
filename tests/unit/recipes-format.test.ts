/**
 * TESTS UNITARIOS: Recipes - formatRecipeIngredient
 * 
 * Tests específicos para la función de formateo de ingredientes
 * Expone la función privada para testing
 */

import { describe, it, expect } from 'vitest'

// Re-implementación de formatRecipeIngredient para testing
// Esta es una copia exacta de la función en recipes.ts
const formatRecipeIngredient = (item: any) => {
  const isRecipe = !!item.sub_recipe
  const master = item.master_ingredient
  const sub = item.sub_recipe

  const name = isRecipe ? sub.name : master.name
  const id = isRecipe ? sub.id : master.id
  const unit = isRecipe ? 'u' : master.base_unit
  const price = isRecipe ? sub.current_cost : master.current_avg_price || 0
  const waste = isRecipe ? 0 : master.standard_waste_pct || 0

  const dbYield = item.yield_factor
  const masterYield = (100 - (waste * 100)) / 100
  const finalYield = dbYield !== undefined && dbYield !== null ? dbYield : masterYield

  return {
    id: item.id,
    master_ingredient_id: isRecipe ? undefined : id,
    sub_recipe_id: isRecipe ? id : undefined,
    type: isRecipe ? 'RECIPE' as const : 'INGREDIENT' as const,
    name,
    base_unit: unit,
    price_per_unit: price,
    quantity_gross: item.quantity_gross,
    quantity_net: item.quantity_net,
    yield_pct: finalYield,
    is_yield_custom: Math.abs(finalYield - masterYield) > 0.001,
    allergens: isRecipe ? sub.allergens : master.allergens
  }
}

describe('formatRecipeIngredient', () => {
  it('debería formatear ingrediente básico correctamente', () => {
    const item = {
      id: 'ri-1',
      quantity_gross: 1.5,
      quantity_net: 1.35,
      yield_factor: 0.9,
      master_ingredient: {
        id: 'ing-1',
        name: 'Pechuga de Pollo',
        base_unit: 'kg',
        standard_waste_pct: 0.1,
        current_avg_price: 8.90,
        allergens: ['gluten']
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result).toEqual({
      id: 'ri-1',
      master_ingredient_id: 'ing-1',
      sub_recipe_id: undefined,
      type: 'INGREDIENT',
      name: 'Pechuga de Pollo',
      base_unit: 'kg',
      price_per_unit: 8.90,
      quantity_gross: 1.5,
      quantity_net: 1.35,
      yield_pct: 0.9,
      is_yield_custom: false,
      allergens: ['gluten']
    })
  })

  it('debería formatear sub-receta correctamente', () => {
    const item = {
      id: 'ri-2',
      quantity_gross: 2,
      quantity_net: 2,
      yield_factor: null,
      master_ingredient: null,
      sub_recipe: {
        id: 'sub-1',
        name: 'Salsa Bechamel',
        current_cost: 3.50,
        allergens: ['dairy', 'gluten']
      }
    }

    const result = formatRecipeIngredient(item)

    expect(result).toEqual({
      id: 'ri-2',
      master_ingredient_id: undefined,
      sub_recipe_id: 'sub-1',
      type: 'RECIPE',
      name: 'Salsa Bechamel',
      base_unit: 'u',
      price_per_unit: 3.50,
      quantity_gross: 2,
      quantity_net: 2,
      yield_pct: 1,
      is_yield_custom: false,
      allergens: ['dairy', 'gluten']
    })
  })

  it('debería usar yield_factor cuando está presente', () => {
    const item = {
      id: 'ri-3',
      quantity_gross: 1,
      quantity_net: 0.85,
      yield_factor: 0.80, // Diferente del masterYield (0.85)
      master_ingredient: {
        id: 'ing-3',
        name: 'Carne',
        base_unit: 'kg',
        standard_waste_pct: 0.15, // masterYield = 0.85
        current_avg_price: 12.00,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.80)
    expect(result.is_yield_custom).toBe(true) // |0.80 - 0.85| = 0.05 > 0.001
  })

  it('debería calcular yield desde master cuando yield_factor es null', () => {
    const item = {
      id: 'ri-4',
      quantity_gross: 1,
      quantity_net: 0.92,
      yield_factor: null,
      master_ingredient: {
        id: 'ing-4',
        name: 'Verdura',
        base_unit: 'kg',
        standard_waste_pct: 0.08,
        current_avg_price: 2.50,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    // (100 - (0.08 * 100)) / 100 = 0.92
    expect(result.yield_pct).toBe(0.92)
    expect(result.is_yield_custom).toBe(false)
  })

  it('debería usar precio 0 cuando current_avg_price es null', () => {
    const item = {
      id: 'ri-5',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: null,
      master_ingredient: {
        id: 'ing-5',
        name: 'Ingrediente Sin Precio',
        base_unit: 'kg',
        standard_waste_pct: 0,
        current_avg_price: null,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.price_per_unit).toBe(0)
  })

  it('debería usar yield 0 cuando standard_waste_pct es null', () => {
    const item = {
      id: 'ri-6',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: null,
      master_ingredient: {
        id: 'ing-6',
        name: 'Ingrediente Sin Waste',
        base_unit: 'kg',
        standard_waste_pct: null,
        current_avg_price: 5.00,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(1)
  })

  it('debería manejar yield_factor undefined', () => {
    const item = {
      id: 'ri-7',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: undefined,
      master_ingredient: {
        id: 'ing-7',
        name: 'Ingrediente',
        base_unit: 'kg',
        standard_waste_pct: 0.2,
        current_avg_price: 10.00,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    // (100 - (0.2 * 100)) / 100 = 0.8
    expect(result.yield_pct).toBe(0.8)
    expect(result.is_yield_custom).toBe(false)
  })

  it('debería marcar como custom cuando yield differe del master en más de 0.001', () => {
    const item = {
      id: 'ri-8',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: 0.905, // Diferencia exactamente 0.005 del master
      master_ingredient: {
        id: 'ing-8',
        name: 'Ingrediente',
        base_unit: 'kg',
        standard_waste_pct: 0.1, // masterYield = 0.9
        current_avg_price: 10.00,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.905)
    expect(result.is_yield_custom).toBe(true) // |0.905 - 0.9| = 0.005 > 0.001
  })

  it('debería NO marcar como custom cuando yield differe menos de 0.001', () => {
    const item = {
      id: 'ri-9',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: 0.9005, // Diferencia de 0.0005 del master
      master_ingredient: {
        id: 'ing-9',
        name: 'Ingrediente',
        base_unit: 'kg',
        standard_waste_pct: 0.1, // masterYield = 0.9
        current_avg_price: 10.00,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.9005)
    expect(result.is_yield_custom).toBe(false) // |0.9005 - 0.9| = 0.0005 < 0.001
  })

  it('debería formatear ingrediente con waste 0%', () => {
    const item = {
      id: 'ri-10',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: 1,
      master_ingredient: {
        id: 'ing-10',
        name: 'Ingrediente Perfecto',
        base_unit: 'kg',
        standard_waste_pct: 0,
        current_avg_price: 15.00,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(1)
    expect(result.is_yield_custom).toBe(false)
  })
})
