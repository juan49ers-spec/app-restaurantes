import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvoicesCsvImportPanel } from '@/components/invoices/InvoicesCsvImportPanel'

const validateInvoicesCsvImport = vi.fn()
const importInvoicesCsv = vi.fn()

vi.mock('@/app/actions/invoices', () => ({
  validateInvoicesCsvImport: (input: unknown) => validateInvoicesCsvImport(input),
  importInvoicesCsv: (input: unknown) => importInvoicesCsv(input),
}))

describe('InvoicesCsvImportPanel', () => {
  beforeEach(() => {
    validateInvoicesCsvImport.mockReset()
    importInvoicesCsv.mockReset()
  })

  it('previews invoice headers and requires a clean preflight before import', async () => {
    validateInvoicesCsvImport.mockResolvedValue({
      success: true,
      data: {
        canImport: true,
        existingRows: [],
        summary: {
          totalAmount: 345.67,
          taxAmount: 31.42,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          supplierRefs: 1,
        },
      },
    })
    importInvoicesCsv.mockResolvedValue({
      success: true,
      data: {
        importedRows: 1,
        summary: {
          totalAmount: 345.67,
          taxAmount: 31.42,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          supplierRefs: 1,
        },
      },
    })

    render(<InvoicesCsvImportPanel />)

    fireEvent.change(screen.getByLabelText(/CSV facturas/i), {
      target: {
        value: 'date;supplier_name;invoice_number;total_amount;tax_amount\n2026-02-01;Proveedor Ejemplo;F-001;345,67;31,42',
      },
    })

    expect(screen.getByText(/1 facturas válidas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar facturas/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))

    expect(await screen.findByText(/Sin duplicados en base de datos/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Importar facturas/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Importar facturas/i }))

    expect(await screen.findByText(/Importación completada: 1 facturas guardadas/i)).toBeInTheDocument()
  })

  it('keeps import disabled when database duplicates exist', async () => {
    validateInvoicesCsvImport.mockResolvedValue({
      success: true,
      data: {
        canImport: false,
        existingRows: [
          {
            key: 'supplier|f-001|2026-02-01|345.67',
            rowNumbers: [2],
            message: 'Ya existe la factura F-001 de Proveedor Ejemplo (2026-02-01).',
          },
        ],
        summary: {
          totalAmount: 345.67,
          taxAmount: 0,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          supplierRefs: 1,
        },
      },
    })

    render(<InvoicesCsvImportPanel />)

    fireEvent.change(screen.getByLabelText(/CSV facturas/i), {
      target: {
        value: 'date;supplier_name;invoice_number;total_amount\n2026-02-01;Proveedor Ejemplo;F-001;345,67',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /Comprobar duplicados/i }))

    expect(await screen.findByText(/Ya existe la factura F-001/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importar facturas/i })).toBeDisabled()
  })
})
