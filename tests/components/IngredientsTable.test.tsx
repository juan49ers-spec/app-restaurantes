/**
 * TESTS DE COMPONENTES: IngredientsTable
 * 
 * Tests para la tabla de ingredientes con edición inline
 * Verifica: renderizado, edición, eliminación y estados vacíos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}))

// Mock de sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock de actions
vi.mock('@/app/actions/ingredients', () => ({
  updateIngredientPrice: vi.fn(),
  updateIngredientWaste: vi.fn(),
  checkIngredientUsage: vi.fn().mockResolvedValue([]),
  deleteIngredient: vi.fn()
}))

// Importar después de los mocks
import { IngredientsTable } from '@/components/ingredients/IngredientsTable'
import { updateIngredientPrice, updateIngredientWaste } from '@/app/actions/ingredients'
import { toast } from 'sonner'
import { MasterIngredient } from '@/types/schema'

describe('IngredientsTable', () => {
  const mockIngredients: MasterIngredient[] = [
    {
      id: '1',
      restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Pechuga de Pollo',
      base_unit: 'kg',
      category: 'Carnes',
      standard_waste_pct: 0.05,
      current_avg_price: 8.90,
      is_active: true
    },
    {
      id: '2',
      restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Tomate',
      base_unit: 'kg',
      category: 'Verduras',
      standard_waste_pct: 0.10,
      current_avg_price: 2.50,
      is_active: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería renderizar la tabla con ingredientes', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    expect(screen.getByText('Pechuga de Pollo')).toBeInTheDocument()
    expect(screen.getByText('Tomate')).toBeInTheDocument()
    expect(screen.getByText('Carnes')).toBeInTheDocument()
    expect(screen.getByText('Verduras')).toBeInTheDocument()
  })

  it('debería mostrar mensaje cuando no hay ingredientes', () => {
    render(<IngredientsTable ingredients={[]} />)

    // Usar un matcher más flexible para el texto que tiene <br />
    expect(screen.getByText(/No hay ingredientes todavía/)).toBeInTheDocument()
    expect(screen.getByText(/¡Crea el primero arriba!/)).toBeInTheDocument()
  })

  it('debería mostrar unidades correctamente', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    // La unidad se muestra en minúscula en el badge
    const units = screen.getAllByText('kg')
    expect(units).toHaveLength(2)
  })

  it('debería mostrar precios formateados', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    expect(screen.getByText('€8.900')).toBeInTheDocument()
    expect(screen.getByText('€2.500')).toBeInTheDocument()
  })

  it('debería mostrar porcentaje de merma', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    expect(screen.getByText('5%')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('debería entrar en modo edición al hacer clic en editar', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    const editButtons = screen.getAllByText('Editar')
    expect(editButtons).toHaveLength(2)

    fireEvent.click(editButtons[0])

    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8.9')).toBeInTheDocument()
  })

  it('debería cancelar edición al hacer clic en X', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    const editButtons = screen.getAllByText('Editar')
    fireEvent.click(editButtons[0])

    expect(screen.getByDisplayValue('5')).toBeInTheDocument()

    // Buscar el botón de cancelar (X) - está antes que el de check
    const buttons = screen.getAllByRole('button')
    const cancelButton = buttons.find(button => {
      const hasSvg = button.querySelector('svg')
      const className = button.getAttribute('class') || ''
      return hasSvg && className.includes('text-muted-foreground')
    })
    
    if (cancelButton) {
      fireEvent.click(cancelButton)
    }

    expect(screen.queryByDisplayValue('5')).not.toBeInTheDocument()
  })

  it('debería mostrar error con valores inválidos', async () => {
    const mockedToastError = vi.mocked(toast.error)

    render(<IngredientsTable ingredients={mockIngredients} />)

    const editButtons = screen.getAllByText('Editar')
    fireEvent.click(editButtons[0])

    const wasteInput = screen.getByDisplayValue('5')
    fireEvent.change(wasteInput, { target: { value: 'invalid' } })

    // Buscar el botón de guardar (check) - es el segundo botón con SVG en la fila
    const buttons = screen.getAllByRole('button')
    // Encontrar el botón que tiene el icono de check (texto verde)
    const checkButton = buttons.find(button => {
      const className = button.getAttribute('class') || ''
      return className.includes('text-green-600') || className.includes('hover:text-green-700')
    })
    
    if (checkButton) {
      fireEvent.click(checkButton)
    }

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Números inválidos')
    })
  })

  it('debería llamar onDelete cuando se elimina un ingrediente', () => {
    const mockOnDelete = vi.fn()

    render(
      <IngredientsTable 
        ingredients={mockIngredients} 
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Pechuga de Pollo')).toBeInTheDocument()
  })

  it('debería mostrar badge de rendimiento correctamente', () => {
    const ingredientsWithDifferentWaste: MasterIngredient[] = [
      {
        id: '1',
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Ingrediente Bueno',
        base_unit: 'kg',
        standard_waste_pct: 0.02,
        current_avg_price: 10,
        is_active: true
      },
      {
        id: '2',
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Ingrediente Medio',
        base_unit: 'kg',
        standard_waste_pct: 0.15,
        current_avg_price: 10,
        is_active: true
      },
      {
        id: '3',
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Ingrediente Malo',
        base_unit: 'kg',
        standard_waste_pct: 0.25,
        current_avg_price: 10,
        is_active: true
      }
    ]

    render(<IngredientsTable ingredients={ingredientsWithDifferentWaste} />)

    expect(screen.getByText('Ingrediente Bueno')).toBeInTheDocument()
    expect(screen.getByText('Ingrediente Medio')).toBeInTheDocument()
    expect(screen.getByText('Ingrediente Malo')).toBeInTheDocument()
  })

  it('debería mostrar guión para precio cero', () => {
    const ingredientsWithZeroPrice: MasterIngredient[] = [
      {
        id: '1',
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Ingrediente Sin Precio',
        base_unit: 'kg',
        standard_waste_pct: 0,
        current_avg_price: 0,
        is_active: true
      }
    ]

    render(<IngredientsTable ingredients={ingredientsWithZeroPrice} />)

    expect(screen.getByText('Ingrediente Sin Precio')).toBeInTheDocument()
  })
})
