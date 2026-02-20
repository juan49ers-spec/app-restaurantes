/**
 * TESTS UNITARIOS: Recipe Utils
 * 
 * Tests para cubrir 100% de formatRecipeIngredient
 */

import { describe, it, expect } from 'vitest'
import { formatRecipeIngredient } from '@/lib/recipe-utils'

describe('formatRecipeIngredient - 100% Coverage', () => {
  it('debería formatear ingrediente básico (líneas 20-48)', () => {
    const item = {
      id: 'ri-1',
      quantity_gross: 1.5,
      quantity_net: 1.35,
      yield_factor: 0.9,
      master_ingredient: {
        id: 'ing-1',
        name: 'Pechuga de Pollo',
        base_unit: 'kg',
        current_avg_price: 8.90,
        standard_waste_pct: 0.1,
        allergens: ['gluten']
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.id).toBe('ri-1')
    expect(result.name).toBe('Pechuga de Pollo')
    expect(result.type).toBe('INGREDIENT')
    expect(result.base_unit).toBe('kg')
    expect(result.price_per_unit).toBe(8.90)
    expect(result.yield_pct).toBe(0.9)
    expect(result.is_yield_custom).toBe(false)
    expect(result.allergens).toEqual(['gluten'])
  })

  it('debería formatear sub-receta (líneas 20-48)', () => {
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

    expect(result.id).toBe('ri-2')
    expect(result.name).toBe('Salsa Bechamel')
    expect(result.type).toBe('RECIPE')
    expect(result.base_unit).toBe('u')
    expect(result.price_per_unit).toBe(3.50)
    expect(result.yield_pct).toBe(1)
    expect(result.is_yield_custom).toBe(false)
    expect(result.allergens).toEqual(['dairy', 'gluten'])
  })

  it('debería usar yield_factor cuando está presente (líneas 35-37)', () => {
    const item = {
      id: 'ri-3',
      quantity_gross: 1,
      quantity_net: 0.85,
      yield_factor: 0.85,
      master_ingredient: {
        id: 'ing-3',
        name: 'Carne',
        base_unit: 'kg',
        current_avg_price: 12.00,
        standard_waste_pct: 0.15, // masterYield = 0.85
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.85)
    expect(result.is_yield_custom).toBe(false)
  })

  it('debería usar masterYield cuando yield_factor es null (líneas 35-37)', () => {
    const item = {
      id: 'ri-4',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: null,
      master_ingredient: {
        id: 'ing-4',
        name: 'Verdura',
        base_unit: 'kg',
        current_avg_price: 2.50,
        standard_waste_pct: 0.08, // masterYield = 0.92
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.92)
    expect(result.is_yield_custom).toBe(false)
  })

  it('debería marcar como custom cuando diff > 0.001 (líneas 50)', () => {
    const item = {
      id: 'ri-5',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: 0.905, // Diff = 0.005 del master (0.9)
      master_ingredient: {
        id: 'ing-5',
        name: 'Ingrediente',
        base_unit: 'kg',
        current_avg_price: 10.00,
        standard_waste_pct: 0.1, // masterYield = 0.9
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.905)
    expect(result.is_yield_custom).toBe(true)
  })

  it('debería manejar precio 0 (líneas 23)', () => {
    const item = {
      id: 'ri-6',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: 1,
      master_ingredient: {
        id: 'ing-6',
        name: 'Ingrediente Sin Precio',
        base_unit: 'kg',
        current_avg_price: null,
        standard_waste_pct: 0,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.price_per_unit).toBe(0)
  })

  it('debería manejar waste 0 (líneas 24)', () => {
    const item = {
      id: 'ri-7',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: null,
      master_ingredient: {
        id: 'ing-7',
        name: 'Ingrediente Perfecto',
        base_unit: 'kg',
        current_avg_price: 15.00,
        standard_waste_pct: null,
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(1)
  })

  it('debería lanzar error si falta master_ingredient (líneas 21-23)', () => {
    const item = {
      id: 'ri-10',
      quantity_gross: 1,
      quantity_net: 0.8,
      yield_factor: null,
      master_ingredient: null,
      sub_recipe: null
    }

    expect(() => formatRecipeIngredient(item as any)).toThrow('Invalid ingredient data: missing master_ingredient')
  })

  it('debería lanzar error si falta sub_recipe (líneas 24-26)', () => {
    const item = {
      id: 'ri-9',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: 1,
      master_ingredient: null,
      sub_recipe: null
    }

    expect(() => formatRecipeIngredient(item as any)).toThrow('Invalid ingredient data')
  })

  it('debería manejar yield_factor undefined (líneas 35-37)', () => {
    const item = {
      id: 'ri-10',
      quantity_gross: 1,
      quantity_net: 1,
      yield_factor: undefined,
      master_ingredient: {
        id: 'ing-10',
        name: 'Ingrediente',
        base_unit: 'kg',
        current_avg_price: 10.00,
        standard_waste_pct: 0.2, // masterYield = 0.8
        allergens: []
      },
      sub_recipe: null
    }

    const result = formatRecipeIngredient(item)

    expect(result.yield_pct).toBe(0.8)
    expect(result.is_yield_custom).toBe(false)
  })

  it('debería formatear sub-receta completa (líneas 20-48)', () => {
    const item = {
      id: 'ri-11',
      quantity_gross: 2.5,
      quantity_net: 2.5,
      yield_factor: null,
      master_ingredient: null,
      sub_recipe: {
        id: 'sub-2',
        name: 'Salsa Compleja',
        current_cost: 8.75,
        allergens: ['gluten', 'lactosa', 'huevos']
      }
    }

    const result = formatRecipeIngredient(item)

    expect(result.master_ingredient_id).toBeUndefined()
    expect(result.sub_recipe_id).toBe('sub-2')
    expect(result.allergens).toEqual(['gluten', 'lactosa', 'huevos'])
  })
})
