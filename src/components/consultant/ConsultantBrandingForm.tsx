'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Save } from 'lucide-react'
import { updateConsultantBranding, type ConsultantWorkspaceRestaurant } from '@/app/actions/consultant'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConsultantBrandingFormProps {
  restaurant: ConsultantWorkspaceRestaurant
}

type FormState = {
  consultantName: string
  consultantEmail: string
  consultantLogoUrl: string
}

type SaveState = { type: 'success' | 'error'; message: string } | null

export function ConsultantBrandingForm({ restaurant }: ConsultantBrandingFormProps) {
  const [form, setForm] = useState<FormState>({
    consultantName: restaurant.consultantName ?? '',
    consultantEmail: restaurant.consultantEmail ?? '',
    consultantLogoUrl: restaurant.consultantLogoUrl ?? '',
  })
  const [saveState, setSaveState] = useState<SaveState>(null)
  const [isPending, startTransition] = useTransition()

  function updateField(field: keyof FormState, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function save() {
    setSaveState(null)
    startTransition(async () => {
      const response = await updateConsultantBranding(form)
      setSaveState({
        type: response.success ? 'success' : 'error',
        message: response.success
          ? 'Identidad del consultor actualizada.'
          : response.error || 'No se pudo actualizar la identidad.',
      })
    })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marca de entrega</p>
        <h2 className="text-lg font-semibold text-slate-950">Identidad del consultor</h2>
        <p className="text-sm leading-6 text-slate-600">
          Estos datos aparecen en la cabecera del portal cliente y ayudan a que la entrega parezca una consultoría profesional, no una pantalla genérica.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="consultant-name">Nombre visible</Label>
          <Input
            id="consultant-name"
            value={form.consultantName}
            onChange={event => updateField('consultantName', event.target.value)}
            placeholder="ControlHub Consulting"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="consultant-email">Email de contacto</Label>
          <Input
            id="consultant-email"
            type="email"
            value={form.consultantEmail}
            onChange={event => updateField('consultantEmail', event.target.value)}
            placeholder="consultor@controlhub.es"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="consultant-logo">URL del logotipo</Label>
          <Input
            id="consultant-logo"
            value={form.consultantLogoUrl}
            onChange={event => updateField('consultantLogoUrl', event.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? 'Guardando' : 'Guardar identidad'}
        </Button>
      </div>

      {saveState && (
        <Alert variant={saveState.type === 'error' ? 'destructive' : 'default'} className="mt-4">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{saveState.type === 'error' ? 'No guardado' : 'Guardado'}</AlertTitle>
          <AlertDescription>{saveState.message}</AlertDescription>
        </Alert>
      )}
    </section>
  )
}
