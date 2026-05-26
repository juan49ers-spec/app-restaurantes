'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabaseServer'
import { getUserRestaurant } from './utils'

const DEMO_SOURCE = 'reporting_demo'
const DEMO_PERIOD = {
  from: '2026-02-01',
  to: '2026-02-28',
  month: '2026-02',
}

type ActionResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export interface ProfessionalReportDemoSeedResult {
  period: {
    from: string
    to: string
  }
  rows: {
    sales: number
    expenses: number
    employees: number
    shifts: number
    suppliers: number
    invoices: number
    recipes: number
    recipeSales: number
  }
}

function isDemoSeedAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_REPORTING_DEMO_SEED === 'true'
}

function eur(value: number) {
  return Math.round(value * 100) / 100
}

function isoDay(day: number) {
  return `2026-02-${String(day).padStart(2, '0')}`
}

function splitRevenue(total: number) {
  const dineIn = eur(total * 0.74)
  const takeout = eur(total * 0.16)
  const delivery = eur(total - dineIn - takeout)
  return { dineIn, takeout, delivery }
}

function buildDailySales(restaurantId: string) {
  const dailyTotals = [
    0, 1820, 1950, 2100, 2450, 3380, 3650,
    1580, 0, 1880, 2010, 2260, 3200, 3520,
    1640, 0, 1910, 2070, 2380, 3450, 3820,
    1710, 0, 1980, 2140, 2520, 3580, 3960,
  ]

  return dailyTotals.map((total, index) => {
    const date = isoDay(index + 1)
    const { dineIn, takeout, delivery } = splitRevenue(total)
    const base10 = eur(total / 1.1)
    const tax10 = eur(total - base10)

    return {
      restaurant_id: restaurantId,
      date,
      revenue_total: total,
      revenue_dine_in: dineIn,
      revenue_takeout: takeout,
      revenue_delivery: delivery,
      base_10: base10,
      tax_10: tax10,
      base_21: 0,
      tax_21: 0,
      iva_collected: tax10,
      total_covers: total > 0 ? Math.round(total / 31) : 0,
      labor_hours: total > 0 ? (total >= 3000 ? 54 : 38) : 0,
      cost_of_goods: eur(total * 0.29),
      labor_cost: eur(total * 0.24),
      day_status: total > 0 ? 'LOCKED' : 'CLOSED',
      source: DEMO_SOURCE,
    }
  })
}

function buildExpenses() {
  return [
    ['2026-02-01', 'ALQUILER', 3400, 'Alquiler mensual del local'],
    ['2026-02-03', 'PROVEEDORES_COMIDA', 2850, 'Compra semanal producto fresco'],
    ['2026-02-07', 'PROVEEDORES_BEBIDA', 920, 'Compra bebida y bodega'],
    ['2026-02-10', 'PROVEEDORES_COMIDA', 3100, 'Compra semanal producto fresco'],
    ['2026-02-14', 'SUMINISTROS', 780, 'Luz, agua y gas'],
    ['2026-02-17', 'PROVEEDORES_COMIDA', 2980, 'Compra semanal producto fresco'],
    ['2026-02-21', 'MANTENIMIENTO', 420, 'Mantenimiento cocina'],
    ['2026-02-24', 'PROVEEDORES_COMIDA', 3220, 'Compra semanal producto fresco'],
    ['2026-02-27', 'NOMINAS_LIQUIDAS', 13900, 'Nominas febrero'],
    ['2026-02-28', 'SEGURIDAD_SOCIAL', 4100, 'Seguridad Social febrero'],
  ] as const
}

const DEMO_EMPLOYEES = [
  { first_name: 'Marta', last_name: 'Soler', role: 'MANAGEMENT', hourly_rate: 19.5, wage_type: 'HOURLY' },
  { first_name: 'Iker', last_name: 'Landa', role: 'KITCHEN_HEAD', hourly_rate: 17.5, wage_type: 'HOURLY' },
  { first_name: 'Nerea', last_name: 'Vidal', role: 'KITCHEN_STAFF', hourly_rate: 14.5, wage_type: 'HOURLY' },
  { first_name: 'Pau', last_name: 'Costa', role: 'FLOOR_MANAGER', hourly_rate: 15.5, wage_type: 'HOURLY' },
  { first_name: 'Laia', last_name: 'Mora', role: 'FLOOR_STAFF', hourly_rate: 12.5, wage_type: 'HOURLY' },
  { first_name: 'Diego', last_name: 'Ramos', role: 'BAR_STAFF', hourly_rate: 13.5, wage_type: 'HOURLY' },
]

const DEMO_RECIPES = [
  { name: '[Demo Informe] Txuleta 500g', selling_price: 32, current_cost: 13.8, target_margin_pct: 58 },
  { name: '[Demo Informe] Arroz meloso', selling_price: 22, current_cost: 7.4, target_margin_pct: 63 },
  { name: '[Demo Informe] Croquetas de jamon', selling_price: 12, current_cost: 3.1, target_margin_pct: 70 },
  { name: '[Demo Informe] Ensalada templada', selling_price: 14, current_cost: 4.9, target_margin_pct: 65 },
  { name: '[Demo Informe] Tarta de queso', selling_price: 8, current_cost: 2.2, target_margin_pct: 68 },
]

