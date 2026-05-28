import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FirstReportGuidePanel } from '@/components/consultant/FirstReportGuidePanel'
import type { ConsultantFirstReportGuide } from '@/lib/consultant'

const baseGuide: ConsultantFirstReportGuide = {
  status: 'PUBLISH_READY',
  title: 'Publica el informe desde la mesa de informes',
  summary: 'El snapshot READY es publicable.',
  primaryAction: {
    label: 'Publicar desde informes',
    href: '/reports?from=2026-02-01&to=2026-02-28',
  },
  steps: [
    {
      id: 'data',
      label: 'Datos base',
      description: 'Ventas y gastos mínimos.',
      status: 'done',
    },
    {
      id: 'ready',
      label: 'Versión READY',
      description: 'Snapshot guardado.',
      status: 'done',
    },
    {
      id: 'quality',
      label: 'Quality gate',
      description: 'Validación profesional.',
      status: 'done',
    },
    {
      id: 'publication',
      label: 'Portal cliente',
      description: 'Informe visible.',
      status: 'current',
    },
  ],
}

describe('FirstReportGuidePanel', () => {
  it('renders the current first-report step and primary action', () => {
    render(<FirstReportGuidePanel guide={baseGuide} />)

    expect(screen.getByText('Primer informe guiado')).toBeInTheDocument()
    expect(screen.getByText('Publica el informe desde la mesa de informes')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Publicar desde informes/i })).toHaveAttribute(
      'href',
      '/reports?from=2026-02-01&to=2026-02-28',
    )
    expect(screen.getByText('Paso actual')).toBeInTheDocument()
  })

  it('shows all guide steps with accessible labels', () => {
    render(<FirstReportGuidePanel guide={baseGuide} />)

    const list = screen.getByRole('list', { name: /Progreso del primer informe/i })

    expect(within(list).getByText('Datos base')).toBeInTheDocument()
    expect(within(list).getByText('Versión READY')).toBeInTheDocument()
    expect(within(list).getByText('Quality gate')).toBeInTheDocument()
    expect(within(list).getByText('Portal cliente')).toBeInTheDocument()
  })
})
