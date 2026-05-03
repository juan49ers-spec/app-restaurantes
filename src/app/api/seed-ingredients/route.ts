import { NextResponse } from 'next/server'
import { getIngredients } from '@/app/actions/ingredients'
import { createClient } from '@/lib/supabaseServer'
import { getRestaurant } from '@/lib/auth-helpers'
import { seedRobustSalesData } from '@/app/actions/seed-sales-robust'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const restaurant = await getRestaurant()
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 400 })
  const restaurantId = restaurant.id

  const ingredients = await getIngredients()
  const byName = (n: string) => ingredients.find(i => i.name === n)

  const recipes = [
    {
      name: 'Hamburguesa Clásica',
      price: 12.00,
      items: [
        { name: 'Pan de hamburguesa', qty: 1 },
        { name: 'Carne picada ternera', qty: 0.180 },
        { name: 'Lechuga iceberg', qty: 0.030 },
        { name: 'Tomate', qty: 0.050 },
        { name: 'Cebolla', qty: 0.030 },
        { name: 'Queso cheddar', qty: 0.040 },
      ],
    },
    {
      name: 'Ensalada César',
      price: 9.50,
      items: [
        { name: 'Lechuga iceberg', qty: 0.150 },
        { name: 'Queso cheddar', qty: 0.030 },
        { name: 'Aceite de oliva', qty: 0.020 },
        { name: 'Huevos', qty: 1 },
        { name: 'Bacon', qty: 0.040 },
      ],
    },
    {
      name: 'Salmón a la Plancha',
      price: 18.00,
      items: [
        { name: 'Salmón fresco', qty: 0.200 },
        { name: 'Patatas', qty: 0.200 },
        { name: 'Aceite de oliva', qty: 0.030 },
        { name: 'Sal', qty: 0.005 },
      ],
    },
    {
      name: 'Pasta Carbonara',
      price: 11.00,
      items: [
        { name: 'Pasta espagueti', qty: 0.120 },
        { name: 'Bacon', qty: 0.060 },
        { name: 'Huevos', qty: 2 },
        { name: 'Nata líquida', qty: 0.050 },
        { name: 'Queso cheddar', qty: 0.030 },
      ],
    },
    {
      name: 'Patatas Bravas',
      price: 6.50,
      items: [
        { name: 'Patatas', qty: 0.300 },
        { name: 'Aceite de oliva', qty: 0.100 },
        { name: 'Tomate', qty: 0.080 },
        { name: 'Sal', qty: 0.005 },
      ],
    },
  ]

  const results = []
  for (const recipe of recipes) {
    const ingList = recipe.items.map(item => {
      const ing = byName(item.name)
      return ing ? { id: ing.id, qty: item.qty, price: ing.current_avg_price } : null
    }).filter(Boolean) as { id: string; qty: number; price: number }[]

    const totalCost = ingList.reduce((s, i) => s + i.qty * i.price, 0)
    const margin = recipe.price > 0 ? ((recipe.price - totalCost) / recipe.price) * 100 : 0

    const recipeId = crypto.randomUUID()

    const { error: recipeErr } = await supabase.from('recipes').insert({
      id: recipeId,
      restaurant_id: restaurantId,
      name: recipe.name,
      prep_time_minutes: 15,
      current_cost: totalCost,
      selling_price: recipe.price,
      target_margin_pct: 70,
      yields: 1,
      hourly_rate: 0,
    })

    if (recipeErr) {
      results.push({ name: recipe.name, ok: false, error: recipeErr.message })
      continue
    }

    const ingRows = ingList.map(ing => ({
      recipe_id: recipeId,
      master_ingredient_id: ing.id,
      quantity_gross: ing.qty,
      quantity_net: ing.qty,
      yield_factor: 1.0,
      cost_at_time: ing.price,
    }))

    const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRows)
    if (ingErr) {
      results.push({ name: recipe.name, ok: false, error: 'Recipe saved but ingredients failed: ' + ingErr.message })
      continue
    }

    results.push({ name: recipe.name, ok: true, id: recipeId, cost: totalCost.toFixed(2), margin: margin.toFixed(1) + '%' })
  }

  // Also seed 30 days of sales data
  const salesResult = await seedRobustSalesData(restaurantId)

  return NextResponse.json({ ingredientCount: ingredients.length, results, salesResult })
}
