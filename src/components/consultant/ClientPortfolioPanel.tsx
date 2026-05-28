'use client'

import { useTransition } from 'react'
import { Building2, CheckCircle2, Loader2 } from 'lucide-react'
import {
  selectConsultantClient,
  type ConsultantClientSummary,
} from '@/app/actions/consultant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ClientPortfolioPanelProps {
  clients: ConsultantClientSummary[]
}

const ROLE_LABEL: Record<ConsultantClientSummary['role'], string> = {
  OWNER: 'Propio',
  CONSULTANT: 'Consultoría',
  VIEWER: 'Lectura',
}

export function ClientPortfolioPanel({ clients }: ClientPortfolioPanelProps) {
  const [isPending, startTransition] = useTransition()

  function selectClient(restaurantId: string) {
    startTransition(async () => {
      const response = await selectConsultantClient({ restaurantId })
      if (response.success) {
        window.location.href = '/consultant'
      }
    })
  }

  if (clients.length <= 1) return null

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cartera de clientes</p>
          <h2 className="text-lg font-semibold text-slate-950">Restaurantes activos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cambia el restaurante activo para preparar datos, informes y entregas desde la misma mesa.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit rounded-md">
          {clients.length} clientes
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clients.map(client => (
          <article
            key={client.restaurantId}
            className={cn(
              'rounded-md border p-4 transition hover:border-slate-300 hover:shadow-sm',
              client.isActive ? 'border-slate-950 bg-slate-50' : 'border-slate-200 bg-white'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md',
                  client.isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                )}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-950">{client.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {client.consultantName || 'Sin marca de consultor'}
                  </p>
                </div>
              </div>
              {client.isActive && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="rounded-md">
                {ROLE_LABEL[client.role]}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant={client.isActive ? 'secondary' : 'outline'}
                disabled={client.isActive || isPending}
                onClick={() => selectClient(client.restaurantId)}
              >
                {isPending && !client.isActive && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {client.isActive ? 'Activo' : 'Abrir'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
