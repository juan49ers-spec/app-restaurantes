'use client'

import { useState, useTransition } from 'react'
import { requestConsultantMeeting } from '@/app/actions/portal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type RequestState = {
  message: string
  done: boolean
}

export function PortalMeetingRequestDialog({ reportId }: { reportId: string }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<RequestState | null>(null)
  const [isPending, startTransition] = useTransition()
  const isDone = Boolean(state?.done)

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
        disabled={isDone}
      />
      <Button
        disabled={isPending || isDone}
        onClick={() => startTransition(async () => {
          const response = await requestConsultantMeeting({ reportId, message })
          setState(response.success
            ? {
                done: true,
                message: response.data?.reused
                  ? 'Ya hay una solicitud abierta para este informe. Tu consultor la verá en su mesa de trabajo.'
                  : 'Solicitud enviada. Tu consultor la verá en su mesa de trabajo.',
              }
            : { done: false, message: response.error || 'No se pudo enviar la solicitud.' }
          )
        })}
        className="mt-4 w-full"
      >
        {isPending ? 'Enviando' : isDone ? 'Solicitud registrada' : 'Solicitar reunión'}
      </Button>
      {state && <p className="mt-3 text-sm text-slate-600">{state.message}</p>}
    </div>
  )
}
