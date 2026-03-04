'use server'

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireAdmin } from "./admin-queries"

export async function startImpersonation(restaurantId: string, restaurantName: string) {
    await requireAdmin()

    const cookieStore = await cookies()
    // Storing ID and Name to show it in the banner easily
    cookieStore.set('impersonated_restaurant_id', restaurantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    })
    cookieStore.set('impersonated_restaurant_name', restaurantName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    })

    // Redirige al dashboard normal (viendo como restaurante)
    redirect('/')
}

export async function stopImpersonation() {
    await requireAdmin()

    const cookieStore = await cookies()
    cookieStore.delete('impersonated_restaurant_id')
    cookieStore.delete('impersonated_restaurant_name')

    // Regresar al panel de admin
    redirect('/admin/restaurants')
}

export async function getImpersonatedContext() {
    const cookieStore = await cookies()
    const id = cookieStore.get('impersonated_restaurant_id')?.value || null
    const name = cookieStore.get('impersonated_restaurant_name')?.value || null
    return { id, name }
}
