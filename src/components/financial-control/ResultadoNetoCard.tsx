"use client"

import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResultadoNetoCardProps {
    resultadoNeto: number
    margenNeto: number
    ingresosTotales: number
}

export function ResultadoNetoCard({ resultadoNeto, margenNeto, ingresosTotales }: ResultadoNetoCardProps) {
    const isPositive = resultadoNeto >= 0

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val)

    return (
        <div className={cn(
            "rounded-3xl p-8 text-center border-4 transition-all",
            isPositive
                ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 shadow-lg shadow-emerald-100"
                : "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300 shadow-lg shadow-rose-100"
        )}>
            <div className="flex items-center justify-center gap-2 mb-4">
                <div className={cn(
                    "p-3 rounded-full",
                    isPositive ? "bg-emerald-200" : "bg-rose-200"
                )}>
                    <Wallet className={cn(
                        "w-8 h-8",
                        isPositive ? "text-emerald-700" : "text-rose-700"
                    )} />
                </div>
            </div>

            <h2 className={cn(
                "text-6xl font-black mb-2",
                isPositive ? "text-emerald-800" : "text-rose-800"
            )}>
                {formatCurrency(resultadoNeto)}
            </h2>

            <p className={cn(
                "text-lg font-bold mb-6",
                isPositive ? "text-emerald-700" : "text-rose-700"
            )}>
                {isPositive ? 'BENEFICIO NETO' : 'PÉRDIDA NETA'}
            </p>

            <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                isPositive ? "bg-emerald-200/50" : "bg-rose-200/50"
            )}>
                {isPositive ? (
                    <TrendingUp className="w-5 h-5 text-emerald-700" />
                ) : (
                    <TrendingDown className="w-5 h-5 text-rose-700" />
                )}
                <span className={cn(
                    "text-sm font-bold",
                    isPositive ? "text-emerald-800" : "text-rose-800"
                )}>
                    Margen Neto: {margenNeto.toFixed(2)}%
                </span>
            </div>

            <p className="text-xs text-neutral-500 mt-4">
                Sobre ingresos de {formatCurrency(ingresosTotales)}
            </p>
        </div>
    )
}
