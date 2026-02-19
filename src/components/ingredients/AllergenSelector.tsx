'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/Tooltip'
import { AlertCircle, Check } from 'lucide-react'

// 14 alérgenos UE según Reglamento (UE) 1169/2011
export const ALLERGENS = [
  { id: 'gluten', name: 'Gluten', icon: '🌾', description: 'Trigo, centeno, cebada, avena' },
  { id: 'crustaceos', name: 'Crustáceos', icon: '🦐', description: 'Marisco con caparazón' },
  { id: 'huevos', name: 'Huevos', icon: '🥚', description: 'Huevos de ave' },
  { id: 'pescado', name: 'Pescado', icon: '🐟', description: 'Pescado y productos pesqueros' },
  { id: 'cacahuetes', name: 'Cacahuetes', icon: '🥜', description: 'Maní o peanuts' },
  { id: 'soja', name: 'Soja', icon: '🫘', description: 'Productos de soja' },
  { id: 'lacteos', name: 'Lácteos', icon: '🥛', description: 'Leche y derivados' },
  { id: 'frutos_cascara', name: 'Frutos de cáscara', icon: '🌰', description: 'Nueces, almendras, avellanas' },
  { id: 'apio', name: 'Apio', icon: '🥬', description: 'Apio y productos derivados' },
  { id: 'mostaza', name: 'Mostaza', icon: '🌭', description: 'Mostaza y semillas' },
  { id: 'sesamo', name: 'Sésamo', icon: '🫘', description: 'Semillas de sésamo' },
  { id: 'sulfitos', name: 'Sulfitos', icon: '⚗️', description: 'SO2 y sulfitos >10mg/kg' },
  { id: 'moluscos', name: 'Moluscos', icon: '🦪', description: 'Mejillones, ostras, calamares' },
  { id: 'altramuces', name: 'Altramuces', icon: '🌱', description: 'Altramuces y productos' },
] as const

export type AllergenId = typeof ALLERGENS[number]['id']

interface AllergenSelectorProps {
  selectedAllergens: AllergenId[]
  onChange: (allergens: AllergenId[]) => void
  disabled?: boolean
  showSummary?: boolean
}

export function AllergenSelector({ 
  selectedAllergens, 
  onChange, 
  disabled = false,
  showSummary = true 
}: AllergenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleAllergen = (allergenId: AllergenId) => {
    if (disabled) return
    
    const newSelection = selectedAllergens.includes(allergenId)
      ? selectedAllergens.filter(id => id !== allergenId)
      : [...selectedAllergens, allergenId]
    
    onChange(newSelection)
  }

  const selectedAllergenData = ALLERGENS.filter(a => selectedAllergens.includes(a.id))

  return (
    <div className="space-y-3">
      {showSummary && (
        <div className="flex flex-wrap gap-2">
          {selectedAllergenData.length === 0 ? (
            <span className="text-sm text-muted-foreground italic">
              Ningún alérgeno seleccionado
            </span>
          ) : (
            selectedAllergenData.map(allergen => (
              <Tooltip key={allergen.id} content={allergen.description}>
                <Badge 
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => !disabled && toggleAllergen(allergen.id)}
                >
                  <span className="mr-1">{allergen.icon}</span>
                  {allergen.name}
                  {!disabled && <span className="ml-1 text-xs">×</span>}
                </Badge>
              </Tooltip>
            ))
          )}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            {selectedAllergenData.length > 0 
              ? `Modificar alérgenos (${selectedAllergenData.length})` 
              : 'Seleccionar alérgenos'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Seleccionar Alérgenos
            </DialogTitle>
            <DialogDescription>
              Marca los alérgenos presentes según el Reglamento (UE) 1169/2011
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {ALLERGENS.map(allergen => {
              const isSelected = selectedAllergens.includes(allergen.id)
              
              return (
                <button
                  key={allergen.id}
                  type="button"
                  onClick={() => toggleAllergen(allergen.id)}
                  className={`
                    relative flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-2xl">{allergen.icon}</span>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-sm">{allergen.name}</span>
                  <span className="text-xs text-muted-foreground mt-1 leading-tight">
                    {allergen.description}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedAllergenData.length} alérgeno(s) seleccionado(s)
            </div>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => onChange([])}
              >
                Limpiar todo
              </Button>
              <Button 
                type="button"
                onClick={() => setIsOpen(false)}
              >
                Aceptar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para mostrar alérgenos en modo solo lectura
interface AllergenBadgesProps {
  allergens: AllergenId[] | string[]
  compact?: boolean
}

export function AllergenBadges({ allergens, compact = false }: AllergenBadgesProps) {
  if (allergens.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Sin alérgenos declarados
      </span>
    )
  }

  const allergenData = ALLERGENS.filter(a => (allergens as string[]).includes(a.id))

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {allergenData.slice(0, 3).map(a => (
          <Tooltip key={a.id} content={a.name}>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {a.icon}
            </Badge>
          </Tooltip>
        ))}
        {allergenData.length > 3 && (
          <Tooltip content={allergenData.slice(3).map(a => a.name).join(', ')}>
            <Badge variant="outline" className="text-xs">
              +{allergenData.length - 3}
            </Badge>
          </Tooltip>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {allergenData.map(a => (
        <Tooltip key={a.id} content={a.description}>
          <Badge variant="secondary" className="text-xs">
            {a.icon} {a.name}
          </Badge>
        </Tooltip>
      ))}
    </div>
  )
}
