'use client'

import { useState, useTransition } from 'react'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { updateMeetingRequestStatus, type ConsultantMeetingRequest } from '@/app/actions/consultant'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MeetingRequestsPanelProps {
  initialRequests: ConsultantMeetingRequest[]
}

type SaveState = { type: 'success' | 'error'; message: string } | null

const STATUS_COPY: Record<ConsultantMeetingRequest['status'], { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  ACKNOWLEDGED: { label: 'En revisión', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  COMPLETED: { label: 'Completada', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(value))
}

export function MeetingRequestsPanel({ initialRequests }: MeetingRequestsPanelProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>(null)
  const [isPending, startTransition] = useTransition()

  function setStatus(id: string, status: ConsultantMeetingRequest['status']) {
    setActiveId(id)
    setSaveState(null)
    startTransition(async () => {
      const response = await updateMeetingRequestStatus({ id, status })
      if (response.success && response.data) {
        setRequests(current => current.map(request => request.id === id
          ? { ...request, status: response.data!.status }
          : request
        ))
        setSaveState({ type: 'success', message: 'Solicitud actualizada.' })
      } else {
        setSaveState({ type: 'error', message: response.error || 'No se pudo actualizar la solicitud.' })
      }
      setActiveId(null)
    })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seguimiento cliente</p>
          <h2 className="text-lg font-semibold text-slate-950">Solicitudes de reunión</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Bandeja operativa de las solicitudes enviadas desde el portal del cliente.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit rounded-md">
          {requests.filter(request => request.status !== 'COMPLETED').length} abiertas
        </Badge>
      </div>

      <div className="mt-5 grid gap-3">
        {requests.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            Aún no hay solicitudes de reunión desde el portal.
          </div>
        ) : (
          requests.map(request => {
            const statusCopy = STATUS_COPY[request.status]
            return (
              <article key={request.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('rounded-md', statusCopy.className)}>
                        {statusCopy.label}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDateTime(request.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {request.message || 'Sin mensaje adicional.'}
                    </p>
                    {request.report && (
                      <p className="mt-2 text-xs text-slate-500">
                        Informe {request.report.periodFrom} a {request.report.periodTo} · versión {request.report.version}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {request.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending && activeId === request.id}
                        onClick={() => setStatus(request.id, 'ACKNOWLEDGED')}
                      >
                        Marcar en revisión
                      </Button>
                    )}
                    {request.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        disabled={isPending && activeId === request.id}
                        onClick={() => setStatus(request.id, 'COMPLETED')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {saveState && (
        <Alert variant={saveState.type === 'error' ? 'destructive' : 'default'} className="mt-4">
          <AlertTitle>{saveState.type === 'error' ? 'No actualizado' : 'Actualizado'}</AlertTitle>
          <AlertDescription>{saveState.message}</AlertDescription>
        </Alert>
      )}
    </section>
  )
}
