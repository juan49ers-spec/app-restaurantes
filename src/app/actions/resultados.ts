import { createClient } from "@/lib/supabaseServer"
import { verifyRestaurantAccess } from "@/lib/verify-access"
import { revalidatePath } from "next/cache"
import { MonthlyResult } from "@/types/resultados"

export async function insertMonthlyTestData(
    restaurantId: string,
    data: Partial<MonthlyResult> & { year: number; month: number }
): Promise<{ success: boolean; error: string | null }> {
    try {
        await verifyRestaurantAccess(restaurantId)
        const supabase = await createClient()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: "No autorizado para insertar datos." }
        }

        const { error } = await supabase
            .from("monthly_results")
            .upsert({
                restaurant_id: restaurantId || "1",
                month_year: `${data.year}-${data.month.toString().padStart(2, "0")}`,
                year: data.year,
                month: data.month,
                month_name: new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(data.year, data.month - 1)),
                ingresos_netos: data.ingresos_netos || 0,
                ingresos_extra: 2300,
                total_ingresos: (data.ingresos_netos || 0) + 2300,
                personal_total: 18000,
                personal_sueldos_netos: 10800,
                personal_seguridad_social: 3600,
                personal_irpf: 2400,
                materia_prima_total: 13400,
                materia_prima_comida: 9380,
                materia_prima_bebida: 4020,
                materia_prima_variacion_existencias: 0,
                suministros: 1800,
                mantenimiento: 600,
                marketing: 1200,
                gastos_extra: 800,
                inversiones: 0,
                financiaciones: 0,
                resultado_bruto: 10200,
                resultado_neto: data.resultado_neto || 7700,
                margen_neto: (data.resultado_neto || 7700) / ((data.ingresos_netos || 0) + 2300) * 100,
                ratio_personal: 18000 / ((data.ingresos_netos || 0) + 2300) * 100,
                ratio_materia_prima: 13400 / ((data.ingresos_netos || 0) + 2300) * 100,
                ratio_gastos_fijos: 33.6,
                break_even_punto: 35000,
                break_even_dia: 22,
                break_even_alcanzado: true,
                is_closed: true,
                closed_at: new Date().toISOString(),
                closed_by: "admin"
            })

        if (error) throw error

        revalidatePath("/finance")
        return { success: true, error: null }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al insertar los datos"
        console.error("Error inserting test data:", err)
        return { success: false, error: message }
    }
}

// ==========================================
// GET DASHBOARD DATA FUNCTION
// ==========================================

export interface DashboardData {
    currentMonth: MonthlyResult | null
    history: MonthlyResult[]
    isClosed: boolean
}

export async function getResultsDashboardData(
    restaurantId: string,
    year: number,
    month: number
): Promise<{ data: DashboardData | null; error: string | null }> {
    try {
        await verifyRestaurantAccess(restaurantId)
        const supabase = await createClient()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { data: null, error: "Acceso no autorizado al dashboard." }
        }

        const monthYear = `${year}-${month.toString().padStart(2, "0")}`

        // 2 queries en paralelo (antes eran 4 — se eliminaron statusResult y expensesResult por redundantes)
        const [currentResult, historyResult] = await Promise.all([
            supabase
                .from("monthly_results")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .eq("month_year", monthYear)
                .single(),

            supabase
                .from("monthly_results")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .order("year", { ascending: false })
                .order("month", { ascending: false })
                .limit(12)
        ])

        if (historyResult.error) console.error("History error:", historyResult.error)

        const dashboardData: DashboardData = {
            currentMonth: currentResult.data || null,
            history: historyResult.data || [],
            isClosed: currentResult.data?.is_closed ?? false
        }

        return { data: dashboardData, error: null }
    } catch (err) {
        console.error("Error fetching dashboard data:", err)
        return { data: null, error: "Error al cargar el dashboard" }
    }
}

// ==========================================
// CLOSE MONTH (Cierre Contable)
// ==========================================

export async function closeMonth(
    restaurantId: string,
    monthYear: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        await verifyRestaurantAccess(restaurantId)
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: "No autorizado." }
        }

        const { error } = await supabase
            .from("monthly_results")
            .update({
                is_closed: true,
                closed_at: new Date().toISOString(),
                closed_by: user.id
            })
            .eq("restaurant_id", restaurantId)
            .eq("month_year", monthYear)

        if (error) throw error

        revalidatePath("/finance")
        return { success: true, error: null }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al cerrar el mes"
        console.error("Error closing month:", err)
        return { success: false, error: message }
    }
}
