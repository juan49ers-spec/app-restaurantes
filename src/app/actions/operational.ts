'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

export interface OperationalAlert {
  id: string
  type: 'price' | 'margin' | 'waste' | 'missing' | 'menu'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  entityId: string
  entityType: 'ingredient' | 'recipe' | 'menu_item'
  entityName: string
  createdAt: Date
}

export interface OperationalKPIs {
  totalIngredients: number
  ingredientsWithoutPrice: number
  avgWastePercentage: number
  totalRecipes: number
  recipesBelowTargetMargin: number
  avgFoodCostPercentage: number
  menuItems: number
  dogsWithoutAction: number
}

export interface PendingTask {
  id: string
  type: 'price_update' | 'recipe_review' | 'photo_upload' | 'category_missing' | 'allergen_check'
  title: string
  description: string
  entityId: string
  entityType: 'ingredient' | 'recipe'
  entityName: string
  priority: 'high' | 'medium' | 'low'
}

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  
  const alerts: OperationalAlert[] = []

  // 1. Ingredientes sin precio actualizado (>7 días)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: oldIngredients } = await supabase
    .from('master_ingredients')
    .select('id, name, last_updated_at, current_avg_price')
    .eq('restaurant_id', restaurantId)
    .or(`last_updated_at.lt.${sevenDaysAgo.toISOString()},last_updated_at.is.null`)

  oldIngredients?.forEach(ing => {
    alerts.push({
      id: `price-${ing.id}`,
      type: 'price',
      severity: 'medium',
      title: 'Precio desactualizado',
      description: `El precio no se ha actualizado en más de 7 días`,
      entityId: ing.id,
      entityType: 'ingredient',
      entityName: ing.name,
      createdAt: new Date()
    })
  })

  // 2. Recetas con margen bajo el objetivo
  const { data: lowMarginRecipes } = await supabase
    .from('recipes')
    .select('id, name, current_cost, selling_price, target_margin_pct')
    .eq('restaurant_id', restaurantId)
    .gt('selling_price', 0)

  lowMarginRecipes?.forEach(recipe => {
    const margin = recipe.selling_price 
      ? ((recipe.selling_price - recipe.current_cost) / recipe.selling_price) * 100 
      : 0
    const target = recipe.target_margin_pct || 70

    if (margin < target) {
      alerts.push({
        id: `margin-${recipe.id}`,
        type: 'margin',
        severity: margin < 50 ? 'high' : 'medium',
        title: 'Margen por debajo del objetivo',
        description: `Margen actual: ${margin.toFixed(1)}% | Objetivo: ${target}%`,
        entityId: recipe.id,
        entityType: 'recipe',
        entityName: recipe.name,
        createdAt: new Date()
      })
    }
  })

  // 3. Ingredientes con merma alta (>20%)
  const { data: highWasteIngredients } = await supabase
    .from('master_ingredients')
    .select('id, name, standard_waste_pct')
    .eq('restaurant_id', restaurantId)
    .gt('standard_waste_pct', 0.20)

  highWasteIngredients?.forEach(ing => {
    alerts.push({
      id: `waste-${ing.id}`,
      type: 'waste',
      severity: ing.standard_waste_pct > 0.30 ? 'high' : 'medium',
      title: 'Merma elevada',
      description: `Merma del ${(ing.standard_waste_pct * 100).toFixed(1)}% - Revisar proceso`,
      entityId: ing.id,
      entityType: 'ingredient',
      entityName: ing.name,
      createdAt: new Date()
    })
  })

  // 4. Ingredientes sin categoría
  const { data: uncategorizedIngredients } = await supabase
    .from('master_ingredients')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .or('category.is.null,category.eq.')

  uncategorizedIngredients?.forEach(ing => {
    alerts.push({
      id: `missing-${ing.id}`,
      type: 'missing',
      severity: 'low',
      title: 'Sin categoría',
      description: 'Asigna una categoría para mejor organización',
      entityId: ing.id,
      entityType: 'ingredient',
      entityName: ing.name,
      createdAt: new Date()
    })
  })

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

export async function getOperationalKPIs(): Promise<OperationalKPIs> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // Ingredientes
  const { data: ingredients } = await supabase
    .from('master_ingredients')
    .select('current_avg_price, standard_waste_pct')
    .eq('restaurant_id', restaurantId)

  const totalIngredients = ingredients?.length || 0
  const ingredientsWithoutPrice = ingredients?.filter(i => !i.current_avg_price || i.current_avg_price === 0).length || 0
  const avgWastePercentage = ingredients?.length 
    ? ingredients.reduce((sum, i) => sum + (i.standard_waste_pct || 0), 0) / ingredients.length 
    : 0

  // Recetas
  const { data: recipes } = await supabase
    .from('recipes')
    .select('current_cost, selling_price, target_margin_pct')
    .eq('restaurant_id', restaurantId)

  const totalRecipes = recipes?.length || 0
  const recipesBelowTargetMargin = recipes?.filter(r => {
    const margin = r.selling_price ? ((r.selling_price - r.current_cost) / r.selling_price) * 100 : 0
    return margin < (r.target_margin_pct || 70)
  }).length || 0

  const avgFoodCostPercentage = recipes?.length 
    ? recipes.reduce((sum, r) => {
        const foodCost = r.selling_price ? (r.current_cost / r.selling_price) * 100 : 0
        return sum + foodCost
      }, 0) / recipes.length 
    : 0

  return {
    totalIngredients,
    ingredientsWithoutPrice,
    avgWastePercentage,
    totalRecipes,
    recipesBelowTargetMargin,
    avgFoodCostPercentage,
    menuItems: 0,
    dogsWithoutAction: 0
  }
}

export async function getPendingTasks(): Promise<PendingTask[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()
  
  const tasks: PendingTask[] = []

  // 1. Ingredientes sin precio
  const { data: ingredientsNoPrice } = await supabase
    .from('master_ingredients')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .or('current_avg_price.is.null,current_avg_price.eq.0')

  ingredientsNoPrice?.forEach(ing => {
    tasks.push({
      id: `price-${ing.id}`,
      type: 'price_update',
      title: 'Añadir precio',
      description: `El ingrediente no tiene precio definido`,
      entityId: ing.id,
      entityType: 'ingredient',
      entityName: ing.name,
      priority: 'high'
    })
  })

  // 2. Recetas sin revisar (simulado - sin campo updated_at reciente)
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, current_cost, selling_price')
    .eq('restaurant_id', restaurantId)
    .eq('current_cost', 0)

  recipes?.forEach(recipe => {
    tasks.push({
      id: `recipe-${recipe.id}`,
      type: 'recipe_review',
      title: 'Completar escandallo',
      description: 'La receta no tiene coste calculado',
      entityId: recipe.id,
      entityType: 'recipe',
      entityName: recipe.name,
      priority: 'high'
    })
  })

  // 3. Ingredientes sin categoría
  const { data: uncategorized } = await supabase
    .from('master_ingredients')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .or('category.is.null,category.eq.')

  uncategorized?.forEach(ing => {
    tasks.push({
      id: `category-${ing.id}`,
      type: 'category_missing',
      title: 'Asignar categoría',
      description: 'Clasifica este ingrediente',
      entityId: ing.id,
      entityType: 'ingredient',
      entityName: ing.name,
      priority: 'low'
    })
  })

  return tasks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}
