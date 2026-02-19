import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { MonthlyResult } from "@/types/resultados"
import { OperatingExpense } from "@/types/schema"

export async function insertMonthlyTestData(
    restaurantId: string,
    data: Partial<MonthlyResult> & { year: number; month: number }
): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()

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

        revalidatePath("/financial-control")
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
    expenses: OperatingExpense[]
    isClosed: boolean
}

export async function getResultsDashboardData(
    restaurantId: string,
    year: number,
    month: number
): Promise<{ data: DashboardData | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const monthYear = `${year}-${month.toString().padStart(2, "0")}`

        // Ejecutar todas las consultas en paralelo
        const [
            currentResult,
            historyResult,
            expensesResult,
            statusResult
        ] = await Promise.all([
            // Resultado actual
            supabase
                .from("monthly_results")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .eq("month_year", monthYear)
                .single(),

            // Histórico (últimos 12 meses)
            supabase
                .from("monthly_results")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .order("year", { ascending: false })
                .order("month", { ascending: false })
                .limit(12),

            // Gastos del mes
            supabase
                .from("operating_expenses")
                .select("*")
                .eq("restaurant_id", restaurantId)
                .eq("month_year", monthYear)
                .order("expense_date", { ascending: false }),

            // Estado del mes
            supabase
                .from("monthly_results")
                .select("is_closed")
                .eq("restaurant_id", restaurantId)
                .eq("month_year", monthYear)
                .single()
        ])

        // Manejar errores individuales (no críticos)
        if (historyResult.error) console.error("History error:", historyResult.error)
        if (expensesResult.error) console.error("Expenses error:", expensesResult.error)

        const dashboardData: DashboardData = {
            currentMonth: currentResult.data || null,
            history: historyResult.data || [],
            expenses: expensesResult.data || [],
            isClosed: statusResult.data?.is_closed ?? false
        }

        return { data: dashboardData, error: null }
    } catch (err) {
        console.error("Error fetching dashboard data:", err)
        return { data: null, error: "Error al cargar el dashboard" }
    }
}
