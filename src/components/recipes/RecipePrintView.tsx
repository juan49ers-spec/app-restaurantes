'use client'

import { useRef } from 'react'
import { Recipe } from '@/types/schema'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, Download, Share2 } from 'lucide-react'

interface RecipePrintViewProps {
  recipe: Recipe & {
    ingredients: Array<{
      id: string
      ingredient_name: string
      quantity_gross: number
      quantity_net: number
      unit: string
      cost_per_unit: number
      total_cost: number
      waste_pct: number
    }>
  }
  restaurantName?: string
}

export function RecipePrintView({ recipe, restaurantName }: RecipePrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = printRef.current?.innerHTML
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha Técnica - ${recipe.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 1.125rem; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .mb-6 { margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
            .border { border: 1px solid #ccc; }
            .p-4 { padding: 16px; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const totalCost = recipe.ingredients.reduce((sum, ing) => sum + ing.total_cost, 0)
  const foodCostPct = recipe.selling_price ? (totalCost / recipe.selling_price) * 100 : 0
  const margin = recipe.selling_price ? ((recipe.selling_price - totalCost) / recipe.selling_price) * 100 : 0

  // TODO: Add allergens support - requires DB migration
  // const allAllergens = recipe.ingredients
  //   .flatMap(ing => ing.allergens || [])
  //   .filter((value, index, self) => self.indexOf(value) === index)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          PDF
        </Button>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Compartir
        </Button>
      </div>

      {/* Print Content */}
      <div ref={printRef} className="bg-white p-8 print:p-0">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              {restaurantName && (
                <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">
                  {restaurantName}
                </p>
              )}
              <h1 className="text-3xl font-bold text-black">{recipe.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Código: {recipe.id?.slice(0, 8).toUpperCase()} | 
                Fecha: {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2 border-black">
                FICHA TÉCNICA
              </Badge>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Precio Venta</p>
            <p className="text-2xl font-bold text-black">
              €{recipe.selling_price?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="border border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Coste Total</p>
            <p className="text-2xl font-bold text-black">
              €{totalCost.toFixed(2)}
            </p>
          </div>
          <div className="border border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Food Cost</p>
            <p className="text-2xl font-bold text-black">
              {foodCostPct.toFixed(1)}%
            </p>
          </div>
          <div className="border border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Margen</p>
            <p className={`text-2xl font-bold ${margin >= 70 ? 'text-green-600' : margin >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {margin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Información General */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-bold text-black mb-2 border-b border-gray-300 pb-1">
              INFORMACIÓN GENERAL
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Raciones:</td>
                  <td className="py-2 font-medium">{recipe.yields || 1}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Tiempo Prep:</td>
                  <td className="py-2 font-medium">{recipe.prep_time_minutes || 0} min</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Coste/Ración:</td>
                  <td className="py-2 font-medium">
                    €{(totalCost / (recipe.yields || 1)).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Margen Objetivo:</td>
                  <td className="py-2 font-medium">{recipe.target_margin_pct || 70}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-bold text-black mb-2 border-b border-gray-300 pb-1">
              NOTAS
            </h3>
            <p className="text-sm text-gray-500 italic">Ficha técnica generada automáticamente</p>
          </div>
        </div>

        {/* Escandallo */}
        <div className="mb-6">
          <h3 className="font-bold text-black mb-3 border-b-2 border-black pb-2">
            ESCANDALLO
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="text-left py-2 px-2">Nº</th>
                <th className="text-left py-2 px-2">Ingrediente</th>
                <th className="text-right py-2 px-2">Cant. Bruta</th>
                <th className="text-right py-2 px-2">Cant. Neta</th>
                <th className="text-right py-2 px-2">Merma</th>
                <th className="text-right py-2 px-2">€/Unidad</th>
                <th className="text-right py-2 px-2">€ Total</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ing, index) => (
                <tr key={ing.id} className="border-b border-gray-200">
                  <td className="py-2 px-2 text-gray-500">{index + 1}</td>
                  <td className="py-2 px-2 font-medium">{ing.ingredient_name}</td>
                  <td className="py-2 px-2 text-right">
                    {ing.quantity_gross.toFixed(3)} {ing.unit}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {ing.quantity_net.toFixed(3)} {ing.unit}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {(ing.waste_pct * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-right">
                    €{ing.cost_per_unit.toFixed(3)}
                  </td>
                  <td className="py-2 px-2 text-right font-medium">
                    €{ing.total_cost.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td colSpan={6} className="py-3 px-2 text-right">
                  COSTE TOTAL
                </td>
                <td className="py-3 px-2 text-right text-lg">
                  €{totalCost.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
          <p>Ficha técnica generada automáticamente por ControlHub</p>
          <p className="mt-1">© {new Date().getFullYear()} {restaurantName || 'Restaurante'} - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
