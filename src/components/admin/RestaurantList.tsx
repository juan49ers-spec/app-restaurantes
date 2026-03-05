'use client'

import { useState } from 'react'
import { RestaurantModules } from '@/types/schema'
import { toggleRestaurantModule, deleteRestaurant } from '@/app/actions/admin'
import { startImpersonation } from '@/app/actions/impersonate'
import { AdminRestaurantRow } from '@/app/actions/admin-queries'
import { toast } from 'sonner'
import { Loader2, Utensils, Settings, Trash2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RestaurantListProps {
    initialRestaurants: AdminRestaurantRow[]
}

export function RestaurantList({ initialRestaurants }: RestaurantListProps) {
    const [restaurants, setRestaurants] = useState<AdminRestaurantRow[]>(initialRestaurants)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleToggle = async (
        restaurantId: string,
        module: keyof RestaurantModules,
        currentValue: 'none' | 'basic' | 'premium'
    ) => {
        const levels: ('none' | 'basic' | 'premium')[] = ['none', 'basic', 'premium']
        const nextLevelIndex = (levels.indexOf(currentValue) + 1) % levels.length
        const nextLevel = levels[nextLevelIndex]

        setLoadingId(`${restaurantId}-${module}`)

        try {
            await toggleRestaurantModule(restaurantId, module, nextLevel)

            setRestaurants(prev => prev.map(r => {
                if (r.id === restaurantId) {
                    return {
                        ...r,
                        modules: {
                            ...r.modules,
                            [module]: nextLevel
                        }
                    } as AdminRestaurantRow
                }
                return r
            }))

            const moduleNames = {
                financial_control: 'Control Financiero',
                operativa: 'Operativa (Menú e Inventario)',
                proveedores: 'Proveedores',
                personal: 'Personal'
            }
            toast.success(`Módulo ${moduleNames[module]} → ${nextLevel.toUpperCase()}`)
        } catch {
            toast.error("Error al actualizar el módulo")
        } finally {
            setLoadingId(null)
        }
    }

    const handleImpersonate = async (restaurantId: string, restaurantName: string) => {
        setLoadingId(`impersonate-${restaurantId}`)
        try {
            await startImpersonation(restaurantId, restaurantName)
            toast.success(`Iniciando sesión como "${restaurantName}"...`)
        } catch {
            toast.error("Error al iniciar modo administrador")
            setLoadingId(null)
        }
    }

    const handleDelete = async (restaurantId: string, restaurantName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el restaurante "${restaurantName}" y todos sus datos asociados?`)) return;

        setLoadingId(`delete-${restaurantId}`)
        try {
            await deleteRestaurant(restaurantId)
            setRestaurants(prev => prev.filter(r => r.id !== restaurantId))
            toast.success(`Restaurante "${restaurantName}" eliminado correctamente`)
        } catch {
            toast.error("Error al eliminar el restaurante")
        } finally {
            setLoadingId(null)
        }
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'premium': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            case 'basic': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            default: return 'bg-white/5 text-neutral-500 border-white/10'
        }
    }

    return (
        <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-neutral-400" />
                    <h2 className="text-sm font-bold text-white">Módulos por Restaurante</h2>
                    <span className="text-[10px] text-neutral-500 ml-1">({restaurants.length})</span>
                </div>
                <p className="text-[10px] text-neutral-500">Click para rotar: NONE → BASIC → PREMIUM</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5 text-neutral-500">
                            <th className="text-left px-5 py-3 font-medium">Restaurante</th>
                            <th className="text-left px-5 py-3 font-medium">Alta</th>
                            <th className="text-center px-5 py-3 font-medium">Control Financiero</th>
                            <th className="text-center px-5 py-3 font-medium">Operativa (Menú e Inst.)</th>
                            <th className="text-center px-5 py-3 font-medium">Proveedores</th>
                            <th className="text-center px-5 py-3 font-medium">Personal</th>
                            <th className="text-right px-5 py-3 font-medium">ID</th>
                            <th className="text-right px-5 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {restaurants.map((restaurant) => (
                            <tr key={restaurant.id} className="hover:bg-white/[0.03] transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg flex items-center justify-center">
                                            <Utensils className="w-3.5 h-3.5 text-neutral-300" />
                                        </div>
                                        <span className="font-medium text-neutral-200">{restaurant.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-neutral-500">
                                    {restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'financial_control', (restaurant.modules?.financial_control as 'none' | 'basic' | 'premium') || 'none')}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all hover:scale-105 active:scale-95",
                                            getStatusStyle(restaurant.modules?.financial_control || 'none')
                                        )}
                                    >
                                        {loadingId === `${restaurant.id}-financial_control` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.financial_control?.toUpperCase() || 'NONE'}
                                    </button>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'operativa', (restaurant.modules?.operativa as 'none' | 'basic' | 'premium') || 'none')}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all hover:scale-105 active:scale-95",
                                            getStatusStyle(restaurant.modules?.operativa || 'none')
                                        )}
                                    >
                                        {loadingId === `${restaurant.id}-operativa` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.operativa?.toUpperCase() || 'NONE'}
                                    </button>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'proveedores', (restaurant.modules?.proveedores as 'none' | 'basic' | 'premium') || 'none')}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all hover:scale-105 active:scale-95",
                                            getStatusStyle(restaurant.modules?.proveedores || 'none')
                                        )}
                                    >
                                        {loadingId === `${restaurant.id}-proveedores` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.proveedores?.toUpperCase() || 'NONE'}
                                    </button>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'personal', (restaurant.modules?.personal as 'none' | 'basic' | 'premium') || 'none')}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all hover:scale-105 active:scale-95",
                                            getStatusStyle(restaurant.modules?.personal || 'none')
                                        )}
                                    >
                                        {loadingId === `${restaurant.id}-personal` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.personal?.toUpperCase() || 'NONE'}
                                    </button>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <span className="text-[10px] text-neutral-600 font-mono">{restaurant.id?.slice(0, 8)}...</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            title="Ver como este local"
                                            disabled={!!loadingId}
                                            onClick={() => handleImpersonate(restaurant.id!, restaurant.name || 'Desconocido')}
                                            className="p-1.5 text-neutral-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors flex items-center justify-center"
                                        >
                                            {loadingId === `impersonate-${restaurant.id}` ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            title="Eliminar restaurante"
                                            disabled={!!loadingId}
                                            onClick={() => handleDelete(restaurant.id!, restaurant.name || 'Desconocido')}
                                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex items-center justify-center"
                                        >
                                            {loadingId === `delete-${restaurant.id}` ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {restaurants.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-12 text-center text-neutral-500">
                                    No hay restaurantes registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
