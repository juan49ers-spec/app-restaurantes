import { useMemo } from "react"
import type { DashboardData as ServerDashboardData } from "@/app/actions/resultados"
import type { MonthlyResult } from "@/types/resultados"
import type { DashboardUiData } from "./types"
import { SIMULATED_SCENARIOS } from "./simulated-scenarios"

export function useResultadosData(
  dashboardData: ServerDashboardData | null | undefined,
  isSimulated: boolean,
  scenarioId: string
): DashboardUiData | null {
  return useMemo(() => {
    const dataSource = isSimulated ? SIMULATED_SCENARIOS[scenarioId] : dashboardData
    if (!dataSource?.currentMonth) return null

    const current = dataSource.currentMonth
    const history = dataSource.history || []

    const lastYearMonth = history.find(
      (m: MonthlyResult) => m.month === current.month && m.year === current.year - 1
    )

    const sameMonthLastYear = lastYearMonth
      ? {
        ingresos: lastYearMonth.total_ingresos || 0,
        resultado: lastYearMonth.resultado_neto || 0,
        gastosMateria: lastYearMonth.materia_prima_total || 0,
        gastosPersonal: lastYearMonth.personal_total || 0
      }
      : { ingresos: 0, resultado: 0, gastosMateria: 0, gastosPersonal: 0 }

    const prevMonthIndex = current.month === 1 ? 12 : current.month - 1
    const prevMonthYear = current.month === 1 ? current.year - 1 : current.year
    const prevMonth = history.find(
      (m: MonthlyResult) => m.month === prevMonthIndex && m.year === prevMonthYear
    )

    const prevIngresos = prevMonth?.total_ingresos || 0
    const prevResultado = prevMonth?.resultado_neto || 0
    const prevMargen = prevMonth?.margen_neto || 0
    const prevGastosMateria = prevMonth?.materia_prima_total || 0
    const prevGastosPersonal = prevMonth?.personal_total || 0
    const prevGastosFijos = (prevMonth?.suministros || 0) + (prevMonth?.mantenimiento || 0) + (prevMonth?.marketing || 0) + (prevMonth?.gastos_extra || 0) + (prevMonth?.financiaciones || 0)
    const currentGastosFijos = (current.suministros || 0) + (current.mantenimiento || 0) + (current.marketing || 0) + (current.gastos_extra || 0) + (current.financiaciones || 0)

    const variacionVentas = prevIngresos > 0
      ? ((current.total_ingresos - prevIngresos) / prevIngresos) * 100
      : 0
    const variacionMargen = (current.margen_neto || 0) - prevMargen

    const varianceAnalysis = {
      previousMonth: {
        resultado: prevResultado,
        ingresos: prevIngresos,
        margen: prevMargen,
        gastosMateria: prevGastosMateria,
        gastosPersonal: prevGastosPersonal,
        gastosFijos: prevGastosFijos
      },
      currentMonth: {
        resultado: current.resultado_neto || 0,
        ingresos: current.total_ingresos || 0,
        margen: current.margen_neto || 0
      },
      variacionVentas,
      variacionMargen,
      variacionGastosFijos: currentGastosFijos - prevGastosFijos,
      variacionInversiones: (current.inversiones || 0) - (prevMonth?.inversiones || 0),
      impactoTotal: prevResultado > 0
        ? (((current.resultado_neto || 0) - prevResultado) / prevResultado) * 100
        : 0
    }

    const totalIngresos = current.total_ingresos || 0
    const costoVariable = (current.materia_prima_total || 0)
    const costoFijo = (current.personal_total || 0) + currentGastosFijos
    const margenContribucionPct = totalIngresos > 0
      ? ((totalIngresos - costoVariable) / totalIngresos) * 100
      : 0
    const puntoEquilibrio = margenContribucionPct > 0
      ? (costoFijo / (margenContribucionPct / 100))
      : 0

    return {
      currentMonth: {
        month: current.month_name || 'Enero',
        year: current.year || 2026,
        monthIndex: (current.month || 1) - 1,
        ingresosNetos: current.ingresos_netos || 0,
        ingresosExtra: current.ingresos_extra || 0,
        totalIngresos,
        personal: {
          sueldosNetos: current.personal_sueldos_netos || 0,
          seguridadSocial: current.personal_seguridad_social || 0,
          irpf: current.personal_irpf || 0,
          total: current.personal_total || 0,
        },
        materiaPrima: {
          comida: current.materia_prima_comida || 0,
          bebida: current.materia_prima_bebida || 0,
          variacionExistencias: current.materia_prima_variacion_existencias || 0,
          total: current.materia_prima_total || 0
        },
        suministros: current.suministros || 0,
        mantenimiento: current.mantenimiento || 0,
        marketing: current.marketing || 0,
        gastosExtra: current.gastos_extra || 0,
        financiaciones: current.financiaciones || 0,
        inversiones: current.inversiones || 0,
        resultadoBruto: current.resultado_bruto || 0,
        resultadoNeto: current.resultado_neto || 0,
        margenNeto: current.margen_neto || 0,
        ratioPersonal: current.ratio_personal || 0,
        ratioMateriaPrima: current.ratio_materia_prima || 0,
        ratioGastosFijos: current.ratio_gastos_fijos || 0
      },
      historicalData: {
        months: history.map((m: MonthlyResult) => `${m.month_name} ${m.year}`).reverse(),
        ingresos: history.map((m: MonthlyResult) => m.total_ingresos || 0).reverse(),
        gastos: history.map((m: MonthlyResult) =>
          (m.personal_total || 0) + (m.materia_prima_total || 0) +
          (m.suministros || 0) + (m.mantenimiento || 0) + (m.marketing || 0) +
          (m.gastos_extra || 0) + (m.inversiones || 0) + (m.financiaciones || 0)
        ).reverse(),
        resultados: history.map((m: MonthlyResult) => m.resultado_neto || 0).reverse(),
        gastosMateria: history.map((m: MonthlyResult) => m.materia_prima_total || 0).reverse(),
        gastosPersonal: history.map((m: MonthlyResult) => m.personal_total || 0).reverse()
      },
      sameMonthLastYear,
      varianceAnalysis,
      breakEvenData: {
        puntoEquilibrio,
        diaBreakEven: current.break_even_dia || null,
        alcanzado: current.break_even_alcanzado || totalIngresos >= puntoEquilibrio,
        ventasActuales: totalIngresos,
        costesFijos: costoFijo,
        margenContribucion: margenContribucionPct
      }
    }
  }, [dashboardData, isSimulated, scenarioId])
}
