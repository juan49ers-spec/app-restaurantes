'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "./broadcasts"
import { AddonId, PlanModuleAccess, calculateEffectiveAccess } from "@/lib/plan-definitions"
import { getBillingModulesConfig } from "./billing-config"

export interface BillingEvent {
    id: string
    restaurant_id: string
    event_type: 'PLAN_CHANGE' | 'CREDIT_ADJUSTMENT' | 'PAYMENT' | 'REFUND'
    amount: number
    details: {
        previousAddons?: AddonId[]
        newAddons?: AddonId[]
        reason?: string
        concept?: string
        creditChange?: number
    }
    created_at: string
    created_by: string | null
    authorName?: string
}

export interface BillingOverview {
    totalRestaurants: number
    addonDistribution: Record<AddonId | 'CORE', number>
    estimatedMonthlyRevenue: number
    totalOcrCreditsInCirculation: number
}

export interface RestaurantBillingInfo {
    id: string
    name: string
    active_addons: AddonId[]
    plan_updated_at: string
    ocr_credits: number
    modules: PlanModuleAccess
}

export async function getBillingOverview(): Promise<BillingOverview> {
    await requireSuperAdmin()
    const supabase = await createClient()
    const billingConfigs = await getBillingModulesConfig()

    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('active_addons, ocr_credits')

    if (error) throw new Error("Failed to fetch restaurants for billing overview")

    // Map units for quick lookup
    const moduleMap = new Map(billingConfigs.map(m => [m.id, m]));
    const baseModule = billingConfigs.find(m => m.is_base);

    const distribution: Record<AddonId | 'CORE', number> = {
        CORE: 0,
        operativa: 0,
        personal: 0,
        proveedores: 0
    }
    let revenue = 0
    let totalCredits = 0

    restaurants.forEach(r => {
        distribution.CORE++
        revenue += baseModule?.price_monthly || 0;

        const addons = (r.active_addons as AddonId[]) || []

        addons.forEach(addon => {
            if (distribution[addon] !== undefined) {
                distribution[addon]++
                revenue += moduleMap.get(addon)?.price_monthly || 0;
            }
        })

        totalCredits += (r.ocr_credits || 0)
    })

    return {
        totalRestaurants: restaurants.length,
        addonDistribution: distribution,
        estimatedMonthlyRevenue: revenue,
        totalOcrCreditsInCirculation: totalCredits
    }
}

export async function getRestaurantsBillingList(): Promise<RestaurantBillingInfo[]> {
    await requireSuperAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, active_addons, plan_updated_at, ocr_credits, modules')
        .order('name')

    if (error) throw new Error("Failed to fetch restaurants billing data")

    return data.map(r => ({
        id: r.id,
        name: r.name,
        active_addons: (r.active_addons as AddonId[]) || [],
        plan_updated_at: r.plan_updated_at || new Date().toISOString(),
        ocr_credits: r.ocr_credits || 0,
        modules: r.modules as PlanModuleAccess
    }))
}

export async function changeRestaurantPlan(restaurantId: string, newAddons: AddonId[], reason?: string) {
    const { user: adminUser } = await requireSuperAdmin()
    const supabase = await createClient()
    const billingConfigs = await getBillingModulesConfig()

    // Validate addons against DB config
    const activeModuleIds = new Set(billingConfigs.map(m => m.id))
    newAddons.forEach(a => {
        if (!activeModuleIds.has(a)) throw new Error(`Invalid or inactive addon id: ${a}`)
    })

    // 1. Get current data
    const { data: currentContext, error: fetchErr } = await supabase
        .from('restaurants')
        .select('active_addons')
        .eq('id', restaurantId)
        .single()

    if (fetchErr) throw new Error("Error fetching current plan")
    const oldAddons = (currentContext.active_addons as AddonId[]) || []

    const effectiveModules = calculateEffectiveAccess(newAddons)

    // Calculate price based on DB config
    const moduleMap = new Map(billingConfigs.map(m => [m.id, m]));
    const basePrice = billingConfigs.find(m => m.is_base)?.price_monthly || 0;
    const addonsPrice = newAddons.reduce((acc, id) => acc + (moduleMap.get(id)?.price_monthly || 0), 0);
    const newPrice = basePrice + addonsPrice;

    // 2. Update restaurant
    const { error: updateErr } = await supabase
        .from('restaurants')
        .update({
            active_addons: newAddons,
            plan_updated_at: new Date().toISOString(),
            modules: effectiveModules
        })
        .eq('id', restaurantId)

    if (updateErr) throw new Error("Error updating restaurant plan: " + updateErr.message)

    // 3. Log event
    const { error: eventErr } = await supabase
        .from('billing_events')
        .insert({
            restaurant_id: restaurantId,
            event_type: 'PLAN_CHANGE',
            amount: newPrice, // Registramos el nuevo valor para histórico
            details: {
                previousAddons: oldAddons,
                newAddons: newAddons,
                reason: reason || 'Manual addons update via admin dashboard'
            },
            created_by: adminUser.id
        })

    if (eventErr) console.error("Could not log billing event:", eventErr)

    revalidatePath('/admin/billing')
    // Revalidar el layout raíz para que el sidebar del restaurante
    // re-lea active_addons y muestre/oculte las secciones correctas
    revalidatePath('/', 'layout')
    return true
}

export async function adjustCredits(restaurantId: string, creditChange: number, reason: string) {
    const { user: adminUser } = await requireSuperAdmin()
    const supabase = await createClient()

    if (!reason) throw new Error("A reason must be provided")

    // 1. Get current credits
    const { data: res, error: fetchErr } = await supabase
        .from('restaurants')
        .select('ocr_credits')
        .eq('id', restaurantId)
        .single()

    if (fetchErr) throw new Error("Error fetching restaurant")

    const currentCredits = res.ocr_credits || 0
    const newCredits = Math.max(0, currentCredits + creditChange) // Prevents negative

    // 2. Update credits
    const { error: updateErr } = await supabase
        .from('restaurants')
        .update({ ocr_credits: newCredits })
        .eq('id', restaurantId)

    if (updateErr) throw new Error("Error updating credits")

    // 3. Log event
    await supabase.from('billing_events').insert({
        restaurant_id: restaurantId,
        event_type: 'CREDIT_ADJUSTMENT',
        amount: 0,
        details: {
            creditChange,
            reason
        },
        created_by: adminUser.id
    })

    revalidatePath('/admin/billing')
    return { previous: currentCredits, new: newCredits }
}

export async function registerPayment(restaurantId: string, amount: number, concept: string) {
    const { user: adminUser } = await requireSuperAdmin()
    const supabase = await createClient()

    if (!amount || amount <= 0) throw new Error("Amount must be positive")
    if (!concept) throw new Error("Concept is required")

    const { error: eventErr } = await supabase
        .from('billing_events')
        .insert({
            restaurant_id: restaurantId,
            event_type: 'PAYMENT',
            amount,
            details: { concept },
            created_by: adminUser.id
        })

    if (eventErr) throw new Error("Error registering payment: " + eventErr.message)

    revalidatePath('/admin/billing')
    return true
}

export async function getBillingHistory(restaurantId: string): Promise<BillingEvent[]> {
    await requireSuperAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('billing_events')
        .select(`
            *,
            created_by_profile:created_by ( /* pseudo-join */ )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw new Error("Failed to fetch billing history: " + error.message)

    return data as unknown as BillingEvent[]
}
