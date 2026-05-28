'use client'

import { useMemo, useState, useTransition } from 'react'
import { BriefcaseBusiness, Loader2, ShieldCheck } from 'lucide-react'
import {
  upsertConsultantRestaurantAccess,
  updateConsultantRestaurantAccessStatus,
} from '@/app/actions/admin'
import type {
  AdminConsultantAccessData,
  AdminConsultantRelationshipStatus,
} from '@/app/actions/admin-queries'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ConsultantAccessManagerProps {
  data: AdminConsultantAccessData
}

const STATUS_LABEL: Record<AdminConsultantRelationshipStatus, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  REVOKED: 'Revocado',
}

export function ConsultantAccessManager({ data }: ConsultantAccessManagerProps) {
  const [consultantUserId, setConsultantUserId] = useState(data.users[0]?.id ?? '')
  const [restaurantId, setRestaurantId] = useState(data.restaurants[0]?.id ?? '')
  const [role, setRole] = useState<'CONSULTANT' | 'VIEWER'>('CONSULTANT')
  const [status, setStatus] = useState<AdminConsultantRelationshipStatus>('ACTIVE')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const usersById = useMemo(() => new Map(data.users.map(user => [user.id, user])), [data.users])
  const restaurantsById = useMemo(() => new Map(data.restaurants.map(restaurant => [restaurant.id, restaurant])), [data.restaurants])

  function saveRelationship() {
    startTransition(async () => {
      const response = await upsertConsultantRestaurantAccess({
        consultantUserId,
        restaurantId,
        role,
        status,
      })
      if (response.success) {
        toast.success('Relación consultor-restaurante guardada.')
      } else {
        toast.error(response.error || 'No se pudo guardar la relación.')
      }
    })
  }

  function updateStatus(id: string, nextStatus: AdminConsultantRelationshipStatus) {
    setPendingId(id)
    startTransition(async () => {
      const response = await updateConsultantRestaurantAccessStatus({ id, status: nextStatus })
      if (response.success) {
        toast.success('Estado actualizado.')
      } else {
        toast.error(response.error || 'No se pudo actualizar el estado.')
      }
      setPendingId(null)
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/5 bg-white/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Asignar consultor a restaurante</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Crea o actualiza relaciones para que el consultor vea clientes en `/consultant`.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_160px_auto]">
          <select
            aria-label="Consultor"
            value={consultantUserId}
            onChange={event => setConsultantUserId(event.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
          >
            {data.users.map(user => (
              <option key={user.id} value={user.id}>{user.email}</option>
            ))}
          </select>
          <select
            aria-label="Restaurante"
            value={restaurantId}
            onChange={event => setRestaurantId(event.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
          >
            {data.restaurants.map(restaurant => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
          <select
            aria-label="Rol"
            value={role}
            onChange={event => setRole(event.target.value as 'CONSULTANT' | 'VIEWER')}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
          >
            <option value="CONSULTANT">Consultor</option>
            <option value="VIEWER">Lectura</option>
          </select>
          <select
            aria-label="Estado"
            value={status}
            onChange={event => setStatus(event.target.value as AdminConsultantRelationshipStatus)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
          >
            <option value="ACTIVE">Activo</option>
            <option value="PAUSED">Pausado</option>
            <option value="REVOKED">Revocado</option>
          </select>
          <Button
            type="button"
            disabled={!consultantUserId || !restaurantId || isPending}
            onClick={saveRelationship}
          >
            {isPending && !pendingId && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
        <div className="border-b border-white/5 px-5 py-4">
          <h2 className="text-sm font-bold text-white">Relaciones existentes</h2>
          <p className="mt-1 text-xs text-neutral-500">{data.relationships.length} relaciones configuradas</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-neutral-500">
                <th className="px-5 py-3 text-left font-medium">Consultor</th>
                <th className="px-5 py-3 text-left font-medium">Restaurante</th>
                <th className="px-5 py-3 text-left font-medium">Rol</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
                <th className="px-5 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.relationships.map(relationship => {
                const user = usersById.get(relationship.consultant_user_id)
                const restaurant = restaurantsById.get(relationship.restaurant_id)
                return (
                  <tr key={relationship.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-3 text-neutral-200">{user?.email || relationship.consultant_user_id}</td>
                    <td className="px-5 py-3 text-neutral-200">{restaurant?.name || relationship.restaurant_id}</td>
                    <td className="px-5 py-3 text-neutral-400">{relationship.role}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase',
                        relationship.status === 'ACTIVE' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
                        relationship.status === 'PAUSED' && 'border-amber-500/20 bg-amber-500/10 text-amber-400',
                        relationship.status === 'REVOKED' && 'border-neutral-500/20 bg-neutral-500/10 text-neutral-400',
                      )}>
                        <ShieldCheck className="h-3 w-3" />
                        {STATUS_LABEL[relationship.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {relationship.status !== 'ACTIVE' && (
                          <Button size="sm" variant="outline" disabled={isPending && pendingId === relationship.id} onClick={() => updateStatus(relationship.id, 'ACTIVE')}>
                            Activar
                          </Button>
                        )}
                        {relationship.status !== 'PAUSED' && (
                          <Button size="sm" variant="outline" disabled={isPending && pendingId === relationship.id} onClick={() => updateStatus(relationship.id, 'PAUSED')}>
                            Pausar
                          </Button>
                        )}
                        {relationship.status !== 'REVOKED' && (
                          <Button size="sm" variant="outline" disabled={isPending && pendingId === relationship.id} onClick={() => updateStatus(relationship.id, 'REVOKED')}>
                            Revocar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {data.relationships.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                    Todavía no hay relaciones consultor-restaurante.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
