'use client'

import { useState, useTransition } from 'react'
import { requestConsultantMeeting } from '@/app/actions/portal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function PortalMeetingRequestDialog({ reportId }: { reportId: string }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-950">Solicitar reunión de revisión</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Envía una nota breve para que tu consultor prepare la revisión del informe.
      </p>
      <Textarea
        value={message}
        onChange={event => setMessage(event.target.value)}
        placeholder="Mensaje opcional para tu consultor"
        className="mt-4 min-h-28 bg-white"
      />
      <Button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          const response = await requestConsultantMeeting({ reportId, message })
          setState(response.success ? 'Solicitud enviada.' : response.error || 'No se pudo enviar la solicitud.')
        })}
        className="mt-4 w-full"
      >
        {isPending ? 'Enviando' : 'Solicitar reunión'}
      </Button>
      {state && <p className="mt-3 text-sm text-slate-600">{state}</p>}
    </div>
  )
}
