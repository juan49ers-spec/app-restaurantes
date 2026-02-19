"use client"

import { useState, useMemo } from "react"
import { Edit2, Check, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Users } from "lucide-react"

interface IANarrativaProps {
    data: {
        ingresosActual: number
        ingresosAnterior: number
        ingresosAnoAnterior: number
        margenActual: number
        margenAnterior: number
        gastoMateriaPrima: number
        ventas: number
        gastoPersonal: number
        gastoPersonalAnterior: number
    }
}

export function IANarrativa({ data }: IANarrativaProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [approved, setApproved] = useState(false)

    // Calcular variaciones
    const variacionIngresosYoY = ((data.ingresosActual - data.ingresosAnoAnterior) / data.ingresosAnoAnterior) * 100
    const variacionIngresosMoM = ((data.ingresosActual - data.ingresosAnterior) / data.ingresosAnterior) * 100
    const variacionMargen = data.margenActual - data.margenAnterior
    const ratioMateriaPrima = (data.gastoMateriaPrima / data.ventas) * 100
    const variacionPersonal = ((data.gastoPersonal - data.gastoPersonalAnterior) / data.gastoPersonalAnterior) * 100

    // Generar conclusiones basadas en reglas
    const conclusiones = useMemo(() => {
        const parts: string[] = []

        // Regla 1: Crecimiento
        if (variacionIngresosYoY > 0) {
            parts.push("El negocio muestra un crecimiento estructural sólido. El dato de este mes supera al del año anterior, confirmando la consolidación de la clientela.")
        } else if (variacionIngresosYoY < -10) {
            parts.push("Se observa una contracción significativa respecto al año anterior. Es recomendable analizar las causas de esta caída estructural.")
        }

        // Regla 2: Rentabilidad vs Ventas
        if (variacionIngresosMoM < 0 && variacionMargen >= 0) {
            parts.push("Rentabilidad sostenida tras el fin de temporada. Pese a la caída de facturación, el negocio sigue siendo viable gracias a la eficiencia operativa.")
        }

        // Regla 3: Alerta de Inventario
        if (ratioMateriaPrima > 35) {
            parts.push("Anomalía en Materia Prima: El gasto no se ha ajustado al ritmo de las ventas. Posible exceso de stock o compras por encima de la demanda.")
        }

        // Regla 4: Rigidez Laboral
        if (variacionIngresosMoM < -15 && Math.abs(variacionPersonal) < 2) {
            parts.push("Plantilla consolidada pero poco flexible. La falta de ajuste de turnos en meses más flojos penaliza el margen.")
        }

        return parts.join(" ") || "El negocio mantiene una evolución estable durante este período."
    }, [variacionIngresosYoY, variacionIngresosMoM, variacionMargen, ratioMateriaPrima, variacionPersonal])

    const [customText, setCustomText] = useState(conclusiones)

    const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-blue-900">Análisis Inteligente</h3>
                </div>
                {!approved && (
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                        {isEditing ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                        {isEditing ? 'Guardar' : 'Editar'}
                    </button>
                )}
                {approved && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-lg text-xs font-bold text-emerald-700">
                        <Check className="w-3 h-3" />
                        Aprobado
                    </span>
                )}
            </div>

            {/* Indicadores de reglas aplicadas */}
            <div className="flex flex-wrap gap-2 mb-4">
                {variacionIngresosYoY > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-full text-[10px] font-bold text-emerald-700">
                        <TrendingUp className="w-3 h-3" />
                        Crecimiento
                    </span>
                )}
                {variacionIngresosYoY < 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-rose-100 rounded-full text-[10px] font-bold text-rose-700">
                        <TrendingDown className="w-3 h-3" />
                        Contracción {formatPercent(variacionIngresosYoY)}
                    </span>
                )}
                {ratioMateriaPrima > 35 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full text-[10px] font-bold text-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        Alerta Stock
                    </span>
                )}
                {variacionIngresosMoM < -15 && Math.abs(variacionPersonal) < 2 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-[10px] font-bold text-blue-700">
                        <Users className="w-3 h-3" />
                        Rigidez Laboral
                    </span>
                )}
            </div>

            {isEditing ? (
                <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full h-32 p-3 text-sm text-blue-900 bg-white rounded-lg border border-blue-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            ) : (
                <p className="text-sm text-blue-900 leading-relaxed">
                    {customText}
                </p>
            )}

            {!approved && !isEditing && (
                <button
                    onClick={() => setApproved(true)}
                    className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                    Aprobar Análisis
                </button>
            )}
        </div>
    )
}
