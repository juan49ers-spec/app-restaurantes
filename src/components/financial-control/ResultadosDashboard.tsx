"use client"

import { useState, useMemo, memo, useCallback } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
  FileDown,
  Lock,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Target,
  PieChart,
  Calculator,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  Package,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CuentaResultados } from "./CuentaResultados"
import { DesarrolloNegocio } from "./DesarrolloNegocio"
import { ProfitBridge } from "./ProfitBridge"
import { ExpenseIntelligenceWidget } from "./ExpenseIntelligenceWidget"
import type { DashboardData as ServerDashboardData } from "@/app/actions/resultados"
import type { FinancialResult, HistoricalData, VarianceAnalysis, BreakEvenData, MonthlyResult } from "@/types/resultados"

// ==========================================
// DATA & TYPES
// ==========================================

interface DashboardUiData {
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

// Datos vacíos para los hooks cuando no hay datos reales. 
// Los hooks necesitan ejecutarse siempre (reglas de React) pero
// el early return previene render con datos vacíos.
const EMPTY_DATA: DashboardUiData = {
  currentMonth: {
    month: '', year: 0, monthIndex: 0,
    ingresosNetos: 0, ingresosExtra: 0, totalIngresos: 0,
    personal: { sueldosNetos: 0, seguridadSocial: 0, irpf: 0, total: 0 },
    materiaPrima: { comida: 0, bebida: 0, variacionExistencias: 0, total: 0 },
    suministros: 0, mantenimiento: 0, marketing: 0,
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

interface DiagnosisCard {
  id: string
  type: 'alert' | 'info' | 'success'
  icon: React.ElementType
  title: string
  description: string
  metric?: string
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(val)

const formatPercent = (val: number): string =>
  `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`

// ==========================================
// SUB-COMPONENTS
// ==========================================

// KPI Card Component - Memoizado
interface KpiCardProps {
  title: string
  value: string
  subtitle: string
  trend?: number
  icon: React.ElementType
}

const KpiCard = memo(function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon
}: KpiCardProps) {
  const trendPositive = trend && trend >= 0

  return (
    <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 mb-1 truncate">{title}</p>
            <p className="text-lg font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-400">{subtitle}</p>
          </div>
          <div className="ml-3">
            <Icon className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={cn(
            "mt-2 text-xs font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
            trendPositive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          )}>
            {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPercent(trend)}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// Diagnosis Card - Memoizado
interface DiagnosisCardProps {
  card: DiagnosisCard
}

const DiagnosisCardComponent = memo(function DiagnosisCardComponent({ card }: DiagnosisCardProps) {
  const styles = {
    alert: {
      container: "bg-amber-50 border-amber-200",
      icon: "text-amber-600 bg-amber-100",
      title: "text-amber-900",
      desc: "text-amber-800"
    },
    info: {
      container: "bg-blue-50 border-blue-200",
      icon: "text-blue-600 bg-blue-100",
      title: "text-blue-900",
      desc: "text-blue-800"
    },
    success: {
      container: "bg-emerald-50 border-emerald-200",
      icon: "text-emerald-600 bg-emerald-100",
      title: "text-emerald-900",
      desc: "text-emerald-800"
    }
  }

  const style = styles[card.type]
  const Icon = card.icon

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("p-4 rounded-xl border", style.container)}
      role="article"
      aria-label={`Diagnóstico: ${card.title}`}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg flex-shrink-0", style.icon)}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-bold text-sm mb-1", style.title)}>
            {card.title}
          </h4>
          <p className={cn("text-xs leading-relaxed", style.desc)}>
            {card.description}
          </p>
          {card.metric && (
            <p className="text-xs font-bold mt-2 opacity-75">
              {card.metric}
            </p>
          )}
        </div>
      </div>
    </m.div>
  )
})

// Collapsible Section - Optimizado
interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}

