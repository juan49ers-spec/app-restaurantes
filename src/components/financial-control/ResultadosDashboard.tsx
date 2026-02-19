"use client"

import { useState, useMemo, memo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
    }
  }
  breakEvenData: BreakEvenData
}

// Mock data - Extraído fuera del componente para evitar re-creación
const MOCK_DATA: DashboardUiData = {
  currentMonth: {
    month: 'Enero',
    year: 2026,
    monthIndex: 0,
    ingresosNetos: 45000,
    ingresosExtra: 2300,
    totalIngresos: 47300,
    personal: { sueldosNetos: 12000, seguridadSocial: 3600, irpf: 2400, total: 18000 },
    materiaPrima: { comida: 9500, bebida: 4200, variacionExistencias: -300, total: 13400 },
    suministros: 1800,
    mantenimiento: 600,
    marketing: 1200,
    gastosExtra: 800,
    financiaciones: 900,
    inversiones: 2500,
    resultadoBruto: 10200,
    resultadoNeto: 7700,
    margenNeto: 16.3,
    ratioPersonal: 38.1,
    ratioMateriaPrima: 28.3,
    ratioGastosFijos: 33.6
  },
  historicalData: {
    months: ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'],
    ingresos: [35000, 38000, 42000, 45000, 48000, 55000, 52000, 42000, 40000, 46000, 52000, 47300],
    gastos: [30800, 32900, 35200, 37500, 39100, 43000, 41500, 35500, 34200, 37800, 41000, 39600],
    resultados: [4200, 5100, 6800, 7500, 8900, 12000, 10500, 6500, 5800, 8200, 11000, 7700],
    gastosMateria: [12500, 11800, 12100, 11900, 11500, 12800, 12200, 11600, 11400, 12000, 12600, 13400],
    gastosPersonal: [16500, 16800, 17200, 17500, 17800, 18500, 18200, 17500, 17400, 17600, 18100, 18000]
  },
  sameMonthLastYear: {
    ingresos: 38000,
    resultado: 5100,
    gastosMateria: 11800,
    gastosPersonal: 16800
  },
  varianceAnalysis: {
    previousMonth: {
      resultado: 11000,
      ingresos: 52000,
      margen: 21.2,
      gastosMateria: 12600,
      gastosPersonal: 18100
    },
    currentMonth: { resultado: 7700, ingresos: 47300, margen: 16.3 },
    variacionVentas: -9.0,
    variacionMargen: -4.9,
    variacionGastosFijos: 500,
    variacionInversiones: 1500,
    impactoTotal: -30.0
  },
  breakEvenData: {
    puntoEquilibrio: 35000,
    diaBreakEven: 22,
    alcanzado: true,
    ventasActuales: 47300,
    costesFijos: 22700,
    margenContribucion: 48.0
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
  isPositive?: boolean
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
    <motion.div
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
    </motion.div>
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

const CollapsibleSection = memo(function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const sectionId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      <button
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
          <motion.div
            id={sectionId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-neutral-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ==========================================
// KPIs FOR INTELLIGENCE WIDGET
// ==========================================

// ==========================================
// KPIs FOR INTELLIGENCE WIDGET
// ==========================================

function useIntelligenceKPIs(data: DashboardUiData) {
  return useMemo(() => {
    const current = data.currentMonth
    const totalRevenue = current.totalIngresos || 0

    return {
      totalExpenses: current.personal.total + current.materiaPrima.total || 0,
      totalExpensesExcludingCAPEX: current.personal.total + current.materiaPrima.total || 0,
      totalCashFlow: current.resultadoNeto || 0,
      momVariation: data.varianceAnalysis.variacionMargen || 0,
      expenseToSalesRatio: totalRevenue > 0 ? ((current.personal.total + current.materiaPrima.total) / totalRevenue) * 100 : 0,
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

    // REGLA A: Anomalía de Stock
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

    // REGLA B: Rigidez Laboral
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

    // REGLA C: Consolidación Estructural
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
    if (data.breakEvenData.alcanzado && data.breakEvenData.diaBreakEven && data.breakEvenData.diaBreakEven <= 20) {
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


export function ResultadosDashboard({ restaurantId: _restaurantId, dashboardData }: { restaurantId: string; dashboardData?: ServerDashboardData | null }) {
  const [isClosingMonth, setIsClosingMonth] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Data memoizada - Use real data if available, otherwise mock
  const data = useMemo(() => {
    if (dashboardData?.currentMonth) {
      const current = dashboardData.currentMonth

      return {
        currentMonth: {
          month: current.month_name || 'Enero',
          year: current.year || 2026,
          monthIndex: 0,
          ingresosNetos: current.ingresos_netos || 0,
          ingresosExtra: current.ingresos_extra || 0,
          totalIngresos: current.total_ingresos || 0,
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
          months: (dashboardData.history || []).map((m: MonthlyResult) => `${m.month_name} ${m.year}`).reverse() || [],
          ingresos: (dashboardData.history || []).map((m: MonthlyResult) => m.total_ingresos || 0).reverse() || [],
          gastos: (dashboardData.history || []).map((m: MonthlyResult) => (m.total_ingresos || 0) - (m.resultado_neto || 0)).reverse() || [],
          resultados: (dashboardData.history || []).map((m: MonthlyResult) => m.resultado_neto || 0).reverse() || [],
          gastosMateria: (dashboardData.history || []).map((m: MonthlyResult) => m.materia_prima_total || 0).reverse() || [],
          gastosPersonal: (dashboardData.history || []).map((m: MonthlyResult) => m.personal_total || 0).reverse() || []
        },
        sameMonthLastYear: { ingresos: 0, resultado: 0, gastosMateria: 0, gastosPersonal: 0 },
        varianceAnalysis: {
          previousMonth: { resultado: 0, ingresos: 0, margen: 0, gastosMateria: 0, gastosPersonal: 0 },
          currentMonth: { resultado: current.resultado_neto || 0, ingresos: current.total_ingresos || 0, margen: current.margen_neto || 0 },
          variacionVentas: 0,
          variacionMargen: 0,
          variacionGastosFijos: 0,
          variacionInversiones: 0,
          impactoTotal: 0
        },
        breakEvenData: {
          puntoEquilibrio: current.break_even_punto || 0,
          diaBreakEven: current.break_even_dia || 0,
          alcanzado: current.break_even_alcanzado || false,
          ventasActuales: current.total_ingresos || 0,
          costesFijos: 0,
          margenContribucion: 0
        }
      }
    }
    return MOCK_DATA
  }, [dashboardData])

  // Diagnósticos memoizados
  const diagnoses = useDiagnoses(data)

  // KPIs para Widget de Inteligencia
  const intelligenceKPIs = useIntelligenceKPIs(data)

  // Cálculos memoizados
  const isProfitable = useMemo(() => data.currentMonth.resultadoNeto >= 0, [data.currentMonth.resultadoNeto])

  const momChange = useMemo(() => {
    const current = data.currentMonth.resultadoNeto
    const previous = data.varianceAnalysis.previousMonth.resultado
    return ((current - previous) / previous) * 100
  }, [data.currentMonth.resultadoNeto, data.varianceAnalysis.previousMonth.resultado])

  const yoyChange = useMemo(() => {
    return ((data.currentMonth.totalIngresos - data.sameMonthLastYear.ingresos) / data.sameMonthLastYear.ingresos) * 100
  }, [data.currentMonth.totalIngresos, data.sameMonthLastYear.ingresos])

  // Handler memoizado
  const handleCloseMonth = useCallback(async () => {
    setIsClosingMonth(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsClosingMonth(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }, [])

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
            showSuccess ? "bg-emerald-600" : "bg-neutral-900"
          )}
          onClick={handleCloseMonth}
          disabled={isClosingMonth}
          aria-label={isClosingMonth ? "Cerrando mes" : showSuccess ? "Mes cerrado correctamente" : "Cerrar mes y generar informe"}
        >
          {isClosingMonth ? (
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
        <KpiCard
          title="Gastos"
          value={formatCurrency(data.currentMonth.totalIngresos - data.currentMonth.resultadoNeto)}
          subtitle="Operativos + Inversiones"
          icon={AlertTriangle}
        />
        <KpiCard
          title="Break-Even"
          value={`Día ${data.breakEvenData.diaBreakEven}`}
          subtitle={data.breakEvenData.alcanzado ? 'Alcanzado ✓' : 'Pendiente'}
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
            summary: 'Sistema de análisis automático con IA activado',
            editable: false
          }}
        />
      </section>

      {/* Diagnóstico Inteligente */}
      {diagnoses.length > 0 && (
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
      )}

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
            }} />
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
              currentMonthIndex={11}
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
    </div>
  )
}

