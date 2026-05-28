'use server';

import { createActionLogger } from '@/lib/logger'
import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { BillingModule, UpdateModuleParams } from '@/types/billing';

import { requireSuperAdmin } from './broadcasts';

const log = createActionLogger('billing-config')

/**
 * Obtiene la configuración de todos los módulos de facturación desde la base de datos.
 */
export async function getBillingModulesConfig(): Promise<BillingModule[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('billing_modules')
        .select('*')
        .order('is_base', { ascending: false })
        .order('price_monthly', { ascending: true });

    if (error) {
        log.error({ err: error }, 'Error fetching billing modules');
        throw new Error('No se pudo cargar la configuración de los módulos');
    }

    return (data || []).map((module) => ({
        ...module,
        description: module.description || '',
        price_monthly: Number(module.price_monthly || 0),
        price_yearly: Number(module.price_yearly || 0),
        features: Array.isArray(module.features) ? module.features : [],
        is_active: Boolean(module.is_active),
        is_base: Boolean(module.is_base),
    })) as BillingModule[];
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
        log.error({ err: error }, 'Error updating billing module');
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/billing');
    return { success: true };
}
