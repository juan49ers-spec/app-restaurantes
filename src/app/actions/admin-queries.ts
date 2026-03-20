/**
 * Funciones de lectura para el panel de administración.
 * NO son server actions — son funciones de servidor normales 
 * que se invocan desde Server Components (pages/layouts).
 */
import { createClient } from "@/lib/supabaseServer"

const DEFAULT_ADMINS = ['juan49ers@gmail.com', 'admin@controlhub.com']
const ENV_ADMINS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : []
const ADMIN_EMAILS = Array.from(new Set([...DEFAULT_ADMINS, ...ENV_ADMINS]))

export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.trim().toLowerCase())) {
        throw new Error("Unauthorized: Super Admin access required")
    }
    return user
}

// ==========================================
// TYPES
// ==========================================

export interface Broadcast {
    id: string
    title: string
    content: string
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
    expires_at: string
    created_at: string
}

export interface AdminDashboardData {
    totalRestaurants: number
    totalSalesThisMonth: number
    totalExpensesThisMonth: number
    totalEmployees: number
    recentAuditLogs: AuditLogEntry[]
    restaurants: AdminRestaurantRow[]
    systemHealth: SystemHealthData | null
    broadcasts: Broadcast[]
}

export interface SystemHealthData {
    total_users: number
    new_this_week: number
    active_last_7_days: number
    inactive_over_15_days: number
    users_data: {
        id: string
        created_at: string
        last_sign_in_at: string | null
        days_inactive: number
        restaurant_name?: string
    }[]
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

// ==========================================
// QUERIES
// ==========================================

export async function getAllRestaurants() {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, created_at, modules, owner_id')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching restaurants:", error)
        return []
    }

    // Normalizar datos para evitar errores de renderizado aislando fallos por restaurante
    const result: AdminRestaurantRow[] = []

    for (const r of data || []) {
        try {
            let safeDate = new Date().toISOString()
            if (r.created_at) {
                const parsed = new Date(r.created_at)
                if (!isNaN(parsed.getTime())) {
                    safeDate = parsed.toISOString()
                }
            }

            result.push({
                id: r.id,
                name: r.name,
                modules: r.modules || { financial_control: 'basic', operativa: 'none', proveedores: 'none', personal: 'none' },
                created_at: safeDate,
                salesThisMonth: 0,
                expensesThisMonth: 0,
                employeeCount: 0
            })
        } catch (e) {
            console.error(`[Admin - Restaurants] Fallo al parsear restaurante ID: ${r.id}`, e)
            // Se omite el restaurante corrupto en vez de tirar toda la página con un 500
        }
    }

    return result
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    await requireAdmin()
    const supabase = await createClient()

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    const [
        restaurantsRes,
        salesRes,
        expensesRes,
        employeesRes,
        auditRes,
        healthRes,
        broadcastsRes
    ] = await Promise.all([
        supabase.from('restaurants').select('id, name, created_at, modules').order('created_at', { ascending: false }),
        supabase.from('daily_sales').select('restaurant_id, revenue_total').gte('date', monthStart).lt('date', monthEnd),
        supabase.from('operating_expenses').select('restaurant_id, amount').gte('expense_date', monthStart).lt('expense_date', monthEnd),
        supabase.from('employees').select('restaurant_id, id'),
        supabase.from('audit_logs').select('id, table_name, record_id, action, old_data, new_data, changed_by, created_at, restaurant_id', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
        supabase.rpc('admin_get_system_health'),
        supabase.from('global_broadcasts').select('*').eq('is_active', true).order('created_at', { ascending: false })
    ])

    const restaurants = restaurantsRes.data || []
    const sales = salesRes.data || []
    const expenses = expensesRes.data || []
    const employees = employeesRes.data || []

    if (auditRes.error) {
        console.error("Error fetching recent audit logs:", JSON.stringify(auditRes.error, null, 2))
    }
    const auditLogs = (auditRes.data || []) as AuditLogEntry[]

    const totalSalesThisMonth = sales.reduce((sum, s) => sum + (s.revenue_total || 0), 0)
    const totalExpensesThisMonth = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

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

    // Process system health and map restaurant names to inactive users
    let systemHealth: SystemHealthData | null = null
    if (healthRes.data) {
        systemHealth = healthRes.data as SystemHealthData

        // We need the owner_ids to cross reference
        const { data: usersData } = await supabase.rpc('admin_list_users')
        const allUsers = usersData || []

        const rMap = new Map<string, string>(restaurants.map(r => [r.id, r.name]))
        const userRestaurantMap = new Map<string, string>(
            allUsers
                .filter((u: { id: string; restaurant_id: string | null }) => u.restaurant_id)
                .map((u: { id: string; restaurant_id: string | null }) => [u.id, u.restaurant_id ? (rMap.get(u.restaurant_id) || '') : ''])
        )

        systemHealth.users_data = systemHealth.users_data.map(u => ({
            ...u,
            restaurant_name: userRestaurantMap.get(u.id) || 'Usuario sin local'
        }))
    }

    return {
        totalRestaurants: restaurants.length,
        totalSalesThisMonth,
        totalExpensesThisMonth,
        totalEmployees: employees.length,
        recentAuditLogs: auditLogs,
        restaurants: restaurantRows,
        systemHealth,
        broadcasts: broadcastsRes.data || []
    }
}

export async function getAuditLogs(page = 1, pageSize = 50): Promise<{ logs: AuditLogEntry[], total: number }> {
    await requireAdmin()
    const supabase = await createClient()

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const [dataRes, countRes] = await Promise.all([
        supabase
            .from('audit_logs')
            .select('id, table_name, record_id, action, old_data, new_data, changed_by, created_at, restaurant_id')
            .order('created_at', { ascending: false })
            .range(from, to),
        supabase
            .from('audit_logs')
            .select('id', { count: 'exact', head: true })
    ])

    if (dataRes.error || countRes.error) {
        console.error("Error fetching audit logs:", JSON.stringify(dataRes.error || countRes.error, null, 2))
        return { logs: [], total: 0 }
    }

    return {
        logs: (dataRes.data || []) as AuditLogEntry[],
        total: countRes.count || 0
    }
}

// ==========================================
// USER MANAGEMENT
// ==========================================

export interface AdminUserRow {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
    restaurant_id: string | null
    restaurant_name: string | null
    is_admin: boolean
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
    await requireAdmin()
    const supabase = await createClient()

    // Usa RPC con SECURITY DEFINER — lee auth.users sin service role key
    const { data: users, error } = await supabase.rpc('admin_list_users')
    if (error) {
        console.error("Error fetching users:", error)
        return []
    }

    // Cruzar con restaurantes para resolver nombres
    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')

    const restaurantMap = new Map(
        (restaurants || []).map(r => [r.id, r.name])
    )

    return (users || []).map((u: { id: string; email: string; created_at: string; last_sign_in_at: string | null; restaurant_id: string | null }) => ({
        id: u.id,
        email: u.email || 'Sin email',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        restaurant_id: u.restaurant_id || null,
        restaurant_name: u.restaurant_id ? (restaurantMap.get(u.restaurant_id) || 'Desconocido') : null,
        is_admin: ADMIN_EMAILS.includes((u.email || '').trim().toLowerCase()),
    }))
}
