import { useMemo } from "react"
import { Package, Users, TrendingUp, Calendar, Target } from "lucide-react"
import type { DashboardUiData, DiagnosisCard } from "./types"

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
    const rentable = current.resultadoNeto > 0

    if (esMesPostTemporada && rentable) {
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
