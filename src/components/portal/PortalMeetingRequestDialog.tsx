'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ActionResponse, PortalMeetingRequestResult } from '@/lib/portal'

type RequestState = {
  message: string
  done: boolean
}

function meetingRequestStorageKey(reportId: string) {
  return `portal-meeting-request:${reportId}`
}

function readStoredRequestState(reportId: string): RequestState | null {
  if (typeof window === 'undefined') return null

  const stored = window.sessionStorage.getItem(meetingRequestStorageKey(reportId))
  if (!stored) return null

  try {
    return JSON.parse(stored) as RequestState
  } catch {
    window.sessionStorage.removeItem(meetingRequestStorageKey(reportId))
    return null
  }
}

function storeRequestState(reportId: string, state: RequestState | null) {
  if (typeof window === 'undefined') return

  if (!state) {
    window.sessionStorage.removeItem(meetingRequestStorageKey(reportId))
    return
  }

  window.sessionStorage.setItem(meetingRequestStorageKey(reportId), JSON.stringify(state))
}

export function PortalMeetingRequestDialog({ reportId }: { reportId: string }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<RequestState | null>(() => readStoredRequestState(reportId))
  const [isPending, setIsPending] = useState(false)
  const isDone = Boolean(state?.done)

  async function handleRequestMeeting() {
    const optimisticState = { done: true, message: 'Solicitud registrada. Tu consultor la verá en su mesa de trabajo.' }
    setIsPending(true)
    setState(optimisticState)
    storeRequestState(reportId, optimisticState)

    try {
      const response = await requestMeeting({ reportId, message })
      const nextState = response.success
        ? {
            done: true,
            message: response.data?.reused
              ? 'Ya hay una solicitud abierta para este informe. Tu consultor la verá en su mesa de trabajo.'
              : 'Solicitud enviada. Tu consultor la verá en su mesa de trabajo.',
          }
        : { done: false, message: response.error || 'No se pudo enviar la solicitud.' }
      setState(nextState)
      storeRequestState(reportId, nextState.done ? nextState : null)
    } catch {
      const errorState = { done: false, message: 'No se pudo enviar la solicitud.' }
      setState(errorState)
      storeRequestState(reportId, null)
    } finally {
      setIsPending(false)
    }
  }

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
        onClick={handleRequestMeeting}
        className="mt-4 w-full"
      >
        {isPending ? 'Enviando' : isDone ? 'Solicitud registrada' : 'Solicitar reunión'}
      </Button>
      {state && <p className="mt-3 text-sm text-slate-600">{state.message}</p>}
    </div>
  )
}

async function requestMeeting(input: { reportId: string; message: string }): Promise<ActionResponse<PortalMeetingRequestResult>> {
  const response = await fetch('/api/portal/meeting-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return response.json() as Promise<ActionResponse<PortalMeetingRequestResult>>
}
