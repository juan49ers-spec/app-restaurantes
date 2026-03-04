'use server'

import { createClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']

const broadcastSchema = z.object({
    title: z.string().min(1, 'El título es obligatorio'),
    content: z.string().min(1, 'El contenido es obligatorio'),
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'SUCCESS']),
    target_type: z.enum(['ALL', 'SPECIFIC']),
    target_restaurant_ids: z.array(z.string().uuid()).optional(),
    expires_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Fecha de expiración inválida',
    }),
})

export async function requireSuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email.trim().toLowerCase())) {
        throw new Error('No tienes permisos de super_admin')
    }

    return { supabase, user }
}

export async function createBroadcast(rawData: unknown) {
    const { supabase, user } = await requireSuperAdmin()

    const result = broadcastSchema.safeParse(rawData)
    if (!result.success) {
        return { success: false, error: result.error.flatten() }
    }

    const { error } = await supabase
        .from('global_broadcasts')
        .insert({
            ...result.data,
            created_by: user.id
        })

    if (error) {
        console.error('Error creating broadcast:', error)
        return { success: false, error: 'Error al crear el anuncio' }
    }

    revalidatePath('/')
    return { success: true }
}

export async function getActiveBroadcasts() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('global_broadcasts')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching broadcasts:', error)
        return []
    }

    return data
}

export async function deleteBroadcast(id: string) {
    const { supabase } = await requireSuperAdmin()

    const { error } = await supabase
        .from('global_broadcasts')
        .update({ is_active: false })
        .eq('id', id)

    if (error) {
        console.error('Error deleting broadcast:', error)
        return { success: false, error: 'Error al eliminar el anuncio' }
    }

    revalidatePath('/')
    return { success: true }
}
