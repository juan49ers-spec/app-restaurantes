import type { DashboardData as ServerDashboardData } from "@/app/actions/resultados"
import type { MonthlyResult } from "@/types/resultados"

const SIM_DEFAULTS: Omit<MonthlyResult, 'id' | 'restaurant_id' | 'created_at' | 'updated_at' | 'month' | 'year' | 'month_name' | 'month_year' | 'is_closed' | 'total_ingresos' | 'resultado_neto' | 'margen_neto' | 'materia_prima_total' | 'personal_total' | 'break_even_alcanzado'> = {
  ingresos_netos: 0, ingresos_extra: 0,
  personal_sueldos_netos: 0, personal_seguridad_social: 0, personal_irpf: 0,
  materia_prima_comida: 0, materia_prima_bebida: 0, materia_prima_variacion_existencias: 0,
  suministros: 0, mantenimiento: 0, marketing: 0,
  gastos_extra: 0, inversiones: 0, financiaciones: 0,
  resultado_bruto: 0, ratio_personal: 0, ratio_materia_prima: 0, ratio_gastos_fijos: 0,
  break_even_punto: 0, break_even_dia: undefined,
}

function simMonth(partial: Partial<MonthlyResult> & Pick<MonthlyResult,
  'id' | 'restaurant_id' | 'created_at' | 'updated_at' | 'month' | 'year' |
  'month_name' | 'month_year' | 'is_closed' | 'total_ingresos' |
  'resultado_neto' | 'margen_neto' | 'materia_prima_total' | 'personal_total' | 'break_even_alcanzado'
>): MonthlyResult {
  return { ...SIM_DEFAULTS, ...partial }
}

export const SIMULATED_SCENARIOS: Record<string, ServerDashboardData> = {
  success: {
    isClosed: true,
    history: [
      simMonth({ id: '1', restaurant_id: 'sim', created_at: '', updated_at: '', month: 1, year: 2026, month_name: 'Enero', month_year: '2026-01', total_ingresos: 55000, ingresos_netos: 52700, ingresos_extra: 2300, resultado_neto: 12000, margen_neto: 21.8, materia_prima_total: 13500, personal_total: 18000, is_closed: true, break_even_alcanzado: true }),
      simMonth({ id: '2', restaurant_id: 'sim', created_at: '', updated_at: '', month: 12, year: 2025, month_name: 'Diciembre', month_year: '2025-12', total_ingresos: 52000, ingresos_netos: 49700, ingresos_extra: 2300, resultado_neto: 11000, margen_neto: 21.1, materia_prima_total: 12600, personal_total: 18100, is_closed: true, break_even_alcanzado: true }),
      simMonth({ id: '3', restaurant_id: 'sim', created_at: '', updated_at: '', month: 1, year: 2025, month_name: 'Enero', month_year: '2025-01', total_ingresos: 42000, ingresos_netos: 39700, ingresos_extra: 2300, resultado_neto: 6800, margen_neto: 16.2, materia_prima_total: 12100, personal_total: 17200, is_closed: true, break_even_alcanzado: true }),
    ],
    currentMonth: simMonth({ id: 'sim-1', restaurant_id: 'sim', created_at: '', updated_at: '', month: 1, year: 2026, month_name: 'Enero', month_year: '2026-01', total_ingresos: 55000, ingresos_netos: 52700, ingresos_extra: 2300, resultado_neto: 12000, margen_neto: 21.8, materia_prima_total: 13500, personal_total: 18000, is_closed: true, break_even_dia: 15, break_even_alcanzado: true }),
  },
  stock: {
    isClosed: false,
    history: [
      simMonth({ id: 'h1', restaurant_id: 'sim', created_at: '', updated_at: '', month: 1, year: 2026, month_name: 'Enero', month_year: '2026-01', total_ingresos: 42000, resultado_neto: 4500, materia_prima_total: 14500, personal_total: 18000, margen_neto: 10.7, is_closed: false, break_even_alcanzado: true }),
      simMonth({ id: 'h2', restaurant_id: 'sim', created_at: '', updated_at: '', month: 12, year: 2025, month_name: 'Diciembre', month_year: '2025-12', total_ingresos: 55000, resultado_neto: 12000, materia_prima_total: 13500, personal_total: 18000, margen_neto: 21.8, is_closed: true, break_even_alcanzado: true }),
    ],
    currentMonth: simMonth({ id: 'sim-2', restaurant_id: 'sim', created_at: '', updated_at: '', month: 1, year: 2026, month_name: 'Enero', month_year: '2026-01', total_ingresos: 42000, ingresos_netos: 39700, ingresos_extra: 2300, resultado_neto: 4500, margen_neto: 10.7, materia_prima_total: 14500, personal_total: 18000, is_closed: false, break_even_dia: 28, break_even_alcanzado: true }),
  },
  labor: {
    isClosed: false,
    history: [
      simMonth({ id: 'h1', restaurant_id: 'sim', created_at: '', updated_at: '', month: 2, year: 2026, month_name: 'Febrero', month_year: '2026-02', total_ingresos: 35000, resultado_neto: 800, materia_prima_total: 11000, personal_total: 18000, margen_neto: 2.3, is_closed: false, break_even_alcanzado: false }),
      simMonth({ id: 'h2', restaurant_id: 'sim', created_at: '', updated_at: '', month: 1, year: 2026, month_name: 'Enero', month_year: '2026-01', total_ingresos: 48000, resultado_neto: 8500, materia_prima_total: 13800, personal_total: 18000, margen_neto: 17.7, is_closed: true, break_even_alcanzado: true }),
    ],
    currentMonth: simMonth({ id: 'sim-3', restaurant_id: 'sim', created_at: '', updated_at: '', month: 2, year: 2026, month_name: 'Febrero', month_year: '2026-02', total_ingresos: 35000, ingresos_netos: 32700, ingresos_extra: 2300, resultado_neto: 800, margen_neto: 2.3, materia_prima_total: 11000, personal_total: 18000, is_closed: false, break_even_dia: undefined, break_even_alcanzado: false }),
  },
  postseason: {
    isClosed: true,
    history: [
      simMonth({ id: 'h1', restaurant_id: 'sim', created_at: '', updated_at: '', month: 9, year: 2025, month_name: 'Septiembre', month_year: '2025-09', total_ingresos: 42000, resultado_neto: 6500, materia_prima_total: 12800, personal_total: 17500, margen_neto: 15.4, is_closed: true, break_even_alcanzado: true }),
    ],
    currentMonth: simMonth({ id: 'sim-4', restaurant_id: 'sim', created_at: '', updated_at: '', month: 9, year: 2025, month_name: 'Septiembre', month_year: '2025-09', total_ingresos: 42000, ingresos_netos: 39700, ingresos_extra: 2300, resultado_neto: 6500, margen_neto: 15.4, materia_prima_total: 12800, personal_total: 17500, is_closed: true, break_even_dia: 22, break_even_alcanzado: true }),
  }
}
