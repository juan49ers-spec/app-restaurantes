"use client"

import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaxVaultProps {
    ivaSuperReducido: number
    ivaReducidoCobrado: number
    ivaGeneralCobrado: number
    ivaSoportado: number
    retenciones: number
}

export function TaxVault({
    ivaSuperReducido,
    ivaReducidoCobrado,
    ivaGeneralCobrado,
    ivaSoportado,
    retenciones
}: TaxVaultProps) {
    const totalIvaRepercutido = ivaSuperReducido + ivaReducidoCobrado + ivaGeneralCobrado
    const saldoIVA = totalIvaRepercutido - ivaSoportado
    const totalAPagar = saldoIVA + retenciones
    const isPositivo = totalAPagar > 0

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                        Tipos de IVA (España)
                    </h3>
                    {isPositivo ? (
                        <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded">
                            A PAGAR
                        </span>
                    ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                            A COMPENSAR
                        </span>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-neutral-700">IVA Repercutido</p>
                        <span className="text-[10px] text-neutral-500 font-medium">(Cobrado a clientes)</span>
                    </div>

                    {ivaSuperReducido > 0 && (
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div>
                                <span className="text-xs text-neutral-600">4% - Alimentos básicos</span>
                            </div>
                            <span className="text-sm font-bold text-neutral-900">{formatCurrency(ivaSuperReducido)}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div>
                            <span className="text-xs text-neutral-600">10% - Restauración general</span>
                        </div>
                        <span className="text-sm font-bold text-neutral-900">{formatCurrency(ivaReducidoCobrado)}</span>
                    </div>

                    {ivaGeneralCobrado > 0 && (
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div>
                                <span className="text-xs text-neutral-600">21% - Alcohol</span>
                            </div>
                            <span className="text-sm font-bold text-neutral-900">{formatCurrency(ivaGeneralCobrado)}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-2 bg-neutral-100 rounded-lg font-bold">
                        <span className="text-xs text-neutral-800">Total IVA Repercutido</span>
                        <span className="text-sm text-neutral-900">{formatCurrency(totalIvaRepercutido)}</span>
                    </div>

                    <div className="flex items-start gap-2 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 mt-2">
                        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 leading-snug">
                            <strong>Tipos aplicados:</strong> 4% (Alimentos básicos), 10% (Comidas y bebidas sin alcohol), 21% (Alcohol y tabaco).
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-700">IVA Soportado</span>
                            <span className="text-[10px] text-neutral-500 font-normal">(Pagado)</span>
                        </div>
                        <p className="text-[10px] text-neutral-500">Deducible en gastos y compras</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">- {formatCurrency(ivaSoportado)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-neutral-200">
                    <span className="text-xs font-bold text-neutral-700">Saldo IVA:</span>
                    <span className={cn(
                        "text-sm font-bold",
                        saldoIVA >= 0 ? "text-neutral-900" : "text-emerald-600"
                    )}>
                        {saldoIVA >= 0 ? '' : '- '}{formatCurrency(Math.abs(saldoIVA))}
                    </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                    <div>
                        <span className="text-xs text-neutral-700">Retenciones IRPF</span>
                        <p className="text-[10px] text-neutral-500">Nóminas y Alquileres</p>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">+ {formatCurrency(retenciones)}</span>
                </div>

                <div className={cn(
                    "p-4 rounded-xl text-center border-2",
                    isPositivo
                        ? "bg-rose-50 border-rose-200"
                        : "bg-emerald-50 border-emerald-200"
                )}>
                    <p className="text-xs text-neutral-600 mb-1">
                        {isPositivo ? 'Total a ingresar' : 'Total a compensar'}
                    </p>
                    <p className={cn(
                        "text-3xl font-black",
                        isPositivo ? "text-rose-700" : "text-emerald-700"
                    )}>
                        {formatCurrency(Math.abs(totalAPagar))}
                    </p>
                </div>
            </div>
        </div>
    )
}
