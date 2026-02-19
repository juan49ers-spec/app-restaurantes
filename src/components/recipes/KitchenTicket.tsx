import { RecipeIngredientInput } from "@/hooks/useRecipeCalculator"
import { ChefHat, Clock, Users } from "lucide-react"

interface Props {
    recipeName: string
    ingredients: RecipeIngredientInput[]
    yields?: number // Servings
}

export function KitchenTicket({ recipeName, ingredients, yields = 1 }: Props) {
    return (
        <>
            <style type="text/css" media="print">
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #kitchen-ticket, #kitchen-ticket * {
                        visibility: visible;
                    }
                    #kitchen-ticket {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        box-shadow: none;
                        border: none;
                    }
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                }
                `}
            </style>
            <div id="kitchen-ticket" className="w-[80mm] bg-white text-black p-4 font-mono text-sm border shadow-sm print:shadow-none print:border-none print:w-full">
                <div className="text-center mb-4">
                    <div className="flex justify-center mb-2">
                        <ChefHat className="h-8 w-8 text-slate-800" />
                    </div>
                    <h1 className="text-xl font-bold uppercase leading-tight">{recipeName}</h1>
                    <div className="text-xs text-slate-500 mt-1">Ficha de Producción</div>
                </div>

                <div className="flex justify-between items-center py-2 border-y border-dashed border-slate-300 mb-4">
                    <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{yields} Raciones</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>-- min</span>
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 border-b pb-1 mb-2">
                        <span>Ingrediente</span>
                        <span>Cant. Neta</span>
                    </div>
                    {ingredients.map((ing) => (
                        <div key={ing.id} className="flex justify-between items-baseline py-1 border-b border-slate-100 last:border-0">
                            <span className="font-semibold">{ing.name}</span>
                            <span>{(ing.quantity_net).toFixed(3)} {ing.base_unit}</span>
                        </div>
                    ))}
                </div>

                {/* TODO: Add allergens support - requires DB migration
                <div className="mb-4">
                    <h3 className="font-bold text-xs uppercase mb-2">Alérgenos</h3>
                    {allergens && allergens.length > 0 ? (
                        <AllergenBadges allergens={allergens} />
                    ) : (
                        <div className="text-[10px] text-slate-400 italic">No se han detectado alérgenos (Verificar etiquetas)</div>
                    )}
                </div>
                */}

                <div className="mb-6">
                    <h3 className="font-bold text-xs uppercase mb-2">Notas</h3>
                    <div className="h-20 border border-slate-200 rounded-md bg-slate-50" />
                </div>

                <div className="text-[10px] text-center text-slate-400">
                    Generado por ControlHub
                    <br />
                    {new Date().toLocaleDateString()}
                </div>
            </div>
        </>
    )
}
