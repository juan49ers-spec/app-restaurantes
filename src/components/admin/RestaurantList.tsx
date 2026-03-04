'use client'

import { useState } from 'react'
import { Restaurant, RestaurantModules } from '@/types/schema'
import { toggleRestaurantModule } from '@/app/actions/admin'
import { toast } from 'sonner'
import { Loader2, Utensils, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RestaurantListProps {
    initialRestaurants: Restaurant[]
}

export function RestaurantList({ initialRestaurants }: RestaurantListProps) {
    const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants)
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
                    } as Restaurant
                }
                return r
            }))

            toast.success(`Módulo ${module === 'financial_control' ? 'Control Financiero' : 'Ingeniería de Menú'} → ${nextLevel.toUpperCase()}`)
        } catch {
            toast.error("Error al actualizar el módulo")
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
                            <th className="text-center px-5 py-3 font-medium">Ingeniería de Menú</th>
                            <th className="text-right px-5 py-3 font-medium">ID</th>
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
                                    {new Date(restaurant.created_at || '').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'financial_control', restaurant.modules?.financial_control || 'none')}
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
                                        onClick={() => handleToggle(restaurant.id!, 'menu_engineering', restaurant.modules?.menu_engineering || 'none')}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all hover:scale-105 active:scale-95",
                                            getStatusStyle(restaurant.modules?.menu_engineering || 'none')
                                        )}
                                    >
                                        {loadingId === `${restaurant.id}-menu_engineering` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.menu_engineering?.toUpperCase() || 'NONE'}
                                    </button>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <span className="text-[10px] text-neutral-600 font-mono">{restaurant.id?.slice(0, 8)}...</span>
                                </td>
                            </tr>
                        ))}
                        {restaurants.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
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
