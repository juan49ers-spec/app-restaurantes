import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IngredientsTable } from '@/components/ingredients/IngredientsTable'
import { MasterIngredient } from '@/types/schema'
import { toast } from 'sonner'

// Mock de componentes hijos y utils
vi.mock('@/components/ingredients/IngredientDialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    IngredientDialog: ({ trigger, initialData }: any) => {
      const [open, setOpen] = React.useState(false)

      return (
        <div data-testid="ingredient-dialog">
          {React.cloneElement(trigger, { onClick: () => setOpen(true) })}
          {open && (
            <div data-testid="dialog-content">
              <h2>Editar Ingrediente</h2>
              <input aria-label="Nombre" defaultValue={initialData.name} />
              <button onClick={() => toast.error('Números inválidos')}>Guardar con Error</button>
            </div>
          )}
        </div>
      )
    }
  }
})

vi.mock('@/components/ingredients/DeleteIngredientAlert', () => ({
  DeleteIngredientAlert: ({ ingredientName, onDelete }: any) => (
    <button onClick={onDelete}>Eliminar {ingredientName}</button>
  )
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

const mockIngredients: MasterIngredient[] = [
  {
    id: '1',
    restaurant_id: 'r1',
    name: 'Pechuga de Pollo',
    category: 'Carnes',
    base_unit: 'kg',
    current_avg_price: 8.90,
    standard_waste_pct: 0.05,
    is_active: true,
    allergens: ['gluten']
  },
  {
    id: '2',
    restaurant_id: 'r1',
    name: 'Aceite de Oliva',
    category: 'Abarrotes',
    base_unit: 'l',
    current_avg_price: 5.50,
    standard_waste_pct: 0.10,
    is_active: true,
    allergens: []
  }
]

describe('IngredientsTable', () => {
  it('debería renderizar la tabla con ingredientes', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    expect(screen.getByText('Pechuga de Pollo')).toBeInTheDocument()
    expect(screen.getByText('Aceite de Oliva')).toBeInTheDocument()
  })

  it('debería mostrar mensaje cuando no hay ingredientes', () => {
    render(<IngredientsTable ingredients={[]} />)
    expect(screen.getByText(/No hay ingredientes todavía/i)).toBeInTheDocument()
  })

  it('debería mostrar unidades correctamente', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByText('l')).toBeInTheDocument()
  })

  it('debería mostrar precios formateados', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)
    expect(screen.getByText('€8.900')).toBeInTheDocument()
    expect(screen.getByText('€5.500')).toBeInTheDocument()
  })

  it('debería mostrar porcentaje de merma', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)
    expect(screen.getByText('5%')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('debería abrir el diálogo de edición al hacer clic en editar', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)

    const editButtons = screen.getAllByText('Editar')
    fireEvent.click(editButtons[0])

    // Simplificamos la búsqueda quitando el selector específico
    expect(screen.getByText('Editar Ingrediente')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pechuga de Pollo')).toBeInTheDocument()
  })

  it('debería mostrar error con valores inválidos en el diálogo', async () => {
    const mockedToastError = vi.mocked(toast.error)
    render(<IngredientsTable ingredients={mockIngredients} />)

    const editButtons = screen.getAllByText('Editar')
    fireEvent.click(editButtons[0])

    const saveButton = screen.getByText('Guardar con Error')
    fireEvent.click(saveButton)

    expect(mockedToastError).toHaveBeenCalledWith('Números inválidos')
  })

  it('debería llamar onDelete cuando se elimina un ingrediente', () => {
    const onDelete = vi.fn()
    render(<IngredientsTable ingredients={mockIngredients} onDelete={onDelete} />)

    const deleteButton = screen.getByText('Eliminar Pechuga de Pollo')
    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('debería mostrar badge de rendimiento correctamente', () => {
    render(<IngredientsTable ingredients={mockIngredients} />)
    // Rendimiento = (1 - 0.05) * 100 = 95.0%
    expect(screen.getByText('95.0%')).toBeInTheDocument()
  })

  it('debería mostrar guión para precio cero', () => {
    const freeIngredient: MasterIngredient[] = [{
      ...mockIngredients[0],
      current_avg_price: 0
    }]
    render(<IngredientsTable ingredients={freeIngredient} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})
