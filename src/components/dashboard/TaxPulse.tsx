import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Landmark, TrendingUp, Download } from "lucide-react"
import type { FiscalMetrics } from "@/app/actions/financial-analysis"
import { getFiscalQuarterInfo, formatCurrency } from "@/lib/fiscal-utils"

interface TaxPulseProps {
    metrics: FiscalMetrics
}

export function TaxPulse({ metrics }: TaxPulseProps) {
    const isIvaPositive = metrics.netTaxPayable > 0

    // Fiscal Calendar Logic (Spain)
    const { nextDeadline, quarter, year } = getFiscalQuarterInfo()

    // Export Logic
    const handleExport = async () => {
        const XLSX = (await import('xlsx')).default

        const today = new Date()
        const data = [
            ["Informe Fiscal Estimado", `Generado: ${today.toLocaleDateString()}`],
            [""],
            ["Concepto", "Importe", "Notas"],
            ["IVA Repercutido", metrics.ivaCollected, `Ventas (${quarter})`],
            ["IVA Soportado", metrics.ivaDeductible, `Gastos (${quarter})`],
            ["IVA A Pagar (Neto)", metrics.netTaxPayable, "Modelo 303"],
            [""],
            ["Retenciones IRPF", metrics.irpfWithheld, "Modelo 111 (Profesionales/Alquileres)"],
            [""],
            ["TOTAL A RESERVAR", metrics.netTaxPayable + metrics.irpfWithheld, `Vence: ${nextDeadline}`]
        ]

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(data)

        // Basic formatting
        const wscols = [
            { wch: 25 },
            { wch: 15 },
            { wch: 30 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Fiscal_Export")
        XLSX.writeFile(wb, `Fiscal_Export_${quarter}_${year}.xlsx`)
    }

    return (
        <Card className="border-neutral-200 shadow-sm bg-white/50 backdrop-blur-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleExport}
                    className="text-xs bg-white border border-neutral-200 shadow-sm px-2 py-1 rounded-md text-neutral-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 flex items-center gap-1 transition-all"
                >
                    <Download className="w-3 h-3" />
                    Exportar
                </button>
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-slate-500" />
                    Posición Fiscal
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Modelos 303/111</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {/* IVA Breakdown */}
                    <div className="space-y-1">
                        <p className="text-xs text-neutral-500">IVA a Pagar (Neto)</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className={`text-2xl font-bold tracking-tight ${isIvaPositive ? 'text-slate-700' : 'text-emerald-600'}`}>
                                {formatCurrency(metrics.netTaxPayable)}
                            </h3>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-xs text-neutral-400 font-mono">
                            <div className="flex justify-between">
                                <span>Repercutido:</span>
                                <span className="text-neutral-600 font-medium">{formatCurrency(metrics.ivaCollected)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Soportado:</span>
                                <span className="text-neutral-600 font-medium">{formatCurrency(metrics.ivaDeductible)}</span>
                            </div>
                        </div>
                    </div>

                    {/* IRPF Breakdown */}
                    <div className="space-y-1">
                        <p className="text-xs text-neutral-500">Retenciones IRPF</p>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-700">
                            {formatCurrency(metrics.irpfWithheld)}
                        </h3>
                        {/* Only show deadline if there is tax to pay */}
                        {(metrics.netTaxPayable > 0 || metrics.irpfWithheld > 0) && (
                            <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block border border-orange-100">
                                Vence: <strong>{nextDeadline}</strong>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100">
                    <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-slate-600" />
                            <span>Provisión Total Sugerida:</span>
                        </div>
                        <strong className="text-slate-900 text-sm">
                            {formatCurrency(metrics.netTaxPayable + metrics.irpfWithheld)}
                        </strong>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
