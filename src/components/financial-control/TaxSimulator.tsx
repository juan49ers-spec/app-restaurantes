"use client"

import { useState } from "react"
import { Calculator, ChevronDown, ChevronUp, Euro, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export function TaxSimulator() {
    const [isOpen, setIsOpen] = useState(false)
    const [amount, setAmount] = useState<number>(0)
    const [type, setType] = useState<'normal' | 'reducido' | 'super'>('normal')

    const getIvaRate = (t: typeof type) => {
        switch (t) {
            case 'normal': return 0.21
            case 'reducido': return 0.10
            case 'super': return 0.04
        }
    }

    const ivaRate = getIvaRate(type)
    const ivaAmount = amount * ivaRate
    const total = amount + ivaAmount
    const realCost = amount // In corporate tax, expense is deductible, and IVA is compensated.

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
        >
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg transition-colors", isOpen ? "bg-indigo-100 text-indigo-700" : "bg-neutral-100 text-neutral-600 group-hover:bg-indigo-50 group-hover:text-indigo-600")}>
                            <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-neutral-900">Simulador de Impacto Fiscal</h3>
                            <p className="text-xs text-neutral-500">Calcula el coste real de una inversión</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-neutral-400 group-hover:text-neutral-600">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="p-5 pt-0 border-t border-neutral-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Importe Base (Sin IVA)</Label>
                                <div className="relative group">
                                    <Euro className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <Input
                                        type="number"
                                        className="pl-9 h-10 text-sm font-medium border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                        placeholder="0.00"
                                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Tipo de IVA soportado</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant={type === 'normal' ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn("text-xs h-9", type === 'normal' ? "bg-indigo-600 hover:bg-indigo-700" : "hover:bg-neutral-50")}
                                        onClick={() => setType('normal')}
                                    >
                                        21%
                                    </Button>
                                    <Button
                                        variant={type === 'reducido' ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn("text-xs h-9", type === 'reducido' ? "bg-indigo-600 hover:bg-indigo-700" : "hover:bg-neutral-50")}
                                        onClick={() => setType('reducido')}
                                    >
                                        10%
                                    </Button>
                                    <Button
                                        variant={type === 'super' ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn("text-xs h-9", type === 'super' ? "bg-indigo-600 hover:bg-indigo-700" : "hover:bg-neutral-50")}
                                        onClick={() => setType('super')}
                                    >
                                        4%
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-50 rounded-xl p-5 space-y-4 border border-neutral-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-5">
                                <Calculator className="w-24 h-24" />
                            </div>

                            <div className="space-y-3 relative z-10">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-neutral-500 font-medium">IVA Deducible (Ahorro)</span>
                                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                        -{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(ivaAmount)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-neutral-500 font-medium">Total Factura (A pagar)</span>
                                    <span className="font-mono font-bold text-neutral-900">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total)}
                                    </span>
                                </div>

                                <div className="pt-3 mt-1 border-t border-neutral-200 flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5 text-indigo-500" />
                                        <span className="text-sm font-bold text-neutral-900">Coste Real Empresa</span>
                                    </div>
                                    <span className="text-lg font-mono font-bold text-indigo-600">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(realCost)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
