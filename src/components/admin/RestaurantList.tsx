'use client'

import { useState } from 'react'
import { Restaurant, RestaurantModules } from '@/types/schema'
import { toggleRestaurantModule } from '@/app/actions/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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
        // Toggle logic: If 'none', go to 'basic'. If 'basic/premium', go to 'none'.
        // For now, let's keep it simple: Toggle between 'none' and 'basic'.
        // Wait, user might want Premium. Let's make it a 3-way toggle or just a dropdown?
        // Simpler for v1: Toggle = Basic vs None. 
        // Better: Click to cycle: None -> Basic -> Premium -> None.

        const levels: ('none' | 'basic' | 'premium')[] = ['none', 'basic', 'premium']
        const nextLevelIndex = (levels.indexOf(currentValue) + 1) % levels.length
        const nextLevel = levels[nextLevelIndex]

        setLoadingId(`${restaurantId}-${module}`)

        try {
            await toggleRestaurantModule(restaurantId, module, nextLevel)

            // Optimistic update
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

            toast.success(`Module ${module} updated to ${nextLevel}`)
        } catch {
            toast.error("Failed to update module")
        } finally {
            setLoadingId(null)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'premium': return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'basic': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registered Restaurants ({restaurants.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Restaurant Name</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Financial Control</TableHead>
                            <TableHead>Menu Engineering</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {restaurants.map((restaurant) => (
                            <TableRow key={restaurant.id}>
                                <TableCell className="font-medium">{restaurant.name}</TableCell>
                                <TableCell>{new Date(restaurant.created_at || '').toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'financial_control', restaurant.modules?.financial_control || 'none')}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${getStatusColor(restaurant.modules?.financial_control || 'none')}`}
                                    >
                                        {loadingId === `${restaurant.id}-financial_control` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.financial_control?.toUpperCase() || 'NONE'}
                                    </button>
                                </TableCell>
                                <TableCell>
                                    <button
                                        disabled={!!loadingId}
                                        onClick={() => handleToggle(restaurant.id!, 'menu_engineering', restaurant.modules?.menu_engineering || 'none')}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${getStatusColor(restaurant.modules?.menu_engineering || 'none')}`}
                                    >
                                        {loadingId === `${restaurant.id}-menu_engineering` && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {restaurant.modules?.menu_engineering?.toUpperCase() || 'NONE'}
                                    </button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="text-xs text-muted-foreground">{restaurant.id?.slice(0, 8)}...</span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
