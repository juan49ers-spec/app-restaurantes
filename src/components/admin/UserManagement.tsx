'use client'

import { useState } from 'react'
import { AdminUserRow } from '@/app/actions/admin-queries'
import { updateUserRestaurant } from '@/app/actions/admin'
import { toast } from 'sonner'
import {
    Users,
    Shield,
    Building2,
    Clock,
    Mail,
    ChevronDown,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserManagementProps {
    initialUsers: AdminUserRow[]
    restaurants: { id: string; name: string }[]
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric'
    })
}

function formatDateTime(dateStr: string | null) {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

function getTimeSince(dateStr: string | null): string {
    if (!dateStr) return 'Nunca'
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `Hace ${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `Hace ${days}d`
    return formatDate(dateStr)
}

export function UserManagement({ initialUsers, restaurants }: UserManagementProps) {
    const [users] = useState<AdminUserRow[]>(initialUsers)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleRestaurantChange = async (userId: string, restaurantId: string) => {
        setLoadingId(userId)
        try {
            const value = restaurantId === '__none__' ? null : restaurantId
            await updateUserRestaurant(userId, value)
            toast.success("Restaurante asignado correctamente")
            setEditingId(null)
        } catch {
            toast.error("Error al asignar restaurante")
        } finally {
            setLoadingId(null)
        }
    }

    const admins = users.filter(u => u.is_admin)
    const regularUsers = users.filter(u => !u.is_admin)

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{users.length}</p>
                            <p className="text-xs text-neutral-500">Total Usuarios</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{admins.length}</p>
                            <p className="text-xs text-neutral-500">Administradores</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{regularUsers.length}</p>
                            <p className="text-xs text-neutral-500">Restaurantes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-neutral-400" />
                    <h2 className="text-sm font-bold text-white">Usuarios Registrados</h2>
                    <span className="text-[10px] text-neutral-500 ml-1">({users.length})</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-white/5 text-neutral-500">
                                <th className="text-left px-5 py-3 font-medium">Usuario</th>
                                <th className="text-left px-5 py-3 font-medium">Rol</th>
                                <th className="text-left px-5 py-3 font-medium">Restaurante</th>
                                <th className="text-left px-5 py-3 font-medium">Registro</th>
                                <th className="text-left px-5 py-3 font-medium">Último Acceso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors">
                                    {/* Email */}
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                                                user.is_admin
                                                    ? "bg-gradient-to-br from-red-500 to-red-700 text-white"
                                                    : "bg-gradient-to-br from-neutral-700 to-neutral-800 text-neutral-300"
                                            )}>
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-neutral-200 flex items-center gap-1.5">
                                                    <Mail className="w-3 h-3 text-neutral-500" />
                                                    {user.email}
                                                </span>
                                                <span className="text-[10px] text-neutral-600 font-mono">{user.id.slice(0, 8)}...</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role Badge */}
                                    <td className="px-5 py-3">
                                        {user.is_admin ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                                <Shield className="w-3 h-3" />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                <Building2 className="w-3 h-3" />
                                                Restaurante
                                            </span>
                                        )}
                                    </td>

                                    {/* Restaurant */}
                                    <td className="px-5 py-3">
                                        {editingId === user.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    aria-label="Asignar restaurante"
                                                    className="bg-neutral-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-red-500/50"
                                                    defaultValue={user.restaurant_id || '__none__'}
                                                    onChange={(e) => handleRestaurantChange(user.id, e.target.value)}
                                                    disabled={!!loadingId}
                                                >
                                                    <option value="__none__">Sin asignar</option>
                                                    {restaurants.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                {loadingId === user.id && <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingId(user.id)}
                                                className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors group"
                                            >
                                                {user.restaurant_name || (
                                                    <span className="text-neutral-600 italic">Sin asignar</span>
                                                )}
                                                <ChevronDown className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                                            </button>
                                        )}
                                    </td>

                                    {/* Created */}
                                    <td className="px-5 py-3 text-neutral-500">
                                        {formatDate(user.created_at)}
                                    </td>

                                    {/* Last Login */}
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-1.5 text-neutral-500">
                                            <Clock className="w-3 h-3" />
                                            <span title={formatDateTime(user.last_sign_in_at)}>
                                                {getTimeSince(user.last_sign_in_at)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                                        No hay usuarios registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
