"use client"

import { useState } from "react"
import { Check, FileText, ChevronDown, ChevronUp, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentChecklistProps {
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
}

interface ChecklistItem {
    id: string
    label: string
    description: string
    tip?: string
    required: boolean
    checked: boolean
}

interface Category {
    name: string
    items: ChecklistItem[]
}

export function DocumentChecklist({ quarter }: DocumentChecklistProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    
    const [categories, setCategories] = useState<Category[]>([
        {
            name: "Ingresos",
            items: [
                { 
                    id: '1', 
                    label: 'Zetas diarias de TPV', 
                    description: 'Cierres de caja de todos los días del trimestre',
                    tip: 'Debe coincidir con lo declarado en el 303',
                    required: true, 
                    checked: false 
                },
            ]
        },
        {
            name: "Compras y Gastos",
            items: [
                { 
                    id: '2', 
                    label: 'Facturas de proveedores', 
                    description: 'Alimentos, bebidas y materia prima',
                    tip: 'Incluye facturas de 4%, 10% y 21%',
                    required: true, 
                    checked: false 
                },
                { 
                    id: '3', 
                    label: 'Factura de alquiler', 
                    description: 'Arrendamiento del local con retención IRPF',
                    tip: 'Debe incluir retención del 19% (Modelo 115)',
                    required: true, 
                    checked: false 
                },
                { 
                    id: '4', 
                    label: 'Suministros', 
                    description: 'Luz, agua, gas y otros servicios básicos',
                    required: true, 
                    checked: false 
                },
            ]
        },
        {
            name: "Personal",
            items: [
                { 
                    id: '5', 
                    label: 'Nóminas y Seguridad Social', 
                    description: 'Recibos de nómina y pago de SS de todos los empleados',
                    tip: 'Incluye retenciones IRPF (Modelo 111)',
                    required: true, 
                    checked: false 
                },
            ]
        },
        {
            name: "Otros",
            items: [
                { 
                    id: '6', 
                    label: 'Servicios', 
                    description: 'Teléfono, internet, limpieza, mantenimiento',
                    required: false, 
                    checked: false 
                },
                { 
                    id: '7', 
                    label: 'Formación y otros gastos', 
                    description: 'Cursos, material de oficina, equipamiento',
                    required: false, 
                    checked: false 
                },
            ]
        },
    ])
    
    const toggleItem = (categoryIdx: number, itemId: string) => {
        setCategories(categories.map((cat, cIdx) => {
            if (cIdx !== categoryIdx) return cat
            return {
                ...cat,
                items: cat.items.map(item => 
                    item.id === itemId ? { ...item, checked: !item.checked } : item
                )
            }
        }))
    }
    
    const allItems = categories.flatMap(cat => cat.items)
    const completedCount = allItems.filter(item => item.checked).length
    const requiredItems = allItems.filter(item => item.required)
    const requiredCompleted = requiredItems.filter(item => item.checked).length
    const progress = Math.round((completedCount / allItems.length) * 100)
    
    const allRequiredCompleted = requiredCompleted === requiredItems.length
    const missingRequired = requiredItems.filter(item => !item.checked)
    
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        allRequiredCompleted ? "bg-emerald-100" : "bg-neutral-100"
                    )}>
                        <FileText className={cn(
                            "w-4 h-4",
                            allRequiredCompleted ? "text-emerald-600" : "text-neutral-600"
                        )} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-neutral-900">Documentación {quarter}</h3>
                        <p className="text-xs text-neutral-500">
                            {requiredCompleted}/{requiredItems.length} obligatorios
                            {completedCount > requiredCompleted && ` · ${completedCount - requiredCompleted} opcionales`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    allRequiredCompleted ? "bg-emerald-500" : "bg-neutral-800"
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-neutral-500">{progress}%</span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                </div>
            </button>
            
            {isExpanded && (
                <div className="border-t border-neutral-100">
                    {/* Alerta si faltan documentos obligatorios */}
                    {missingRequired.length > 0 && (
                        <div className="p-3 bg-amber-50 border-b border-amber-100">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-800">
                                        Faltan {missingRequired.length} documentos obligatorios
                                    </p>
                                    <p className="text-[10px] text-amber-700 mt-0.5">
                                        Sin estos documentos no podrás presentar correctamente el Modelo 303
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Lista por categorías */}
                    <div className="p-4 space-y-4">
                        {categories.map((category, catIdx) => (
                            <div key={category.name}>
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                    {category.name}
                                </h4>
                                <div className="space-y-2">
                                    {category.items.map((item) => (
                                        <label
                                            key={item.id}
                                            className="flex items-start gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <div className="pt-0.5">
                                                <div className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                    item.checked 
                                                        ? "bg-neutral-900 border-neutral-900" 
                                                        : "border-neutral-300 bg-white"
                                                )}>
                                                    {item.checked && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={() => toggleItem(catIdx, item.id)}
                                                className="sr-only"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-sm",
                                                        item.checked ? "text-neutral-500 line-through" : "text-neutral-700"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                    {item.required && (
                                                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                                            Obligatorio
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-0.5">
                                                    {item.description}
                                                </p>
                                                {item.tip && (
                                                    <div className="flex items-start gap-1 mt-1">
                                                        <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-blue-600">
                                                            {item.tip}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {allRequiredCompleted && (
                        <div className="px-4 pb-4">
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <p className="text-xs text-emerald-800 font-medium text-center">
                                    ✅ Documentación completa. ¡Listo para presentar el Modelo 303!
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
