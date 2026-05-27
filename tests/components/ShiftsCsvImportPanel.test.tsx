import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShiftsCsvImportPanel } from '@/components/staff/ShiftsCsvImportPanel'

const validateShiftsCsvImport = vi.fn()
const importShiftsCsv = vi.fn()

vi.mock('@/app/actions/staff', () => ({
  validateShiftsCsvImport: (input: unknown) => validateShiftsCsvImport(input),
  importShiftsCsv: (input: unknown) => importShiftsCsv(input),
}))

describe('ShiftsCsvImportPanel', () => {
  beforeEach(() => {
    validateShiftsCsvImport.mockReset()
    importShiftsCsv.mockReset()
  })

  it('previews shifts and requires a clean preflight before import', async () => {
    const onImported = vi.fn()
    validateShiftsCsvImport.mockResolvedValue({
      success: true,
      data: {
        canImport: true,
        existingRows: [],
        summary: {
          totalShifts: 1,
          totalHours: 7.5,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          employeeRefs: 1,
        },
      },
    })
    importShiftsCsv.mockResolvedValue({
      success: true,
      data: {
        importedRows: 1,
        summary: {
          totalShifts: 1,
          totalHours: 7.5,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          employeeRefs: 1,
        },
      },
    })

    render(<ShiftsCsvImportPanel onImported={onImported} />)

    fireEvent.change(screen.getByLabelText(/CSV turnos/i), {
      target: {
        value: 'date;employee_name;start_time;end_time;break_minutes\n2026-02-01;Maria Lopez;09:00;17:00;30',
      },
    })

    expect(screen.getByText(/1 turnos válidos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar turnos/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))

    expect(await screen.findByText(/Sin duplicados en base de datos/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Importar turnos/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Importar turnos/i }))

    expect(await screen.findByText(/Importación completada: 1 turnos guardados/i)).toBeInTheDocument()
    expect(onImported).toHaveBeenCalled()
  })

  it('keeps import disabled when database duplicates exist', async () => {
    validateShiftsCsvImport.mockResolvedValue({
      success: true,
      data: {
        canImport: false,
        existingRows: [
          {
            key: '2026-02-01|employee|09:00|17:00',
            rowNumbers: [2],
            message: 'Ya existe turno para Maria Lopez el 2026-02-01 de 09:00 a 17:00.',
          },
        ],
        summary: {
          totalShifts: 1,
          totalHours: 8,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          employeeRefs: 1,
        },
      },
    })

    render(<ShiftsCsvImportPanel />)

    fireEvent.change(screen.getByLabelText(/CSV turnos/i), {
      target: {
        value: 'date;employee_name;start_time;end_time\n2026-02-01;Maria Lopez;09:00;17:00',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))

    expect(await screen.findByText(/Ya existe turno para Maria Lopez/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar turnos/i })).toBeDisabled()
  })
})