const DEMO_SUPPLIERS = [
  { name: '[Demo Informe] Frescos Norte', category: 'Alimentacion', reliability_score: 92, trend_direction: 'stable', total_orders: 12, avg_price_variance: 1.8 },
  { name: '[Demo Informe] Bodega Central', category: 'Bebidas', reliability_score: 86, trend_direction: 'improving', total_orders: 8, avg_price_variance: 2.4 },
  { name: '[Demo Informe] Carnes Premium', category: 'Carnes', reliability_score: 78, trend_direction: 'declining', total_orders: 6, avg_price_variance: 5.1 },
]

async function deletePreviousDemoRows(supabase: Awaited<ReturnType<typeof createClient>>, restaurantId: string) {
  const { data: demoEmployees } = await supabase
    .from('employees')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .like('email', 'reporting-demo-%@controlhub.local')

  const employeeIds = (demoEmployees || []).map(employee => employee.id)
  if (employeeIds.length > 0) {
    await supabase.from('shifts').delete().eq('restaurant_id', restaurantId).in('employee_id', employeeIds)
  }

  const { data: demoRecipes } = await supabase
    .from('recipes')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .like('name', '[Demo Informe]%')

  const recipeIds = (demoRecipes || []).map(recipe => recipe.id)
  if (recipeIds.length > 0) {
    await supabase.from('daily_recipe_sales').delete().eq('restaurant_id', restaurantId).in('recipe_id', recipeIds)
  }

  await Promise.all([
    supabase.from('daily_sales').delete().eq('restaurant_id', restaurantId).eq('source', DEMO_SOURCE),
    supabase.from('operating_expenses').delete().eq('restaurant_id', restaurantId).like('idempotency_key', 'reporting-demo-%'),
    supabase.from('invoices').delete().eq('restaurant_id', restaurantId).like('idempotency_key', 'reporting-demo-%'),
  ])

  await Promise.all([
    supabase.from('recipes').delete().eq('restaurant_id', restaurantId).like('name', '[Demo Informe]%'),
    supabase.from('suppliers').delete().eq('restaurant_id', restaurantId).like('name', '[Demo Informe]%'),
    supabase.from('employees').delete().eq('restaurant_id', restaurantId).like('email', 'reporting-demo-%@controlhub.local'),
  ])
}