const CollapsibleSection = memo(({
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const sectionId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        aria-expanded={isOpen ? "true" : "false"}
        aria-controls={sectionId}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neutral-500" aria-hidden="true" />
          <div className="text-left">
            <h3 className="font-bold text-sm text-neutral-900">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            id={sectionId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-neutral-100">
              {children}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
})
CollapsibleSection.displayName = "CollapsibleSection"

// ==========================================
// KPIs FOR INTELLIGENCE WIDGET
// ==========================================

function useIntelligenceKPIs(data: DashboardUiData) {
  return useMemo(() => {
    const current = data.currentMonth
    const totalRevenue = current.totalIngresos || 0

    // Suma real de TODOS los gastos operativos
    const allExpenses =
      current.personal.total +
      current.materiaPrima.total +
      current.suministros +
      current.mantenimiento +
      current.marketing +
      current.gastosExtra +
      current.financiaciones +
      current.inversiones

    // OpEx sin CAPEX (inversiones no son gasto operativo recurrente)
    const opExWithoutCapex = allExpenses - current.inversiones

    // Variación MoM real de gastos: compara OpEx actual vs mes anterior
    const prevExpenses =
      data.varianceAnalysis.previousMonth.gastosMateria +
      data.varianceAnalysis.previousMonth.gastosPersonal +
      data.varianceAnalysis.previousMonth.gastosFijos

    // Gastos comparables actuales (sin CAPEX, es decir, OpEx)
    const currentComparableExpenses = opExWithoutCapex
    const momExpenseVariation = prevExpenses > 0
      ? ((currentComparableExpenses - prevExpenses) / prevExpenses) * 100
      : 0

    return {
      totalExpenses: allExpenses,
      totalExpensesExcludingCAPEX: opExWithoutCapex,
      totalCashFlow: current.resultadoNeto,
      momVariation: momExpenseVariation,
      expenseToSalesRatio: totalRevenue > 0 ? (opExWithoutCapex / totalRevenue) * 100 : 0,
      personalRatio: totalRevenue > 0 ? (current.personal.total / totalRevenue) * 100 : 0,
      cogsRatio: totalRevenue > 0 ? (current.materiaPrima.total / totalRevenue) * 100 : 0
    }
  }, [data])
}

// ==========================================
// DIAGNOSIS ENGINE
// ==========================================

// Hook personalizado para diagnósticos - Memoizado
function useDiagnoses(data: DashboardUiData): DiagnosisCard[] {
  return useMemo(() => {
    const diagnoses: DiagnosisCard[] = []
    const current = data.currentMonth
    const prev = data.varianceAnalysis.previousMonth
    const lastYear = data.sameMonthLastYear

    // Guard: sin ingresos actuales, no hay diagnósticos posibles
    if (current.totalIngresos === 0) return diagnoses

    // REGLA A: Anomalía de Stock
    // Solo evalúa si hay datos del mes anterior para comparar
    if (prev.ingresos > 0 && prev.gastosMateria > 0) {
      const ventasCaen = current.totalIngresos < prev.ingresos
      const materiaSeMantiene = current.materiaPrima.total >= (prev.gastosMateria * 0.98)

      if (ventasCaen && materiaSeMantiene) {
        diagnoses.push({
          id: 'stock-anomaly',
          type: 'alert',
          icon: Package,
          title: 'Anomalía de Stock',
          description: 'Las ventas han caído, pero el gasto en materia prima se mantiene. Posible acumulación de stock no registrada o exceso de compras.',
          metric: `Materia prima: ${((current.materiaPrima.total / current.totalIngresos) * 100).toFixed(1)}% de ventas`
        })
      }
    }

    // REGLA B: Rigidez Laboral
    // Requiere ingresos y personal del mes anterior para calcular variaciones
    if (prev.ingresos > 0 && prev.gastosPersonal > 0) {
      const ventasCaenMucho = ((current.totalIngresos - prev.ingresos) / prev.ingresos) < -0.15
      const personalConstante = Math.abs((current.personal.total - prev.gastosPersonal) / prev.gastosPersonal) < 0.05

      if (ventasCaenMucho && personalConstante) {
        diagnoses.push({
          id: 'labor-rigidity',
          type: 'info',
          icon: Users,
          title: 'Rigidez Laboral',
          description: 'La caída de ventas no se ha compensado con ajustes en los turnos de personal, lo que está penalizando el margen este mes.',
          metric: `Personal: ${((current.personal.total / current.totalIngresos) * 100).toFixed(1)}% de ventas`
        })
      }
    }

    // REGLA C: Consolidación Estructural
    // Solo si hay datos del mismo mes del año anterior
    if (lastYear.ingresos > 0) {
      const crecimientoYoY = (current.totalIngresos - lastYear.ingresos) / lastYear.ingresos

      if (crecimientoYoY > 0.20) {
        diagnoses.push({
          id: 'structural-growth',
          type: 'success',
          icon: TrendingUp,
          title: 'Consolidación Estructural',
          description: `${current.month} ${current.year} supera ampliamente a ${current.month} del año anterior, confirmando que el negocio ha elevado su suelo de facturación.`,
          metric: `+${(crecimientoYoY * 100).toFixed(1)}% vs año anterior`
        })
      }
    }

    // REGLA D: Viabilidad Post-Temporada
    const esMesPostTemporada = current.monthIndex === 8 || current.monthIndex === 9
    const rentable = current.resultadoNeto > 0

    if (esMesPostTemporada && rentable) {
      diagnoses.push({
        id: 'post-season-viability',
        type: 'success',
        icon: Calendar,
        title: 'Viabilidad Post-Temporada',
        description: 'A pesar del fin de la temporada alta, el negocio mantiene rentabilidad demostrando viabilidad estructural fuera del verano.',
        metric: `Margen: ${current.margenNeto}% en ${current.month}`
      })
    }

    // EXTRA: Break-Even Temprano
    if (
      data.breakEvenData.alcanzado &&
      data.breakEvenData.diaBreakEven &&
      data.breakEvenData.diaBreakEven <= 20 &&
      data.breakEvenData.puntoEquilibrio > 0
    ) {
      diagnoses.push({
        id: 'break-early',
        type: 'success',
        icon: Target,
        title: 'Break-Even Temprano',
        description: `El punto de equilibrio se alcanzó el día ${data.breakEvenData.diaBreakEven}, dejando margen para acumular beneficios durante el resto del mes.`,
        metric: `Ventas: ${((data.breakEvenData.ventasActuales / data.breakEvenData.puntoEquilibrio - 1) * 100).toFixed(0)}% sobre el mínimo`
      })
    }

    return diagnoses
  }, [data])
}

// ==========================================
// MAIN COMPONENT
// ==========================================


export interface ResultadosDashboardProps {
  dashboardData?: ServerDashboardData | null
}

export function ResultadosDashboard({ dashboardData }: ResultadosDashboardProps) {
  const [isClosingMonth, setIsClosingMonth] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  // Data memoizada - Calcula comparativas desde el histórico real
  const data = useMemo(() => {
    if (!dashboardData?.currentMonth) return null

    const current = dashboardData.currentMonth
    const history = dashboardData.history || []

    // Buscar el mismo mes del año anterior en el histórico
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

    // Buscar el mes anterior en el histórico
    const prevMonthIndex = current.month === 1 ? 12 : current.month - 1
    const prevMonthYear = current.month === 1 ? current.year - 1 : current.year
    const prevMonth = history.find(
      (m: MonthlyResult) => m.month === prevMonthIndex && m.year === prevMonthYear
    )

    // Calcular variance analysis desde datos reales
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
    // Variación en puntos porcentuales absolutos (pp), no variación relativa.
    // Ej: pasar de 21.2% a 16.3% = -4.9pp. Consistente con análisis financiero estándar.
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

    // Break-even: personal se clasifica 100% como coste fijo.
    // En restauración hay componente variable (eventuales/extras), pero para un MVP
    // esta simplificación es conservadora — sobreestima el punto de equilibrio,
    // lo cual es preferible a subestimarlo.
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
          total: current.personal_total || 0
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
        // Suma explícita de categorías (consistente con KPI Gastos — fix #14)
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
  }, [dashboardData])

  // Resolved data — los hooks necesitan ejecutarse siempre (regla de React)
  // pero el early return garantiza que el JSX no se renderiza sin datos
  const safeData: DashboardUiData = data ?? EMPTY_DATA

  // Diagnósticos memoizados
  const diagnoses = useDiagnoses(safeData)

  // KPIs para Widget de Inteligencia
  const intelligenceKPIs = useIntelligenceKPIs(safeData)

  // Cálculos memoizados
  const isProfitable = useMemo(() => safeData.currentMonth.resultadoNeto >= 0, [safeData])

  const momChange = useMemo(() => {
    const current = safeData.currentMonth.resultadoNeto
    const previous = safeData.varianceAnalysis.previousMonth.resultado
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }, [safeData])

  const yoyChange = useMemo(() => {
    const lastYear = safeData.sameMonthLastYear.ingresos
    if (lastYear === 0) return 0
    return ((safeData.currentMonth.totalIngresos - lastYear) / lastYear) * 100
  }, [safeData])

  // Handler de cierre de mes — llama a server action real
  const handleCloseMonth = useCallback(async () => {
    if (!dashboardData?.currentMonth) return
    setIsClosingMonth(true)
    setCloseError(null)
    try {
      const { closeMonth } = await import("@/app/actions/resultados")
      const result = await closeMonth(
        dashboardData.currentMonth.restaurant_id,
        dashboardData.currentMonth.month_year
      )
      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      } else {
        setCloseError(result.error || 'Error desconocido al cerrar el mes')
        setTimeout(() => setCloseError(null), 4000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setCloseError(msg)
      setTimeout(() => setCloseError(null), 4000)
    } finally {
      setIsClosingMonth(false)
    }
  }, [dashboardData])

  // Empty state si no hay datos
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-neutral-100 rounded-2xl mb-4">
          <PieChart className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="font-bold text-lg text-neutral-900 mb-2">Sin datos de resultados</h3>
        <p className="text-sm text-neutral-500 max-w-sm">
          Registra ventas diarias y gastos operativos desde las pestañas de Facturación y Gastos para ver tus resultados aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-neutral-900">Resultados</h1>
          <p className="text-xs text-neutral-500">
            {data.currentMonth.month} {data.currentMonth.year} • Análisis completo
          </p>
        </div>
        <Button
          size="sm"
          className={cn(
            "rounded-lg gap-1.5 text-xs font-bold h-8",
            dashboardData?.isClosed ? "bg-emerald-600" : showSuccess ? "bg-emerald-600" : "bg-neutral-900"
          )}
          onClick={handleCloseMonth}
          disabled={isClosingMonth || dashboardData?.isClosed === true}
          aria-label={
            dashboardData?.isClosed
              ? "Mes ya cerrado"
              : isClosingMonth ? "Cerrando mes" : showSuccess ? "Mes cerrado correctamente" : "Cerrar mes y generar informe"
          }
        >
          {dashboardData?.isClosed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cerrado</span>
            </>
          ) : isClosingMonth ? (
            <>
              <Lock className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
              <span>Cerrando...</span>
            </>
          ) : showSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>¡Listo!</span>
            </>
          ) : (
            <>
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cerrar Mes</span>
            </>
          )}
        </Button>
      </header>

      {/* Mensaje de Error (Cierre de mes) */}
      {closeError && (
        <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl border border-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <p>{closeError}</p>
        </div>
      )}

      {/* Resultado Principal */}
      <section
        className={cn(
          "rounded-xl p-4 flex items-center justify-between",
          isProfitable
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-rose-50 border border-rose-200"
        )}
        aria-label="Resultado principal del mes"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              isProfitable ? "bg-emerald-200" : "bg-rose-200"
            )}
            aria-hidden="true"
          >
            {isProfitable ? (
              <TrendingUp className="w-5 h-5 text-emerald-700" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-700" />
            )}
          </div>
          <div>
            <p className="text-xs text-neutral-600 uppercase font-bold tracking-wider">
              {isProfitable ? 'Beneficio Neto' : 'Pérdida Neta'}
            </p>
            <p
              className={cn(
                "text-3xl font-black",
                isProfitable ? "text-emerald-700" : "text-rose-700"
              )}
              aria-label={`${formatCurrency(data.currentMonth.resultadoNeto)} euros`}
            >
              {formatCurrency(data.currentMonth.resultadoNeto)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">Margen</p>
          <p className="text-xl font-bold text-neutral-900">{data.currentMonth.margenNeto}%</p>
          <p
            className={cn(
              "text-xs font-bold",
              momChange >= 0 ? "text-emerald-600" : "text-rose-600"
            )}
            aria-label={`Variación mes anterior: ${formatPercent(momChange)}`}
          >
            {formatPercent(momChange)} vs mes ant.
          </p>
        </div>
      </section>

      {/* KPIs Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Indicadores clave">
        <KpiCard
          title="Ingresos"
          value={formatCurrency(data.currentMonth.totalIngresos)}
          subtitle="Total facturado"
          trend={data.varianceAnalysis.variacionVentas}
          icon={TrendingUp}
        />
        {/* Gastos: suma explícita de categorías, no derivación ingresos-resultado,
            para detectar discrepancias en la BD si las hubiera */}
        <KpiCard
          title="Gastos"
          value={formatCurrency(
            data.currentMonth.personal.total +
            data.currentMonth.materiaPrima.total +
            data.currentMonth.suministros +
            data.currentMonth.mantenimiento +
            data.currentMonth.marketing +
            data.currentMonth.gastosExtra +
            data.currentMonth.inversiones +
            data.currentMonth.financiaciones
          )}
          subtitle="Operativos + Inversiones"
          icon={AlertTriangle}
        />
        <KpiCard
          title="Break-Even"
          value={data.breakEvenData.diaBreakEven != null ? `Día ${data.breakEvenData.diaBreakEven}` : 'Sin dato'}
          subtitle={data.breakEvenData.alcanzado ? 'Alcanzado ✓' : data.breakEvenData.puntoEquilibrio > 0 ? `Meta: ${formatCurrency(data.breakEvenData.puntoEquilibrio)}` : 'Pendiente'}
          icon={Calendar}
        />

        <KpiCard
          title="vs Año Ant."
          value={formatPercent(yoyChange)}
          subtitle={formatCurrency(data.sameMonthLastYear.ingresos)}
          trend={yoyChange}
          icon={Target}
        />
      </section>

      {/* INTELLIGENCE WIDGET: Inteligencia de Gastos */}
      <section className="mt-6" aria-label="Inteligencia de Gastos con IA">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-500" aria-hidden="true" />
          <h2 className="font-bold text-sm text-neutral-900">Análisis Automático con IA</h2>
          <span className="text-xs text-neutral-400">Insights en tiempo real</span>
        </div>
        <ExpenseIntelligenceWidget
          kpis={intelligenceKPIs}
          insight={{
            summary: (() => {
              const ratio = intelligenceKPIs.expenseToSalesRatio
              const personal = intelligenceKPIs.personalRatio
              const materia = intelligenceKPIs.cogsRatio
              if (ratio === 0) return 'Sin datos suficientes para generar análisis.'
              const parts: string[] = []
              if (ratio > 85) parts.push(`Gastos al ${ratio.toFixed(0)}% de ventas — margen muy ajustado.`)
              else if (ratio > 70) parts.push(`Gastos operativos contenidos al ${ratio.toFixed(0)}% de ventas.`)
              else parts.push(`Estructura de gastos eficiente al ${ratio.toFixed(0)}% de ventas.`)
              if (personal > 35) parts.push(`Personal (${personal.toFixed(0)}%) por encima del benchmark del 33%.`)
              if (materia > 35) parts.push(`Materia prima (${materia.toFixed(0)}%) por encima del benchmark del 33%.`)
              if (personal <= 33 && materia <= 33) parts.push('Ambos ratios principales dentro de objetivo.')
              return parts.join(' ')
            })(),
            editable: false
          }}
        />
      </section>

      {/* Diagnóstico Inteligente */}
      {
        diagnoses.length > 0 && (
          <section aria-label="Diagnósticos inteligentes">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <h2 className="font-bold text-sm text-neutral-900">Diagnóstico Inteligente</h2>
              <span className="text-xs text-neutral-400">({diagnoses.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnoses.map((diagnosis) => (
                <DiagnosisCardComponent key={diagnosis.id} card={diagnosis} />
              ))}
            </div>
          </section>
        )
      }

      {/* Análisis Detallado */}
      <section className="space-y-3" aria-label="Análisis detallado">
        <CollapsibleSection
          title="Cuenta de Resultados"
          subtitle="Desglose completo de ingresos y gastos"
          icon={Calculator}
        >
          <div className="p-4">
            <CuentaResultados data={{
              ingresosNetos: data.currentMonth.ingresosNetos,
              ingresosExtra: data.currentMonth.ingresosExtra,
              personal: data.currentMonth.personal,
              materiaPrima: data.currentMonth.materiaPrima,
              suministros: data.currentMonth.suministros,
              mantenimiento: data.currentMonth.mantenimiento,
              marketing: data.currentMonth.marketing,
              gastosExtra: data.currentMonth.gastosExtra,
              inversiones: data.currentMonth.inversiones,
              financiaciones: data.currentMonth.financiaciones,
              resultadoNeto: data.currentMonth.resultadoNeto
            }} totalIngresos={data.currentMonth.totalIngresos} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Evolución y Comparativas"
          subtitle="Histórico 12 meses + Análisis de varianza"
          icon={PieChart}
        >
          <div className="p-4 space-y-4">
            <DesarrolloNegocio
              data={{
                months: data.historicalData.months,
                ingresos: data.historicalData.ingresos
              }}
              currentMonthIndex={Math.max(0, data.historicalData.months.length - 1)}
            />
            <ProfitBridge data={data.varianceAnalysis} />
          </div>
        </CollapsibleSection>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-400 pt-4">
        Datos calculados automáticamente de Facturación y Gastos •
        Actualizado {new Date().toLocaleDateString('es-ES')}
      </footer>
    </div >
  )
}

