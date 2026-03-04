'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"

const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']

export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
        throw new Error("Unauthorized: Super Admin access required")
    }
    return user
}

export async function isAdmin(): Promise<boolean> {
    try {
        await requireAdmin()
        return true
    } catch {
        return false
    }
}

export async function getAllRestaurants() {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching restaurants:", error)
        throw new Error("Failed to fetch restaurants")
    }

    return data
}

export async function toggleRestaurantModule(
    restaurantId: string,
    module: 'financial_control' | 'menu_engineering',
    level: 'none' | 'basic' | 'premium'
) {
    await requireAdmin()
    const supabase = await createClient()

    const { data: current, error: fetchError } = await supabase
        .from('restaurants')
        .select('modules')
        .eq('id', restaurantId)
        .single()

    if (fetchError) throw new Error("Restaurant not found")

    const updatedModules = {
        ...current.modules,
        [module]: level
    }

    const { error } = await supabase
        .from('restaurants')
        .update({ modules: updatedModules })
        .eq('id', restaurantId)

    if (error) {
        console.error("Error updating module:", error)
        throw new Error("Failed to update module")
    }

    revalidatePath('/admin')
    return { success: true }
}

// ==========================================
// GLOBAL METRICS (Super Admin Dashboard)
// ==========================================

export interface AdminDashboardData {
    totalRestaurants: number
    totalSalesThisMonth: number
    totalExpensesThisMonth: number
    totalEmployees: number
    recentAuditLogs: AuditLogEntry[]
    restaurants: AdminRestaurantRow[]
}

export interface AuditLogEntry {
    id: string
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data: Record<string, unknown> | null
    new_data: Record<string, unknown> | null
    changed_by: string | null
    created_at: string
    restaurant_id: string | null
}

export interface AdminRestaurantRow {
    id: string
    name: string
    created_at: string
    modules: Record<string, string> | null
    salesThisMonth: number
    expensesThisMonth: number
    employeeCount: number
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    await requireAdmin()
    const supabase = await createClient()

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    // Parallel queries for global data
    const [
        restaurantsRes,
        salesRes,
        expensesRes,
        employeesRes,
        auditRes
    ] = await Promise.all([
        supabase.from('restaurants').select('id, name, created_at, modules').order('created_at', { ascending: false }),
        supabase.from('daily_sales').select('restaurant_id, revenue_total').gte('sale_date', monthStart).lt('sale_date', monthEnd),
        supabase.from('operating_expenses').select('restaurant_id, amount').gte('expense_date', monthStart).lt('expense_date', monthEnd),
        supabase.from('employees').select('restaurant_id, id'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
    ])

    const restaurants = restaurantsRes.data || []
    const sales = salesRes.data || []
    const expenses = expensesRes.data || []
    const employees = employeesRes.data || []
    const auditLogs = (auditRes.data || []) as AuditLogEntry[]

    const totalSalesThisMonth = sales.reduce((sum, s) => sum + (s.revenue_total || 0), 0)
    const totalExpensesThisMonth = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    // Per-restaurant metrics
    const restaurantRows: AdminRestaurantRow[] = restaurants.map(r => {
        const rSales = sales.filter(s => s.restaurant_id === r.id).reduce((sum, s) => sum + (s.revenue_total || 0), 0)
        const rExpenses = expenses.filter(e => e.restaurant_id === r.id).reduce((sum, e) => sum + (e.amount || 0), 0)
        const rEmployees = employees.filter(e => e.restaurant_id === r.id).length

        return {
            id: r.id,
            name: r.name,
            created_at: r.created_at,
            modules: r.modules,
            salesThisMonth: rSales,
            expensesThisMonth: rExpenses,
            employeeCount: rEmployees
        }
    })

    return {
        totalRestaurants: restaurants.length,
        totalSalesThisMonth,
        totalExpensesThisMonth,
        totalEmployees: employees.length,
        recentAuditLogs: auditLogs,
        restaurants: restaurantRows
    }
}

export async function getAuditLogs(page = 1, pageSize = 50): Promise<{ logs: AuditLogEntry[], total: number }> {
    await requireAdmin()
    const supabase = await createClient()

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const [{ data, error }, { count }] = await Promise.all([
        supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to),
        supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
    ])

    if (error) {
        console.error("Error fetching audit logs:", error)
        return { logs: [], total: 0 }
    }

    return {
        logs: (data || []) as AuditLogEntry[],
        total: count || 0
    }
}
