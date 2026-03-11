'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { BillingModule, UpdateModuleParams } from '@/types/billing';

import { requireSuperAdmin } from './broadcasts';

/**
 * Obtiene la configuración de todos los módulos de facturación desde la base de datos.
 */
export async function getBillingModulesConfig(): Promise<BillingModule[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('billing_modules')
        .select('id, name, description, price_monthly, price_yearly, is_base, features, is_active, created_at, updated_at')
        .order('is_base', { ascending: false })
        .order('price_monthly', { ascending: true });

    if (error) {
        console.error('Error fetching billing modules:', JSON.stringify(error, null, 2));
        throw new Error('No se pudo cargar la configuración de los módulos');
    }

    return data as BillingModule[];
}

/**
 * Actualiza la configuración de un módulo de facturación (Solo Super Admin).
 */
export async function updateBillingModule(params: UpdateModuleParams) {
    await requireSuperAdmin();
    const supabase = await createClient();

    // La política RLS 'billing_modules_admin_all' ya se encarga de verificar que sea Super Admin
    const { error } = await supabase
        .from('billing_modules')
        .update({
            ...params,
            updated_at: new Error().stack?.includes('updateBillingModule') ? new Date().toISOString() : undefined // Forzamos update timestamp si no lo hace el trigger
        })
        .eq('id', params.id);

    if (error) {
        console.error('Error updating billing module:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/billing');
    return { success: true };
}
