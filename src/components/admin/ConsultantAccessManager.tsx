'use client'

import { useMemo, useState, useTransition } from 'react'
import { BriefcaseBusiness, Filter, Loader2, Search, ShieldCheck, UsersRound } from 'lucide-react'
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

type RelationshipFilter = AdminConsultantRelationshipStatus | 'ALL'

const FILTER_LABEL: Record<RelationshipFilter, string> = {
  ALL: 'Todos',
  ACTIVE: 'Activos',
  PAUSED: 'Pausados',
  REVOKED: 'Revocados',
}

export function ConsultantAccessManager({ data }: ConsultantAccessManagerProps) {
  const [consultantUserId, setConsultantUserId] = useState(data.users[0]?.id ?? '')
  const [restaurantId, setRestaurantId] = useState(data.restaurants[0]?.id ?? '')
  const [role, setRole] = useState<'CONSULTANT' | 'VIEWER'>('CONSULTANT')
  const [status, setStatus] = useState<AdminConsultantRelationshipStatus>('ACTIVE')
  const [statusFilter, setStatusFilter] = useState<RelationshipFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const usersById = useMemo(() => new Map(data.users.map(user => [user.id, user])), [data.users])
  const restaurantsById = useMemo(() => new Map(data.restaurants.map(restaurant => [restaurant.id, restaurant])), [data.restaurants])
  const selectedRelationship = useMemo(
    () => data.relationships.find(relationship =>
      relationship.consultant_user_id === consultantUserId &&
      relationship.restaurant_id === restaurantId
    ),
    [consultantUserId, data.relationships, restaurantId]
  )

  const relationshipCounts = useMemo(() => ({
    total: data.relationships.length,
    active: data.relationships.filter(relationship => relationship.status === 'ACTIVE').length,
    paused: data.relationships.filter(relationship => relationship.status === 'PAUSED').length,
    revoked: data.relationships.filter(relationship => relationship.status === 'REVOKED').length,
  }), [data.relationships])

  const consultantSummaries = useMemo(() => data.users
    .map(user => {
      const userRelationships = data.relationships.filter(relationship => relationship.consultant_user_id === user.id)
      const activeRelationships = userRelationships.filter(relationship => relationship.status === 'ACTIVE')
      return {
        user,
        total: userRelationships.length,
        active: activeRelationships.length,
        paused: userRelationships.filter(relationship => relationship.status === 'PAUSED').length,
        revoked: userRelationships.filter(relationship => relationship.status === 'REVOKED').length,
        clients: activeRelationships
          .map(relationship => restaurantsById.get(relationship.restaurant_id)?.name)
          .filter((name): name is string => Boolean(name)),
      }
    })
    .filter(summary => summary.total > 0)
    .sort((a, b) => b.active - a.active || a.user.email.localeCompare(b.user.email, 'es')),
  [data.relationships, data.users, restaurantsById])

  const filteredRelationships = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return data.relationships.filter(relationship => {
      if (statusFilter !== 'ALL' && relationship.status !== statusFilter) return false
      if (!normalizedSearch) return true

      const user = usersById.get(relationship.consultant_user_id)
      const restaurant = restaurantsById.get(relationship.restaurant_id)
      return [
        user?.email,
        restaurant?.name,
        relationship.role,
        STATUS_LABEL[relationship.status],
      ].some(value => value?.toLowerCase().includes(normalizedSearch))
    })
  }, [data.relationships, restaurantsById, searchTerm, statusFilter, usersById])

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
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Relaciones" value={relationshipCounts.total} />
        <MetricCard label="Activas" value={relationshipCounts.active} tone="success" />
        <MetricCard label="Pausadas" value={relationshipCounts.paused} tone="warning" />
        <MetricCard label="Revocadas" value={relationshipCounts.revoked} tone="muted" />
      </section>

      <section className="rounded-xl border border-white/5 bg-white/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Cartera por consultor</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-400">
              Vista rápida de qué usuarios gestionan clientes activos y qué relaciones requieren atención.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {consultantSummaries.map(summary => (
            <article key={summary.user.id} className="rounded-xl border border-white/5 bg-neutral-950/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-xs font-bold text-white">{summary.user.email}</h3>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {summary.active} activos · {summary.paused} pausados · {summary.revoked} revocados
                  </p>
                </div>
                <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-neutral-300">
                  {summary.total}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-neutral-400">
                {summary.clients.length > 0 ? summary.clients.join(', ') : 'Sin clientes activos.'}
              </p>
            </article>
          ))}
          {consultantSummaries.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-neutral-500 lg:col-span-3">
              Todavía no hay cartera configurada para ningún consultor.
            </div>
          )}
        </div>
      </section>

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
        {selectedRelationship && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Ya existe una relación para este consultor y restaurante. Al guardar se actualizará su rol o estado.
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
        <div className="space-y-4 border-b border-white/5 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-white">Relaciones existentes</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {filteredRelationships.length} de {data.relationships.length} relaciones visibles
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-300">
              <Filter className="h-4 w-4 text-neutral-500" />
              <select
                aria-label="Filtrar por estado"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as RelationshipFilter)}
                className="w-full bg-transparent text-xs text-neutral-100 outline-none"
              >
                {Object.entries(FILTER_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-300">
              <Search className="h-4 w-4 text-neutral-500" />
              <input
                aria-label="Buscar relación"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar por consultor, restaurante, rol o estado"
                className="w-full bg-transparent text-xs text-neutral-100 outline-none placeholder:text-neutral-600"
              />
            </label>
          </div>
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
              {filteredRelationships.map(relationship => {
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
              {filteredRelationships.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                    No hay relaciones consultor-restaurante para los filtros actuales.
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

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'muted'
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      tone === 'default' && 'border-white/5 bg-white/5',
      tone === 'success' && 'border-emerald-500/10 bg-emerald-500/10',
      tone === 'warning' && 'border-amber-500/10 bg-amber-500/10',
      tone === 'muted' && 'border-neutral-500/10 bg-neutral-500/10',
    )}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-white">{value}</p>
    </div>
  )
}
