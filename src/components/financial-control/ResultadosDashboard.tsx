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
  Sparkles,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CuentaResultados } from "./CuentaResultados"
import { DesarrolloNegocio } from "./DesarrolloNegocio"
import { IANarrativa } from "./IANarrativa"
import { AiInsightsPanel } from "@/components/shared/AiInsightsPanel"
import type { DashboardData as ServerDashboardData } from "@/app/actions/resultados"

import { EMPTY_DATA } from "./resultados/types"
import { SIMULATED_SCENARIOS } from "./resultados/simulated-scenarios"
import { useResultadosData } from "./resultados/useResultadosData"
import { useDiagnoses } from "./resultados/useDiagnoses"
import { KpiCard } from "./resultados/KpiCard"
import { DiagnosisCardComponent } from "./resultados/DiagnosisCardComponent"
import { formatCurrency, formatPercent } from "./resultados/formatters"

export interface ResultadosDashboardProps {
  dashboardData?: ServerDashboardData | null
}

export function ResultadosDashboard({ dashboardData }: ResultadosDashboardProps) {
  const [isClosingMonth, setIsClosingMonth] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isSimulated, setIsSimulated] = useState(false)
  const [scenarioId, setScenarioId] = useState<string>('success')

  const data = useResultadosData(dashboardData, isSimulated, scenarioId)
  const safeData = data ?? EMPTY_DATA
  const diagnoses = useDiagnoses(safeData)
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

  const handleExportPDF = useCallback(async () => {
    if (!data) return
    setIsExporting(true)
    try {
      const { exportPnLToPDF } = await import('@/lib/export-utils')
      const current = data.currentMonth
      const totalExpenses =
        current.personal.total + current.materiaPrima.total +
        current.suministros + current.mantenimiento + current.marketing +
        current.gastosExtra + current.inversiones + current.financiaciones
      const expenseLabels: Record<string, string> = {
        personal: 'Personal', materiaPrima: 'Materia Prima', suministros: 'Suministros',
        mantenimiento: 'Mantenimiento', marketing: 'Marketing',
        gastosExtra: 'Otros Gastos', inversiones: 'Inversiones', financiaciones: 'Financiaciones'
      }
      const expenseItems = [
        { id: 'personal', amount: current.personal.total },
        { id: 'materiaPrima', amount: current.materiaPrima.total },
        { id: 'suministros', amount: current.suministros },
        { id: 'mantenimiento', amount: current.mantenimiento },
        { id: 'marketing', amount: current.marketing },
        { id: 'gastosExtra', amount: current.gastosExtra },
        { id: 'inversiones', amount: current.inversiones },
        { id: 'financiaciones', amount: current.financiaciones },
      ].filter(e => e.amount > 0)

      await exportPnLToPDF(
        {
          revenue: { total: current.totalIngresos, dineIn: current.ingresosNetos, takeout: 0, delivery: 0 },
          totalExpenses,
          netProfit: current.resultadoNeto,
          netProfitMargin: current.margenNeto,
          reportExpenses: expenseItems.map(e => ({
            id: e.id,
            label: expenseLabels[e.id] || e.id,
            amount: e.amount,
            pct: current.totalIngresos > 0 ? (e.amount / current.totalIngresos) * 100 : 0
          })),
          chartData: []
        },
        `${current.month} ${current.year}`,
        'Chamaca Antojería Mexicana'
      )
    } catch (err) {
      console.error('Error exportando PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }, [data])

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

  if (!data && !isSimulated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-neutral-100 rounded-2xl mb-4">
          <PieChart className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="font-bold text-lg text-neutral-900 mb-2">Sin datos de resultados</h3>
        <p className="text-sm text-neutral-500 max-w-sm mb-6">
          Registra ventas diarias y gastos operativos desde las pestañas de Facturación y Gastos para ver tus resultados aquí.
        </p>
        <Button
          onClick={() => setIsSimulated(true)}
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 font-bold px-6"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Simular Datos de Ejemplo
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4 pb-12 max-w-5xl mx-auto">
      {/* Banner de Simulación */}
      {isSimulated && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-3 text-white flex items-center justify-between shadow-lg mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs">Modo Simulación Activo</p>
              <p className="text-[10px] opacity-80 text-violet-100">Visualizando escenarios de negocio hipotéticos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Seleccionar escenario de simulación"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg text-xs font-bold px-2 py-1 outline-none cursor-pointer hover:bg-white/20 transition-colors"
            >
              <option value="success" className="text-neutral-900">Escenario: Éxito Total</option>
              <option value="stock" className="text-neutral-900">Escenario: Anomalía de Stock</option>
              <option value="labor" className="text-neutral-900">Escenario: Rigidez Laboral</option>
              <option value="postseason" className="text-neutral-900">Escenario: Post-Temporada</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSimulated(false)}
              className="h-7 text-[10px] font-bold bg-white text-violet-600 hover:bg-neutral-100 rounded-lg"
            >
              Salir
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-neutral-900">Resultados</h1>
          <p className="text-xs text-neutral-500">
            {data.currentMonth.month} {data.currentMonth.year} • Análisis completo {isSimulated && <span className="text-violet-500 font-bold ml-1">(SIMULADO)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="rounded-lg gap-1.5 text-xs font-bold h-8 border-neutral-200 bg-white hover:bg-neutral-50"
            aria-label="Exportar informe PDF"
          >
            {isExporting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FileDown className="w-3.5 h-3.5" />}
            <span>{isExporting ? 'Generando...' : 'PDF'}</span>
          </Button>
        <Button
          size="sm"
          className={cn(
            "rounded-lg gap-1.5 text-xs font-bold h-8",
            (isSimulated ? SIMULATED_SCENARIOS[scenarioId].isClosed : dashboardData?.isClosed) ? "bg-emerald-600" : showSuccess ? "bg-emerald-600" : "bg-neutral-900"
          )}
          onClick={handleCloseMonth}
          disabled={isClosingMonth || (isSimulated ? SIMULATED_SCENARIOS[scenarioId].isClosed : dashboardData?.isClosed === true)}
          aria-label={
            (isSimulated ? SIMULATED_SCENARIOS[scenarioId].isClosed : dashboardData?.isClosed)
              ? "Mes ya cerrado"
              : isClosingMonth ? "Cerrando mes" : showSuccess ? "Mes cerrado correctamente" : "Cerrar mes y generar informe"
          }
        >
          {(isSimulated ? SIMULATED_SCENARIOS[scenarioId].isClosed : dashboardData?.isClosed) ? (
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
        </div>
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

      {/* Cuenta de Resultados */}
      <section aria-label="Cuenta de resultados">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-neutral-500" aria-hidden="true" />
          <h2 className="font-bold text-sm text-neutral-900">Cuenta de Resultados</h2>
          <span className="text-xs text-neutral-400">{data.currentMonth.month} {data.currentMonth.year}</span>
        </div>
        <CuentaResultados data={{
          ingresosNetos: data.currentMonth.ingresosNetos,
          ingresosExtra: data.currentMonth.ingresosExtra,
          personal: data.currentMonth.personal,
          materiaPrima: data.currentMonth.materiaPrima,
          suministros: data.currentMonth.suministros,
          suministrosFijos: data.currentMonth.suministrosFijos,
          suministrosVariables: data.currentMonth.suministrosVariables,
          mantenimiento: data.currentMonth.mantenimiento,
          marketing: data.currentMonth.marketing,
          gastosExtra: data.currentMonth.gastosExtra,
          inversiones: data.currentMonth.inversiones,
          financiaciones: data.currentMonth.financiaciones,
          resultadoNeto: data.currentMonth.resultadoNeto,
          inventoryValue: data.currentMonth.inventoryValue,
        }} totalIngresos={data.currentMonth.totalIngresos} />
      </section>

      {/* Evolución histórica */}
      <section aria-label="Evolución de ingresos">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-neutral-500" aria-hidden="true" />
          <h2 className="font-bold text-sm text-neutral-900">Evolución de Ingresos Netos</h2>
        </div>
        <DesarrolloNegocio
          data={{
            months: data.historicalData.months,
            ingresos: data.historicalData.ingresos
          }}
          currentMonthIndex={Math.max(0, data.historicalData.months.length - 1)}
        />
      </section>

      {/* Diagnóstico Inteligente */}
      {diagnoses.length > 0 && (
        <section aria-label="Diagnósticos inteligentes">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <h2 className="font-bold text-sm text-neutral-900">Alertas</h2>
            <span className="text-xs text-neutral-400">({diagnoses.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diagnoses.map((diagnosis) => (
              <DiagnosisCardComponent key={diagnosis.id} card={diagnosis} />
            ))}
          </div>
        </section>
      )}

      {/* Análisis Narrativo con IA */}
      <section aria-label="Análisis inteligente narrativo">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <h2 className="font-bold text-sm text-neutral-900">Análisis</h2>
          <span className="text-xs text-neutral-400">Generado automáticamente · editable</span>
        </div>
        <IANarrativa
          data={{
            ingresosActual: data.currentMonth.totalIngresos,
            ingresosAnterior: data.varianceAnalysis.previousMonth.ingresos || 1,
            ingresosAnoAnterior: data.sameMonthLastYear.ingresos || 1,
            margenActual: data.currentMonth.margenNeto,
            margenAnterior: data.varianceAnalysis.previousMonth.margen,
            gastoMateriaPrima: data.currentMonth.materiaPrima.total,
            ventas: data.currentMonth.totalIngresos || 1,
            gastoPersonal: data.currentMonth.personal.total,
            gastoPersonalAnterior: data.varianceAnalysis.previousMonth.gastosPersonal || 1,
          }}
        />
      </section>

      {/* AI Insights Panel */}
      {dashboardData?.currentMonth?.restaurant_id && (
        <section aria-label="Notas contextuales e insights IA">
          <AiInsightsPanel
            restaurantId={dashboardData.currentMonth.restaurant_id}
            moduleName="Resultados"
            periodKey={`${data.currentMonth.month} ${data.currentMonth.year}`}
            metricsData={{
              totalIngresos: data.currentMonth.totalIngresos,
              resultadoNeto: data.currentMonth.resultadoNeto,
              margenNeto: data.currentMonth.margenNeto,
              ratioPersonal: data.currentMonth.personal.total / (data.currentMonth.totalIngresos || 1) * 100,
              ratioMateriaPrima: data.currentMonth.materiaPrima.total / (data.currentMonth.totalIngresos || 1) * 100,
              momChange,
              yoyChange,
              breakEven: data.breakEvenData,
              varianceAnalysis: {
                variacionVentas: data.varianceAnalysis.variacionVentas,
                variacionMargen: data.varianceAnalysis.variacionMargen,
                variacionGastosFijos: data.varianceAnalysis.variacionGastosFijos,
              },
            }}
          />
        </section>
      )}
    </div>
  )
}
