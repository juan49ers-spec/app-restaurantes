import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipesCsvImportPanel } from '@/components/recipes/RecipesCsvImportPanel'

const validateRecipesCsvImport = vi.fn()
const importRecipesCsv = vi.fn()

vi.mock('@/app/actions/recipes', () => ({
  validateRecipesCsvImport: (input: unknown) => validateRecipesCsvImport(input),
  importRecipesCsv: (input: unknown) => importRecipesCsv(input),
}))

describe('RecipesCsvImportPanel', () => {
  beforeEach(() => {
    validateRecipesCsvImport.mockReset()
    importRecipesCsv.mockReset()
  })

  it('previews recipes and imports after a clean preflight', async () => {
    validateRecipesCsvImport.mockResolvedValue({
      success: true,
      data: { canImport: true, existingRows: [], summary: { totalRecipes: 1, avgSellingPrice: 12.5, avgCurrentCost: 3.2 } },
    })
    importRecipesCsv.mockResolvedValue({
      success: true,
      data: { importedRows: 1, summary: { totalRecipes: 1, avgSellingPrice: 12.5, avgCurrentCost: 3.2 } },
    })

    render(<RecipesCsvImportPanel />)

    fireEvent.change(screen.getByLabelText(/CSV recetas/i), {
      target: { value: 'name;selling_price;current_cost\nTortilla;12,50;3,20' },
    })

    expect(screen.getByText(/1 recetas válidas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar recetas/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))
    expect(await screen.findByText(/Sin duplicados en recetas/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Importar recetas/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /Importar recetas/i }))

    expect(await screen.findByText(/Importación completada: 1 recetas guardadas/i)).toBeInTheDocument()
  })

  it('loads recipe CSV content from a file input', async () => {
    render(<RecipesCsvImportPanel />)

    const csvText = 'name;selling_price;current_cost\nTortilla;12,50;3,20'
    const file = new File([csvText], 'recetas.csv', { type: 'text/csv' })

    fireEvent.change(screen.getByLabelText('Archivo CSV'), {
      target: { files: [file] },
    })

    expect(await screen.findByText(/1 recetas válidas/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/CSV recetas/i)).toHaveValue(csvText)
  })
})
