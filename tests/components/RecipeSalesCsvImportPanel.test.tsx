import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeSalesCsvImportPanel } from '@/components/stock/RecipeSalesCsvImportPanel'

const validateRecipeSalesCsvImport = vi.fn()
const importRecipeSalesCsv = vi.fn()

vi.mock('@/app/actions/stock-actions', () => ({
  validateRecipeSalesCsvImport: (input: unknown) => validateRecipeSalesCsvImport(input),
  importRecipeSalesCsv: (input: unknown) => importRecipeSalesCsv(input),
}))

describe('RecipeSalesCsvImportPanel', () => {
  beforeEach(() => {
    validateRecipeSalesCsvImport.mockReset()
    importRecipeSalesCsv.mockReset()
  })

  it('previews recipe sales and requires a clean preflight before import', async () => {
    validateRecipeSalesCsvImport.mockResolvedValueOnce({
      success: true,
      data: {
        canImport: true,
        existingRows: [],
        summary: {
          totalUnits: 12,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          recipeRefs: 1,
        },
      },
    })
    importRecipeSalesCsv.mockResolvedValueOnce({
      success: true,
      data: {
        importedRows: 1,
        summary: {
          totalUnits: 12,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          recipeRefs: 1,
        },
      },
    })

    render(<RecipeSalesCsvImportPanel />)

    const csvText = 'date;recipe_name;quantity_sold\n2026-02-01;Tortilla;12'
    fireEvent.change(screen.getByLabelText('CSV ventas por receta'), {
      target: { value: csvText },
    })

    expect(screen.getByText('12 uds.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar ventas por receta/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))
    expect(await screen.findByText('Sin duplicados en ventas por receta.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Importar ventas por receta/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Importar ventas por receta/i }))

    await waitFor(() => {
      expect(importRecipeSalesCsv).toHaveBeenCalledWith({ csvText })
    })
    expect(await screen.findByText('Importación completada: 1 filas guardadas.')).toBeInTheDocument()
  })

  it('shows existing recipe sales and keeps import disabled', async () => {
    validateRecipeSalesCsvImport.mockResolvedValueOnce({
      success: true,
      data: {
        canImport: false,
        existingRows: [
          {
            key: '2026-02-01|recipe-1',
            rowNumbers: [2],
            message: 'Ya existen ventas para Tortilla el 2026-02-01.',
          },
        ],
        summary: {
          totalUnits: 12,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          recipeRefs: 1,
        },
      },
    })

    render(<RecipeSalesCsvImportPanel />)

    fireEvent.change(screen.getByLabelText('CSV ventas por receta'), {
      target: { value: 'date;recipe_name;quantity_sold\n2026-02-01;Tortilla;12' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))

    expect(await screen.findByText('Ya existen ventas para Tortilla el 2026-02-01.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar ventas por receta/i })).toBeDisabled()
  })
})
