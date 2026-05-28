'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck, Loader2, Store, UploadCloud } from 'lucide-react'
import { createAdminClientWorkspace } from '@/app/actions/admin'
import type { AdminConsultantAccessData } from '@/app/actions/admin-queries'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ClientOnboardingWizardProps {
  data: AdminConsultantAccessData
}

const FIRST_REPORT_STEPS = [
  {
    label: 'Seleccionar cliente activo',
    description: 'Abrir la cartera del consultor y trabajar sobre el restaurante recién creado.',
    href: '/consultant',
    owner: 'Consultor',
    estimate: '2 min',
  },
  {
    label: 'Importar ventas y gastos',
    description: 'Cargar las dos fuentes mínimas para construir una lectura financiera fiable.',
    href: '/financial-control',
    owner: 'Consultor',
    estimate: '10 min',
  },
  {
    label: 'Completar datos operativos',
    description: 'Añadir carta, turnos y facturas si el informe necesita más contexto.',
    href: '/stock',
    owner: 'Consultor',
    estimate: '15 min',
  },
  {
    label: 'Guardar informe READY',
    description: 'Generar snapshot, revisar quality gate y dejar una versión lista para publicar.',
    href: '/reports',
    owner: 'Consultor',
    estimate: '8 min',
  },
  {
    label: 'Publicar y validar portal',
    description: 'Abrir el área cliente, comprobar PDF y confirmar que la entrega se entiende.',
    href: '/portal',
    owner: 'Consultor',
    estimate: '5 min',
  },
] as const

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
  const initialStatusItems = [
    {
      label: 'Restaurante creado',
      complete: Boolean(createdRestaurant),
      detail: createdRestaurant?.name ?? 'Pendiente de crear',
    },
    {
      label: 'Owner asignado',
      complete: Boolean(selectedOwner),
      detail: selectedOwner?.email ?? 'Selecciona un owner',
    },
    {
      label: 'Consultor asignado',
      complete: Boolean(selectedConsultant),
      detail: selectedConsultant?.email ?? 'Puede asignarse más tarde',
    },
    {
      label: 'Primer informe',
      complete: false,
      detail: 'Se prepara desde la mesa del consultor',
    },
  ] as const

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
      <section className="rounded-xl border border-white/5 bg-white/5 p-5 shadow-sm">
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

          {createdRestaurant && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-bold text-emerald-200">{createdRestaurant.name} creado correctamente.</p>
              <p className="mt-1 text-xs text-emerald-100/80">ID: {createdRestaurant.id}</p>
              <a href="/consultant" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-100 hover:text-white">
                Ir a la cartera del consultor <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}

          <div className="rounded-xl border border-white/5 bg-neutral-950/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Estado inicial</p>
            <div className="mt-3 space-y-2">
              {initialStatusItems.map(item => (
                <div key={item.label} className="flex items-start gap-2">
                  {item.complete ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-4 w-4 text-neutral-500" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-neutral-100">{item.label}</p>
                    <p className="text-[11px] leading-4 text-neutral-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/5 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Primer informe publicado</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Recorrido recomendado para llevar un nuevo cliente desde alta interna hasta portal validado.
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {FIRST_REPORT_STEPS.map((step, index) => (
            <li key={step.label} className="grid gap-3 rounded-xl border border-white/5 bg-neutral-950/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">Paso {index + 1}</p>
                <p className="mt-1 text-sm font-bold text-white">{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-400">{step.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-neutral-400">{step.owner}</span>
                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-sky-200">{step.estimate}</span>
                </div>
              </div>
              <a href={step.href} className="inline-flex items-center gap-2 text-xs font-bold text-red-300 hover:text-red-200">
                Abrir <ArrowRight className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-4 w-4 text-amber-200" />
            <div>
              <p className="text-xs font-bold text-amber-100">Control antes de enseñar al cliente</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">
                Cuando el informe esté publicado, ejecutar el QA del flujo cliente y revisar el portal con datos reales.
              </p>
              <code className="mt-3 block rounded-lg border border-amber-500/15 bg-neutral-950/70 px-3 py-2 text-[11px] text-amber-100">
                npm run qa:client-flow
              </code>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
