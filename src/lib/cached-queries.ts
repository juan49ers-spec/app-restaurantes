import { cache } from 'react'
import { createClient } from "@/lib/supabaseServer"
import { DailySales, OperatingExpense } from '@/types/schema'

export const getDailySalesCached = cache(async (restaurantId: string, startDate: string, endDate: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('daily_sales')
    .select('id, restaurant_id, date, revenue_total, base_10, tax_10, base_21, tax_21, iva_collected, revenue_dine_in, revenue_takeout, revenue_delivery, total_covers, labor_hours, day_status')
    .eq('restaurant_id', restaurantId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error("Failed to fetch daily sales range")
  return (data as DailySales[]) || []
})

export const getOperatingExpensesCached = cache(async (restaurantId: string, startDate: string, endDate: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operating_expenses')
    .select('id, restaurant_id, expense_date, category, amount, description, payment_method, is_paid')
    .eq('restaurant_id', restaurantId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })

  if (error) throw new Error("Failed to fetch expenses")
  return (data as OperatingExpense[]) || []
})

export const getFiscalMetricsCached = cache(async (restaurantId: string, startDate: string, endDate: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('daily_sales')
    .select('date, revenue_total, base_10, tax_10, base_21, tax_21')
    .eq('restaurant_id', restaurantId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw new Error("Failed to fetch fiscal metrics")
  return data || []
})