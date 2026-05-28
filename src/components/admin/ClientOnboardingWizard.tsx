'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowRight, CheckCircle2, Loader2, Store, UploadCloud } from 'lucide-react'
import { createAdminClientWorkspace } from '@/app/actions/admin'
import type { AdminConsultantAccessData } from '@/app/actions/admin-queries'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ClientOnboardingWizardProps {
  data: AdminConsultantAccessData
}

export function ClientOnboardingWizard({ data }: ClientOnboardingWizardProps) {
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerUserId, setOwnerUserId] = useState(data.users[0]?.id ?? '')
  const [consultantUserId, setConsultantUserId] = useState(data.users[0]?.id ?? '')
  const [createdRestaurant, setCreatedRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedOwner = useMemo(
    () => data.users.find(user => user.id === ownerUserId),
    [data.users, ownerUserId]
  )
  const selectedConsultant = useMemo(
    () => data.users.find(user => user.id === consultantUserId),
    [consultantUserId, data.users]
  )

  function createWorkspace() {
    startTransition(async () => {
      const response = await createAdminClientWorkspace({
        restaurantName,
        ownerUserId,
        consultantUserId: consultantUserId || null,
      })

      if (response.success && response.restaurantId && response.restaurantName) {
        setCreatedRestaurant({ id: response.restaurantId, name: response.restaurantName })
        toast.success('Cliente creado y preparado para onboarding.')
      } else {
        toast.error(response.error || 'No se pudo crear el cliente.')
      }
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="rounded-xl border border-white/5 bg-white/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Alta guiada de cliente</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Crea el restaurante, asígnale owner y deja lista la relación con el consultor en una sola operación.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">Restaurante</span>
            <input
              aria-label="Nombre del restaurante"
              value={restaurantName}
              onChange={event => setRestaurantName(event.target.value)}
              placeholder="Ej. Txiquita Tasca"
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">Owner del restaurante</span>
            <select
              aria-label="Owner del restaurante"
              value={ownerUserId}
              onChange={event => setOwnerUserId(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            >
              {data.users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">Consultor asignado</span>
            <select
              aria-label="Consultor asignado"
              value={consultantUserId}
              onChange={event => setConsultantUserId(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">Sin asignar todavía</option>
              {data.users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-white/5 bg-neutral-950/60 p-3 text-xs leading-5 text-neutral-400">
            <p><strong className="text-neutral-200">Owner:</strong> {selectedOwner?.email || 'Sin seleccionar'}</p>
            <p><strong className="text-neutral-200">Consultor:</strong> {selectedConsultant?.email || 'Sin asignar'}</p>
          </div>

          <Button
            type="button"
            disabled={restaurantName.trim().length < 2 || !ownerUserId || isPending}
            onClick={createWorkspace}
            className="w-full"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Crear cliente
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Siguiente recorrido operativo</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Después del alta, el consultor sigue estos pasos para llegar al primer informe publicado.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {[
            ['Importar ventas y gastos', '/financial-control'],
            ['Importar carta, turnos o facturas si aplica', '/stock'],
            ['Generar informe profesional READY', '/reports'],
            ['Publicar y revisar en portal cliente', '/portal'],
          ].map(([label, href], index) => (
            <li key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-950/60 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">Paso {index + 1}</p>
                <p className="mt-1 text-sm font-bold text-white">{label}</p>
              </div>
              <a href={href} className="inline-flex items-center gap-2 text-xs font-bold text-red-300 hover:text-red-200">
                Abrir <ArrowRight className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ol>

        {createdRestaurant && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-bold text-emerald-200">{createdRestaurant.name} creado correctamente.</p>
            <p className="mt-1 text-xs text-emerald-100/80">ID: {createdRestaurant.id}</p>
          </div>
        )}
      </section>
    </div>
  )
}
