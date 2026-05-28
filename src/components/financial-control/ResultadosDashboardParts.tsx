"use client"

import { memo, useCallback, useMemo, useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Package,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
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

export const EMPTY_DATA: DashboardUiData = {
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

export const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val)

export const formatPercent = (val: number): string =>
  `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`

interface KpiCardProps {
  title: string
  value: string
  subtitle: string
  trend?: number
  icon: React.ElementType
}

export const KpiCard = memo(function KpiCard({
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

interface DiagnosisCardProps {
  card: DiagnosisCard
}

export const DiagnosisCardComponent = memo(function DiagnosisCardComponent({ card }: DiagnosisCardProps) {
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

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}

export const CollapsibleSection = memo(({
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
      <div id={sectionId}>
        <AnimatePresence initial={false}>
          {isOpen && (
            <m.div
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
    </div>
  )
})
CollapsibleSection.displayName = "CollapsibleSection"

export function useIntelligenceKPIs(data: DashboardUiData) {
  return useMemo(() => {
    const current = data.currentMonth
    const totalRevenue = current.totalIngresos || 0
    const allExpenses =
      current.personal.total +
      current.materiaPrima.total +
      current.suministros +
      current.mantenimiento +
      current.marketing +
      current.gastosExtra +
      current.financiaciones +
      current.inversiones
    const opExWithoutCapex = allExpenses - current.inversiones
    const prevExpenses =
      data.varianceAnalysis.previousMonth.gastosMateria +
      data.varianceAnalysis.previousMonth.gastosPersonal +
      data.varianceAnalysis.previousMonth.gastosFijos
    const momExpenseVariation = prevExpenses > 0
      ? ((opExWithoutCapex - prevExpenses) / prevExpenses) * 100
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

export function useDiagnoses(data: DashboardUiData): DiagnosisCard[] {
  return useMemo(() => {
    const diagnoses: DiagnosisCard[] = []
    const current = data.currentMonth
    const prev = data.varianceAnalysis.previousMonth
    const lastYear = data.sameMonthLastYear

    if (current.totalIngresos === 0) return diagnoses

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
          metric: `Materia prima: ${((current.materiaPrima.total / current.totalIngresos) * 100).toFixed(2)}% de ventas`
        })
      }
    }

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
          metric: `Personal: ${((current.personal.total / current.totalIngresos) * 100).toFixed(2)}% de ventas`
        })
      }
    }

    if (lastYear.ingresos > 0) {
      const crecimientoYoY = (current.totalIngresos - lastYear.ingresos) / lastYear.ingresos
      if (crecimientoYoY > 0.20) {
        diagnoses.push({
          id: 'structural-growth',
          type: 'success',
          icon: TrendingUp,
          title: 'Consolidación Estructural',
          description: `${current.month} ${current.year} supera ampliamente a ${current.month} del año anterior, confirmando que el negocio ha elevado su suelo de facturación.`,
          metric: `+${(crecimientoYoY * 100).toFixed(2)}% vs año anterior`
        })
      }
    }

    const esMesPostTemporada = current.monthIndex === 8 || current.monthIndex === 9
    if (esMesPostTemporada && current.resultadoNeto > 0) {
      diagnoses.push({
        id: 'post-season-viability',
        type: 'success',
        icon: Calendar,
        title: 'Viabilidad Post-Temporada',
        description: 'A pesar del fin de la temporada alta, el negocio mantiene rentabilidad demostrando viabilidad estructural fuera del verano.',
        metric: `Margen: ${current.margenNeto.toFixed(2)}% en ${current.month}`
      })
    }

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
        metric: `Ventas: ${((data.breakEvenData.ventasActuales / data.breakEvenData.puntoEquilibrio - 1) * 100).toFixed(2)}% sobre el mínimo`
      })
    }

    return diagnoses
  }, [data])
}
