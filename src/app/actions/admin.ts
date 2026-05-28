'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { z } from 'zod'
import { requireAdmin } from "./admin-queries"

const log = createActionLogger('admin')

const ConsultantAccessSchema = z.object({
    consultantUserId: z.string().uuid(),
    restaurantId: z.string().uuid(),
    role: z.enum(['CONSULTANT', 'VIEWER']).default('CONSULTANT'),
    status: z.enum(['ACTIVE', 'PAUSED', 'REVOKED']).default('ACTIVE'),
})

const UpdateConsultantAccessStatusSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['ACTIVE', 'PAUSED', 'REVOKED']),
})

export async function toggleRestaurantModule(
    restaurantId: string,
    module: 'financial_control' | 'operativa' | 'proveedores' | 'personal',
    level: 'none' | 'basic' | 'premium'
) {
    await requireAdmin()
    const supabase = await createClient()

    const { data: current, error: fetchError } = await supabase
        .from('restaurants')
        .select('modules, active_addons')
        .eq('id', restaurantId)
        .single()

    if (fetchError) throw new Error("Restaurant not found")

    const updatedModules = {
        ...current.modules,
        [module]: level
    }

    // Sincronizar active_addons basado en los módulos activos
    // Cada addon corresponde a módulos específicos del sidebar
    const activeAddons: string[] = []
    const isActive = (mod: string) => {
        const val = updatedModules[mod]
        return val === 'basic' || val === 'premium'
    }
    if (isActive('operativa')) activeAddons.push('operativa')
    if (isActive('proveedores')) activeAddons.push('proveedores')
    if (isActive('personal')) activeAddons.push('personal')

    const { error } = await supabase
        .from('restaurants')
        .update({
            modules: updatedModules,
            active_addons: activeAddons
        })
        .eq('id', restaurantId)

    if (error) {
        log.error({ err: error }, "Error updating module")
        throw new Error("Failed to update module")
    }

    revalidatePath('/admin')
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function updateUserRestaurant(
    userId: string,
    restaurantId: string | null
) {
    await requireAdmin()
    const supabase = await createClient()

    const { error } = await supabase.rpc('admin_update_user_restaurant', {
        target_user_id: userId,
        new_restaurant_id: restaurantId
    })

    if (error) {
        log.error({ err: error }, "Error updating user restaurant")
        throw new Error("Failed to update user restaurant")
    }

    revalidatePath('/admin/users')
    return { success: true }
}

export async function deleteRestaurant(restaurantId: string) {
    await requireAdmin()
    const supabase = await createClient()

    // Call the cascading RPC function to safely delete the restaurant and all its related records
    log.info({ restaurantId }, "Attempting to delete restaurant")
    const { error } = await supabase.rpc('admin_delete_restaurant_cascade', {
        target_restaurant_id: restaurantId
    })

    if (error) {
        log.error({ err: error, restaurantId, code: error.code, details: error.details, hint: error.hint }, "Error deleting restaurant")
        throw new Error(`No se pudo eliminar: [${error.code}] ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')
    return { success: true }
}

export async function upsertConsultantRestaurantAccess(
    input: z.input<typeof ConsultantAccessSchema>
) {
    await requireAdmin()
    const parsed = ConsultantAccessSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: 'Datos de acceso inválidos.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('consultant_restaurants')
        .upsert({
            consultant_user_id: parsed.data.consultantUserId,
            restaurant_id: parsed.data.restaurantId,
            role: parsed.data.role,
            status: parsed.data.status,
        }, { onConflict: 'consultant_user_id,restaurant_id' })

    if (error) {
        log.error({ err: error }, 'Error upserting consultant restaurant access')
        return { success: false, error: 'No se pudo guardar la relación consultor-restaurante.' }
    }

    revalidatePath('/admin/consultants')
    revalidatePath('/consultant')
    return { success: true }
}

export async function updateConsultantRestaurantAccessStatus(
    input: z.input<typeof UpdateConsultantAccessStatusSchema>
) {
    await requireAdmin()
    const parsed = UpdateConsultantAccessStatusSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: 'Estado de acceso inválido.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('consultant_restaurants')
        .update({ status: parsed.data.status })
        .eq('id', parsed.data.id)

    if (error) {
        log.error({ err: error, relationshipId: parsed.data.id }, 'Error updating consultant restaurant access')
        return { success: false, error: 'No se pudo actualizar la relación consultor-restaurante.' }
    }

    revalidatePath('/admin/consultants')
    revalidatePath('/consultant')
    return { success: true }
}