export async function seedProfessionalReportDemoData(): Promise<ActionResponse<ProfessionalReportDemoSeedResult>> {
  if (!isDemoSeedAllowed()) {
    return { success: false, error: 'La seed demo de reporting no esta habilitada en produccion.' }
  }

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) {
    return { success: false, error: 'No hay restaurante activo para crear datos demo.' }
  }

  const supabase = await createClient()
  await deletePreviousDemoRows(supabase, restaurantId)

  const salesRows = buildDailySales(restaurantId)
  const expensesRows = buildExpenses().map(([expenseDate, category, amount, description], index) => ({
    restaurant_id: restaurantId,
    expense_date: expenseDate,
    category,
    amount,
    description,
    payment_method: 'bank',
    recurrence: 'ONE_TIME',
    is_paid: true,
    taxable_amount: eur(amount / 1.1),
    tax_rate: category === 'ALQUILER' || category === 'SUMINISTROS' || category === 'MANTENIMIENTO' ? 21 : 10,
    tax_amount: category === 'ALQUILER' || category === 'SUMINISTROS' || category === 'MANTENIMIENTO' ? eur(amount - amount / 1.21) : eur(amount - amount / 1.1),
    withholding_rate: category === 'ALQUILER' ? 19 : 0,
    withholding_amount: category === 'ALQUILER' ? eur(amount * 0.19) : 0,
    is_professional_invoice: true,
    month_year: DEMO_PERIOD.month,
    idempotency_key: `reporting-demo-expense-${index + 1}`,
    provider_detail: description,
    tag: DEMO_SOURCE,
  }))

  const { error: salesError } = await supabase
    .from('daily_sales')
    .upsert(salesRows, { onConflict: 'restaurant_id,date' })
  if (salesError) return { success: false, error: `Ventas demo: ${salesError.message}` }

  const { error: expensesError } = await supabase.from('operating_expenses').insert(expensesRows)
  if (expensesError) return { success: false, error: `Gastos demo: ${expensesError.message}` }

  const { data: existingTarget } = await supabase
    .from('monthly_targets')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('month_year', DEMO_PERIOD.month)
    .maybeSingle()

  if (!existingTarget) {
    const { error: targetError } = await supabase.from('monthly_targets').insert({
      restaurant_id: restaurantId,
      month_year: DEMO_PERIOD.month,
      revenue_target: 74000,
      cogs_target_pct: 30,
      labor_target_pct: 27,
    })
    if (targetError) return { success: false, error: `Objetivo demo: ${targetError.message}` }
  }

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .insert(DEMO_EMPLOYEES.map((employee, index) => ({
      ...employee,
      restaurant_id: restaurantId,
      email: `reporting-demo-${index + 1}@controlhub.local`,
      status: 'ACTIVE',
      system_access_level: 'NONE',
      contract_type: 'INDEFINIDO',
      contract_hours_weekly: 40,
      monthly_base_salary: 0,
      color_code: '#0f172a',
    })))
    .select('id, role, hourly_rate')
  if (employeesError || !employees) return { success: false, error: `Equipo demo: ${employeesError?.message || 'sin datos'}` }

  const shiftRows = employees.flatMap((employee, employeeIndex) => {
    const rows = []
    for (let day = 1; day <= 28; day += 1) {
      const date = new Date(`${isoDay(day)}T00:00:00.000Z`)
      const dayOfWeek = date.getUTCDay()
      if (dayOfWeek === 1) continue
      const weekend = dayOfWeek === 5 || dayOfWeek === 6
      const hours = weekend ? 8 : employeeIndex < 4 ? 7 : 5
      rows.push({
        restaurant_id: restaurantId,
        employee_id: employee.id,
        date: isoDay(day),
        start_time: employeeIndex < 3 ? '10:00' : '17:00',
        end_time: employeeIndex < 3 ? (weekend ? '18:00' : '17:00') : (weekend ? '01:00' : '22:00'),
        shift_type: employeeIndex < 3 ? 'ALMUERZO' : 'CENA',
        status: 'completed',
        break_minutes: hours >= 6 ? 30 : 0,
        estimated_cost: eur(hours * Number(employee.hourly_rate || 0)),
        actual_cost: eur(hours * Number(employee.hourly_rate || 0)),
        notes: DEMO_SOURCE,
      })
    }
    return rows
  })

  const { error: shiftsError } = await supabase.from('shifts').insert(shiftRows)
  if (shiftsError) return { success: false, error: `Turnos demo: ${shiftsError.message}` }

  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .insert(DEMO_SUPPLIERS.map(supplier => ({ ...supplier, restaurant_id: restaurantId })))
    .select('id')
  if (suppliersError || !suppliers) return { success: false, error: `Proveedores demo: ${suppliersError?.message || 'sin datos'}` }

  const invoiceRows = suppliers.map((supplier, index) => ({
    restaurant_id: restaurantId,
    supplier_id: supplier.id,
    invoice_number: `DEMO-REPORT-${index + 1}`,
    date: isoDay(4 + index * 7),
    total_amount: [2850, 920, 3220][index] ?? 1000,
    currency: 'EUR',
    status: 'completed',
    file_url: null,
    scanned_data: { source: DEMO_SOURCE },
    idempotency_key: `reporting-demo-invoice-${index + 1}`,
  }))

  const { error: invoicesError } = await supabase.from('invoices').insert(invoiceRows)
  if (invoicesError) return { success: false, error: `Facturas demo: ${invoicesError.message}` }

  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .insert(DEMO_RECIPES.map(recipe => ({
      ...recipe,
      restaurant_id: restaurantId,
      hourly_rate: 0,
      prep_time_minutes: 0,
      yields: 1,
    })))
    .select('id, selling_price')
  if (recipesError || !recipes) return { success: false, error: `Recetas demo: ${recipesError?.message || 'sin datos'}` }

  const recipeSalesRows = recipes.flatMap((recipe, recipeIndex) => {
    const rows = []
    for (let day = 1; day <= 28; day += 1) {
      const date = new Date(`${isoDay(day)}T00:00:00.000Z`)
      const dayOfWeek = date.getUTCDay()
      if (dayOfWeek === 1) continue
      const weekendBoost = dayOfWeek === 5 || dayOfWeek === 6 ? 7 : 0
      rows.push({
        restaurant_id: restaurantId,
        date: isoDay(day),
        recipe_id: recipe.id,
        quantity_sold: 4 + recipeIndex * 2 + weekendBoost,
      })
    }
    return rows
  })

  const { error: recipeSalesError } = await supabase
    .from('daily_recipe_sales')
    .upsert(recipeSalesRows, { onConflict: 'restaurant_id,date,recipe_id' })
  if (recipeSalesError) return { success: false, error: `Ventas por receta demo: ${recipeSalesError.message}` }

  revalidatePath('/reports')
  revalidatePath('/financial-control')
  revalidatePath('/recipes')
  revalidatePath('/stock')
  revalidatePath('/', 'layout')

  return {
    success: true,
    data: {
      period: { from: DEMO_PERIOD.from, to: DEMO_PERIOD.to },
      rows: {
        sales: salesRows.length,
        expenses: expensesRows.length,
        employees: employees.length,
        shifts: shiftRows.length,
        suppliers: suppliers.length,
        invoices: invoiceRows.length,
        recipes: recipes.length,
        recipeSales: recipeSalesRows.length,
      },
    },
  }
}
