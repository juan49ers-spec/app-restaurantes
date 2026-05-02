/**
 * TESTS DE COMPONENTES: DeleteIngredientAlert
 * 
 * Tests para el componente de diálogo de eliminación de ingredientes
 * Verifica: renderizado, interacciones, estados de carga y callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock modules (declared before imports)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/app/actions/ingredients', () => ({
  deleteIngredient: vi.fn(),
  checkIngredientUsage: vi.fn()
}))

// Importar después de los mocks
import { DeleteIngredientAlert } from '@/components/ingredients/DeleteIngredientAlert'
import { deleteIngredient, checkIngredientUsage } from '@/app/actions/ingredients'
import { toast } from 'sonner'

describe('DeleteIngredientAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería renderizar el botón de eliminar', () => {
    render(
      <DeleteIngredientAlert 
        ingredientId="123" 
        ingredientName="Pechuga de Pollo"
      />
    )

    // El botón debería estar visible
    const deleteButton = screen.getByRole('button')
    expect(deleteButton).toBeInTheDocument()
  })

  it('debería abrir el diálogo al hacer clic en el botón', async () => {
    const mockedCheckIngredientUsage = vi.mocked(checkIngredientUsage)
    mockedCheckIngredientUsage.mockResolvedValueOnce([])

    render(
      <DeleteIngredientAlert 
        ingredientId="123" 
        ingredientName="Pechuga de Pollo"
      />
    )

    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    // Esperar a que se abra el diálogo
    await waitFor(() => {
      expect(screen.getByText('Eliminar Ingrediente')).toBeInTheDocument()
    })
  })

  it('debería mostrar advertencia cuando hay recetas asociadas', async () => {
    const mockedCheckIngredientUsage = vi.mocked(checkIngredientUsage)
    mockedCheckIngredientUsage.mockResolvedValueOnce(['Pollo al Horno'])

    render(
      <DeleteIngredientAlert 
        ingredientId="123" 
        ingredientName="Pechuga de Pollo"
      />
    )

    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Conflicto de Dependencias')).toBeInTheDocument()
    })
  })

  it('debería permitir eliminación cuando no hay recetas', async () => {
    const mockedCheckIngredientUsage = vi.mocked(checkIngredientUsage)
    const mockedDeleteIngredient = vi.mocked(deleteIngredient)
    const mockedToastSuccess = vi.mocked(toast.success)
    
    mockedCheckIngredientUsage.mockResolvedValueOnce([])
    mockedDeleteIngredient.mockResolvedValueOnce({ success: true })

    const mockOnDelete = vi.fn()

    render(
      <DeleteIngredientAlert 
        ingredientId="123" 
        ingredientName="Pechuga de Pollo"
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Sí, eliminar ingrediente')).toBeInTheDocument()
    })

    // Hacer clic en confirmar eliminación
    const confirmButton = screen.getByText('Sí, eliminar ingrediente')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockedDeleteIngredient).toHaveBeenCalledWith('123')
      expect(mockedToastSuccess).toHaveBeenCalledWith('Ingrediente eliminado')
      expect(mockOnDelete).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('debería mostrar error si falla la eliminación', async () => {
    const mockedCheckIngredientUsage = vi.mocked(checkIngredientUsage)
    const mockedDeleteIngredient = vi.mocked(deleteIngredient)
    const mockedToastError = vi.mocked(toast.error)
    
    mockedCheckIngredientUsage.mockResolvedValueOnce([])
    mockedDeleteIngredient.mockResolvedValueOnce({ success: false, error: 'Error de base de datos' })

    render(
      <DeleteIngredientAlert 
        ingredientId="123" 
        ingredientName="Pechuga de Pollo"
      />
    )

    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Sí, eliminar ingrediente')).toBeInTheDocument()
    })

    const confirmButton = screen.getByText('Sí, eliminar ingrediente')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Error de base de datos')
    }, { timeout: 3000 })
  })

  it('debería respetar el estado disabled', () => {
    render(
      <DeleteIngredientAlert 
        ingredientId="123" 
        ingredientName="Pechuga de Pollo"
        disabled={true}
      />
    )

    const deleteButton = screen.getByRole('button')
    expect(deleteButton).toBeDisabled()
  })
})
