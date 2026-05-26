import type { FinancialResult, HistoricalData, VarianceAnalysis, BreakEvenData } from "@/types/resultados"

export interface DashboardUiData {
  currentMonth: FinancialResult & { monthIndex: number }
  historicalData: HistoricalData & {
    gastosMateria: number[]
    gastosPersonal: number[]
  }
  sameMonthLastYear: {
    ingresos: number
    resultado: number
    gastosMateria: number
    gastosPersonal: number
  }
  varianceAnalysis: VarianceAnalysis & {
    previousMonth: {
      resultado: number
      ingresos: number
      margen: number
      gastosMateria: number
      gastosPersonal: number
      gastosFijos: number
    }
  }
  breakEvenData: BreakEvenData
}

export interface DiagnosisCard {
  id: string
  type: 'alert' | 'info' | 'success'
  icon: React.ElementType
  title: string
  description: string
  metric?: string
}

export const EMPTY_DATA: DashboardUiData = {
  currentMonth: {
    month: '', year: 0, monthIndex: 0,
    ingresosNetos: 0, ingresosExtra: 0, totalIngresos: 0,
    personal: { sueldosNetos: 0, seguridadSocial: 0, irpf: 0, total: 0 },
    materiaPrima: { comida: 0, bebida: 0, variacionExistencias: 0, total: 0 },
    suministros: 0,
    mantenimiento: 0, marketing: 0,
    gastosExtra: 0, financiaciones: 0, inversiones: 0,
    resultadoBruto: 0, resultadoNeto: 0, margenNeto: 0,
    ratioPersonal: 0, ratioMateriaPrima: 0, ratioGastosFijos: 0
  },
  historicalData: {
    months: [], ingresos: [], gastos: [], resultados: [],
    gastosMateria: [], gastosPersonal: []
  },
  sameMonthLastYear: { ingresos: 0, resultado: 0, gastosMateria: 0, gastosPersonal: 0 },
  varianceAnalysis: {
    previousMonth: { resultado: 0, ingresos: 0, margen: 0, gastosMateria: 0, gastosPersonal: 0, gastosFijos: 0 },
    currentMonth: { resultado: 0, ingresos: 0, margen: 0 },
    variacionVentas: 0, variacionMargen: 0,
    variacionGastosFijos: 0, variacionInversiones: 0, impactoTotal: 0
  },
  breakEvenData: {
    puntoEquilibrio: 0, diaBreakEven: null, alcanzado: false,
    ventasActuales: 0, costesFijos: 0, margenContribucion: 0
  }
}
