/**
 * TESTS DE COMPONENTES: CreateIngredientDialog
 * 
 * Tests para el diálogo de creación de ingredientes
 * Verifica: renderizado, validación de formulario, envío y errores
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
  createIngredient: vi.fn()
}))

// Importar después de los mocks
import { IngredientDialog } from '@/components/ingredients/IngredientDialog'
import { createIngredient } from '@/app/actions/ingredients'
import { toast } from 'sonner'

describe('IngredientDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería renderizar el botón de nuevo ingrediente', () => {
    render(<IngredientDialog />)

    const button = screen.getByText('Nuevo Ingrediente')
    expect(button).toBeInTheDocument()
  })

  it('debería abrir el diálogo al hacer clic en el botón', () => {
    render(<IngredientDialog />)

    const button = screen.getByText('Nuevo Ingrediente')
    fireEvent.click(button)

    expect(screen.getByText('Crear Ingrediente')).toBeInTheDocument()
    expect(screen.getByText('Añade un nuevo ingrediente maestro a tu inventario base.')).toBeInTheDocument()
  })

  it('debería mostrar todos los campos del formulario', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    expect(screen.getByLabelText('Nombre del Producto')).toBeInTheDocument()
    expect(screen.getByLabelText('Unidad Base')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument()
    expect(screen.getByLabelText('Precio (€)')).toBeInTheDocument()
    // El campo de merma tiene una estructura compleja, buscamos por placeholder
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
  })

  it('debería tener valores por defecto correctos', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    const categoryInput = screen.getByLabelText('Categoría') as HTMLInputElement
    expect(categoryInput.value).toBe('General')

    const priceInput = screen.getByLabelText('Precio (€)') as HTMLInputElement
    expect(priceInput.value).toBe('0')
  })

  it('debería permitir ingresar datos en el formulario', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    const nameInput = screen.getByLabelText('Nombre del Producto')
    fireEvent.change(nameInput, { target: { value: 'Tomate Pera' } })
    expect((nameInput as HTMLInputElement).value).toBe('Tomate Pera')

    const categoryInput = screen.getByLabelText('Categoría')
    fireEvent.change(categoryInput, { target: { value: 'Verduras' } })
    expect((categoryInput as HTMLInputElement).value).toBe('Verduras')

    const priceInput = screen.getByLabelText('Precio (€)')
    fireEvent.change(priceInput, { target: { value: '2.50' } })
    expect((priceInput as HTMLInputElement).value).toBe('2.50')

    // El campo de merma no tiene label accesible directamente, buscamos por placeholder
    const wasteInput = screen.getByPlaceholderText('0')
    fireEvent.change(wasteInput, { target: { value: '10' } })
    // El componente formatea el valor a una decimal
    expect((wasteInput as HTMLInputElement).value).toBe('10.0')
  })

  it('debería mostrar selector de unidades', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    const unitSelect = screen.getByLabelText('Unidad Base')
    expect(unitSelect).toBeInTheDocument()
  })

  it('debería calcular y mostrar el yield', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    const wasteInput = screen.getByPlaceholderText('0')
    fireEvent.change(wasteInput, { target: { value: '10' } })

    expect(screen.getByText(/Yield: 90.0%/)).toBeInTheDocument()
  })

  it('debería tener botón de cancelar', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('debería cerrar el diálogo al hacer clic en cancelar', () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))
    expect(screen.getByText('Crear Ingrediente')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))

    expect(screen.queryByText('Crear Ingrediente')).not.toBeInTheDocument()
  })

  it('debería mostrar error si el nombre está vacío', async () => {
    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    const submitButton = screen.getByText('Guardar Ingrediente')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })

  it('debería enviar el formulario exitosamente', async () => {
    const mockedCreateIngredient = vi.mocked(createIngredient)
    const mockedToastSuccess = vi.mocked(toast.success)

    mockedCreateIngredient.mockResolvedValue({ success: true })

    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    // Llenar el formulario
    fireEvent.change(screen.getByLabelText('Nombre del Producto'), {
      target: { value: 'Tomate Pera' }
    })
    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'Verduras' }
    })
    fireEvent.change(screen.getByLabelText('Precio (€)'), {
      target: { value: '2.50' }
    })

    // Enviar formulario
    const submitButton = screen.getByText('Guardar Ingrediente')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockedCreateIngredient).toHaveBeenCalled()
      expect(mockedToastSuccess).toHaveBeenCalledWith('Ingrediente creado correctamente')
    })
  })

  it('debería mostrar error si falla la creación', async () => {
    const mockedCreateIngredient = vi.mocked(createIngredient)
    const mockedToastError = vi.mocked(toast.error)

    mockedCreateIngredient.mockResolvedValue({ success: false, error: 'Error en la base de datos' })

    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    // Llenar el formulario
    fireEvent.change(screen.getByLabelText('Nombre del Producto'), {
      target: { value: 'Tomate Pera' }
    })

    // Enviar formulario
    const submitButton = screen.getByText('Guardar Ingrediente')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Error en la base de datos')
    })
  })

  it('debería manejar errores inesperados', async () => {
    const mockedCreateIngredient = vi.mocked(createIngredient)
    const mockedToastError = vi.mocked(toast.error)

    mockedCreateIngredient.mockRejectedValue(new Error('Network error'))

    render(<IngredientDialog />)

    fireEvent.click(screen.getByText('Nuevo Ingrediente'))

    // Llenar el formulario
    fireEvent.change(screen.getByLabelText('Nombre del Producto'), {
      target: { value: 'Tomate Pera' }
    })

    // Enviar formulario
    const submitButton = screen.getByText('Guardar Ingrediente')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith('Error inesperado')
    })
  })
})
