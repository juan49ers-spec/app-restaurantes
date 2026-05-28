import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CsvFileInput } from '@/components/importing/CsvFileInput'

function fileWithText(name: string, type: string, text: string) {
  const file = new File([text], name, { type })
  Object.defineProperty(file, 'text', {
    value: vi.fn(async () => text),
  })
  return file
}

describe('CsvFileInput', () => {
  it('loads valid CSV text and confirms the selected file', async () => {
    const onTextLoaded = vi.fn()
    render(<CsvFileInput id="csv-file" onTextLoaded={onTextLoaded} />)

    fireEvent.change(screen.getByLabelText('Archivo CSV'), {
      target: {
        files: [fileWithText('ventas.csv', 'text/csv', 'date;revenue_total\n2026-05-01;100')],
      },
    })

    await waitFor(() => {
      expect(onTextLoaded).toHaveBeenCalledWith('date;revenue_total\n2026-05-01;100')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Archivo cargado: ventas.csv')
  })

  it('rejects non CSV files before reading them', async () => {
    const onTextLoaded = vi.fn()
    render(<CsvFileInput id="csv-file" onTextLoaded={onTextLoaded} />)

    fireEvent.change(screen.getByLabelText('Archivo CSV'), {
      target: {
        files: [fileWithText('ventas.txt', 'text/plain', 'not csv')],
      },
    })

    expect(onTextLoaded).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Selecciona un archivo .csv válido.')
  })

  it('rejects files that exceed the configured size limit', () => {
    const onTextLoaded = vi.fn()
    render(<CsvFileInput id="csv-file" maxBytes={4} onTextLoaded={onTextLoaded} />)

    fireEvent.change(screen.getByLabelText('Archivo CSV'), {
      target: {
        files: [fileWithText('ventas.csv', 'text/csv', '12345')],
      },
    })

    expect(onTextLoaded).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('El CSV supera 4 B.')
  })
})
