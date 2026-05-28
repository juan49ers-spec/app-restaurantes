"use client"

import { useState, useMemo, useCallback } from "react"
import {
  FileDown,
  Lock,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  Calculator,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CuentaResultados } from "./CuentaResultados"
import { DesarrolloNegocio } from "./DesarrolloNegocio"
import { ProfitBridge } from "./ProfitBridge"
import { ExpenseIntelligenceWidget } from "./ExpenseIntelligenceWidget"
import {
  CollapsibleSection,
  DiagnosisCardComponent,
  EMPTY_DATA,
  KpiCard,
  formatCurrency,
  formatPercent,
  useDiagnoses,
  useIntelligenceKPIs,
  type DashboardUiData,
} from "./ResultadosDashboardParts"
import type { DashboardData as ServerDashboardData } from "@/app/actions/resultados"
import type { MonthlyResult } from "@/types/resultados"

export interface ResultadosDashboardProps {
  dashboardData?: ServerDashboardData | null
}

export function ResultadosDashboard({ dashboardData }: ResultadosDashboardProps) {
  const [isClosingMonth, setIsClosingMonth] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!dashboardData?.currentMonth) return null

    const current = dashboardData.currentMonth
    const history = dashboardData.history || []

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

  const safeData: DashboardUiData = data ?? EMPTY_DATA

  const diagnoses = useDiagnoses(safeData)

  const intelligenceKPIs = useIntelligenceKPIs(safeData)

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

  const handleCloseMonth = useCallback(async () => {
    if (!dashboardData?.currentMonth) return
    setIsClosingMonth(true)
    setCloseError(null)
    try {
      const { closeMonth } = await import("@/app/actions/resultados")
      const result = await closeMonth(dashboardData.currentMonth.month_year)
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

      {closeError && (
        <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl border border-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <p>{closeError}</p>
        </div>
      )}

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
          <p className="text-xl font-bold text-neutral-900">{data.currentMonth.margenNeto.toFixed(2)}%</p>
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
              if (ratio > 85) parts.push(`Gastos al ${ratio.toFixed(2)}% de ventas — margen muy ajustado.`)
              else if (ratio > 70) parts.push(`Gastos operativos contenidos al ${ratio.toFixed(2)}% de ventas.`)
              else parts.push(`Estructura de gastos eficiente al ${ratio.toFixed(2)}% de ventas.`)
              if (personal > 35) parts.push(`Personal (${personal.toFixed(2)}%) por encima del benchmark del 33%.`)
              if (materia > 35) parts.push(`Materia prima (${materia.toFixed(2)}%) por encima del benchmark del 33%.`)
              if (personal <= 33 && materia <= 33) parts.push('Ambos ratios principales dentro de objetivo.')
              return parts.join(' ')
            })(),
            editable: false
          }}
        />
      </section>

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

      <footer className="text-center text-xs text-neutral-400 pt-4">
        Datos calculados automáticamente de Facturación y Gastos •
        Actualizado {new Date().toLocaleDateString('es-ES')}
      </footer>
    </div >
  )
}
