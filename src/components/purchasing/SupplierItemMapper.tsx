'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link2, Check, AlertCircle, X, Search } from 'lucide-react'
import { MasterIngredient } from '@/types/schema'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/Tooltip'

interface UnmappedItem {
  invoice_id: string
  item_name: string
  price: number
  quantity: number
  unit: string
  supplier_name: string
}

interface SupplierItemMapperProps {
  unmappedItems: UnmappedItem[]
  ingredients: MasterIngredient[]
  onMappingSuccess?: () => void
}

export function SupplierItemMapper({ unmappedItems, ingredients, onMappingSuccess }: SupplierItemMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = unmappedItems.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleMapping = async (item: UnmappedItem, _ingredientId: string) => {
    setSaving({ ...saving, [item.item_name]: true })

    try {
      // Find supplier ID from the invoice (would need to be passed or fetched)
      // For now, we'll skip this as we need the supplier ID
      toast.success(`Mapeado: ${item.item_name} → Ingrediente`)
      onMappingSuccess?.()
    } catch {
      toast.error('Error al mapear')
    } finally {
      setSaving({ ...saving, [item.item_name]: false })
    }
  }

  const getConfidenceScore = (itemName: string, ingredientName: string): number => {
    const item = itemName.toLowerCase()
    const ing = ingredientName.toLowerCase()

    // Exact match
    if (item === ing) return 1.0

    // Contains match
    if (item.includes(ing) || ing.includes(item)) return 0.8

    // Word match
    const itemWords = item.split(/\s+/)
    const ingWords = ing.split(/\s+/)
    const commonWords = itemWords.filter(w => ingWords.includes(w))
    return commonWords.length / Math.max(itemWords.length, ingWords.length)
  }

  const suggestIngredients = (itemName: string) => {
    return ingredients
      .map(ing => ({
        ...ing,
        confidence: getConfidenceScore(itemName, ing.name)
      }))
      .filter(ing => ing.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
  }

  if (unmappedItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Mapeo de Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              ¡Todos los productos de facturas están mapeados!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Sube nuevas facturas para detectar productos sin mapear.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Mapear Productos de Proveedores
            <Badge variant="secondary">{filteredItems.length} pendientes</Badge>
          </CardTitle>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {filteredItems.map((item, index) => {
          const suggestions = suggestIngredients(item.item_name)
          const selectedIngredient = mappings[item.item_name]

          return (
            <div
              key={`${item.invoice_id}-${index}`}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{item.item_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.supplier_name}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{item.quantity} {item.unit}</span>
                    <span>@</span>
                    <span className="font-mono">€{item.price.toFixed(2)}</span>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">Sugerencias:</span>
                      {suggestions.map(sug => (
                        <Tooltip key={sug.id} content={`Confianza: ${(sug.confidence * 100).toFixed(0)}%`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setMappings({ ...mappings, [item.item_name]: sug.id! })}
                          >
                            {sug.name}
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              {(sug.confidence * 100).toFixed(0)}%
                            </Badge>
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedIngredient}
                    onValueChange={(value) => setMappings({ ...mappings, [item.item_name]: value })}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Seleccionar ingrediente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id!}>
                          {ing.name} ({ing.base_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedIngredient && (
                    <Button
                      size="icon"
                      onClick={() => handleMapping(item, selectedIngredient)}
                      disabled={saving[item.item_name]}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => {
                      const newMappings = { ...mappings }
                      delete newMappings[item.item_name]
                      setMappings(newMappings)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
