import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmployeesCsvImportPanel } from '@/components/staff/EmployeesCsvImportPanel'

const validateEmployeesCsvImport = vi.fn()
const importEmployeesCsv = vi.fn()

vi.mock('@/app/actions/staff', () => ({
  validateEmployeesCsvImport: (input: unknown) => validateEmployeesCsvImport(input),
  importEmployeesCsv: (input: unknown) => importEmployeesCsv(input),
}))

describe('EmployeesCsvImportPanel', () => {
  beforeEach(() => {
    validateEmployeesCsvImport.mockReset()
    importEmployeesCsv.mockReset()
  })

  it('previews employees and imports after a clean preflight', async () => {
    validateEmployeesCsvImport.mockResolvedValue({
      success: true,
      data: { canImport: true, existingRows: [], summary: { totalEmployees: 1, activeRows: 1, estimatedMonthlyCost: 1920 } },
    })
    importEmployeesCsv.mockResolvedValue({
      success: true,
      data: { importedRows: 1, summary: { totalEmployees: 1, activeRows: 1, estimatedMonthlyCost: 1920 } },
    })

    render(<EmployeesCsvImportPanel />)

    fireEvent.change(screen.getByLabelText(/CSV empleados/i), {
      target: { value: 'first_name;last_name;role;hourly_rate\nMaria;Lopez;FLOOR_STAFF;12' },
    })

    expect(screen.getByText(/1 empleados válidos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar empleados/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))
    expect(await screen.findByText(/Sin duplicados en empleados/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Importar empleados/i })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /Importar empleados/i }))

    expect(await screen.findByText(/Importación completada: 1 empleados guardados/i)).toBeInTheDocument()
  })
})
