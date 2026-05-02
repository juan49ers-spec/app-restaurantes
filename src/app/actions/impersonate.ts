'use server'

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/admin"
import { logAuditEvent } from "@/lib/audit"
import { createClient } from "@/lib/supabaseServer"

export async function startImpersonation(restaurantId: string, restaurantName: string) {
    const admin = await requireAdmin()

    const supabase = await createClient()
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('id', restaurantId)
        .maybeSingle()

    if (!restaurant) {
        throw new Error("Restaurant not found")
    }

    await logAuditEvent({
        action: 'impersonation_start',
        target_type: 'restaurant',
        target_id: restaurantId,
        metadata: { admin_email: admin.email, restaurant_name: restaurant.name }
    })

    const cookieStore = await cookies()
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 1800, // 30 minutes auto-expire
    }

    cookieStore.set('impersonated_restaurant_id', restaurant.id, cookieOptions)
    cookieStore.set('impersonated_restaurant_name', restaurant.name, cookieOptions)

    redirect('/')
}

export async function stopImpersonation() {
    const admin = await requireAdmin()

    const cookieStore = await cookies()
    const impersonatedId = cookieStore.get('impersonated_restaurant_id')?.value

    if (impersonatedId) {
        await logAuditEvent({
            action: 'impersonation_stop',
            target_type: 'restaurant',
            target_id: impersonatedId,
            metadata: { admin_email: admin.email }
        })
    }

    cookieStore.delete('impersonated_restaurant_id')
    cookieStore.delete('impersonated_restaurant_name')

    redirect('/admin/restaurants')
}

export async function getImpersonatedContext() {
    const cookieStore = await cookies()
    const id = cookieStore.get('impersonated_restaurant_id')?.value || null
    const name = cookieStore.get('impersonated_restaurant_name')?.value || null
    return { id, name }
}
