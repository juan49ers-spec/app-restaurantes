import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FinancialCsvImportPanel } from '@/components/financial-control/FinancialCsvImportPanel'

const importFinancialCsv = vi.fn()

vi.mock('@/app/actions/financial-control', () => ({
  importFinancialCsv: (input: unknown) => importFinancialCsv(input),
}))

describe('FinancialCsvImportPanel', () => {
  beforeEach(() => {
    importFinancialCsv.mockReset()
  })

  it('previews a valid sales CSV and enables confirmation', () => {
    render(<FinancialCsvImportPanel />)

    fireEvent.change(screen.getByLabelText('Contenido CSV'), {
      target: {
        value: [
          'date;revenue_total;total_covers',
          '2026-02-01;1.250,50;64',
          '2026-02-02;980;41',
        ].join('\n'),
      },
    })

    expect(screen.getByText('2 filas válidas')).toBeInTheDocument()
    expect(screen.getByText('0 errores')).toBeInTheDocument()
    expect(screen.getByText(/2\.?230,50 €/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar CSV/i })).toBeEnabled()
  })

  it('shows CSV errors and keeps confirmation disabled', () => {
    render(<FinancialCsvImportPanel />)

    fireEvent.change(screen.getByLabelText('Contenido CSV'), {
      target: {
        value: 'date;total_covers\n2026-02-01;30',
      },
    })

    expect(screen.getByText('Falta la columna obligatoria revenue_total.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar CSV/i })).toBeDisabled()
  })

  it('confirms a valid import through the server action', async () => {
    importFinancialCsv.mockResolvedValueOnce({
      success: true,
      data: {
        kind: 'sales',
        importedRows: 1,
        skippedRows: 0,
        summary: {
          totalRevenue: 1250,
          totalExpenses: 0,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
        },
      },
    })

    render(<FinancialCsvImportPanel />)

    const csvText = 'date;revenue_total\n2026-02-01;1250'
    fireEvent.change(screen.getByLabelText('Contenido CSV'), {
      target: { value: csvText },
    })
    fireEvent.click(screen.getByRole('button', { name: /Importar CSV/i }))

    await waitFor(() => {
      expect(importFinancialCsv).toHaveBeenCalledWith({
        kind: 'sales',
        csvText,
      })
    })
    expect(await screen.findByText('Importación completada: 1 filas guardadas.')).toBeInTheDocument()
  })
})
