'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "./broadcasts" // Reusing super admin check
import { PLANS, PlanTier, PlanModuleAccess } from "@/lib/plan-definitions"

// Tipos extraídos de la BD (si se vuelven a generar types, esto ayudará, pero por ahora los creamos aquí basados en la migración)
export interface BillingEvent {
    id: string
    restaurant_id: string
    event_type: 'PLAN_CHANGE' | 'CREDIT_ADJUSTMENT' | 'PAYMENT' | 'REFUND'
    amount: number
    details: {
        previousPlan?: string
        newPlan?: string
        reason?: string
        concept?: string
        creditChange?: number
    }
    created_at: string
    created_by: string | null
    authorName?: string // added post-query for UI
}

export interface BillingOverview {
    totalRestaurants: number
    planDistribution: Record<PlanTier, number>
    estimatedMonthlyRevenue: number
    totalOcrCreditsInCirculation: number
}

export interface RestaurantBillingInfo {
    id: string
    name: string
    current_plan: PlanTier
    plan_updated_at: string
    ocr_credits: number
    modules: PlanModuleAccess
}

/**
 * Obtener un resumen global de facturación para el dashboard principal del Billing Manager
 */
export async function getBillingOverview(): Promise<BillingOverview> {
    await requireSuperAdmin()
    const supabase = await createClient()

    const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('current_plan, ocr_credits')

    if (error) throw new Error("Failed to fetch restaurants for billing overview")

    const distribution: Record<PlanTier, number> = { FREE: 0, STARTER: 0, PRO: 0, ENTERPRISE: 0 }
    let revenue = 0
    let totalCredits = 0

    restaurants.forEach(r => {
        const plan = (r.current_plan as PlanTier) || 'FREE'

        if (distribution[plan] !== undefined) {
            distribution[plan]++
        } else {
            distribution[plan] = 1
        }

        const planDef = PLANS[plan]
        if (planDef) {
            revenue += planDef.monthlyPrice
        }

        totalCredits += (r.ocr_credits || 0)
    })

    return {
        totalRestaurants: restaurants.length,
        planDistribution: distribution,
        estimatedMonthlyRevenue: revenue,
        totalOcrCreditsInCirculation: totalCredits
    }
}

/**
 * Obtener listado de restaurantes con su información de facturación actual
 */
export async function getRestaurantsBillingList(): Promise<RestaurantBillingInfo[]> {
    await requireSuperAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, current_plan, plan_updated_at, ocr_credits, modules')
        .order('name')

    if (error) throw new Error("Failed to fetch restaurants billing data")

    return data.map(r => ({
        id: r.id,
        name: r.name,
        current_plan: (r.current_plan as PlanTier) || 'FREE',
        plan_updated_at: r.plan_updated_at || new Date().toISOString(),
        ocr_credits: r.ocr_credits || 0,
        modules: r.modules as PlanModuleAccess
    }))
}

/**
 * Cambiar el plan de un restaurante. Se usa para asignar STARTER, PRO, etc.
 * Actualiza el current_plan, reinicia la fecha, ajusta modules y añade evento a billing_events.
 */
export async function changeRestaurantPlan(restaurantId: string, newPlanTier: PlanTier, reason?: string) {
    const { user: adminUser } = await requireSuperAdmin()
    const supabase = await createClient()

    const planDef = PLANS[newPlanTier]
    if (!planDef) throw new Error("Invalid plan tier")

    // 1. Get current data
    const { data: currentContext, error: fetchErr } = await supabase
        .from('restaurants')
        .select('current_plan')
        .eq('id', restaurantId)
        .single()

    if (fetchErr) throw new Error("Error fetching current plan")
    const oldPlan = currentContext.current_plan

    // 2. Update restaurant
    const { error: updateErr } = await supabase
        .from('restaurants')
        .update({
            current_plan: newPlanTier,
            plan_updated_at: new Date().toISOString(),
            modules: planDef.modules, // Update modules config based on new plan
            // Optional: You could choose to add includedOcrCredits here instead of ignoring them
            // ocr_credits: supabase.raw(`ocr_credits + ${planDef.includedOcrCredits}`) 
            // Para simplificar, asumimos que agregar créditos de suscripción es un proceso batch/cron mensual,
            // pero podríamos sumarlos aquí si fuese un "primer pago" real.
        })
        .eq('id', restaurantId)

    if (updateErr) throw new Error("Error updating restaurant plan: " + updateErr.message)

    // 3. Log event
    const { error: eventErr } = await supabase
        .from('billing_events')
        .insert({
            restaurant_id: restaurantId,
            event_type: 'PLAN_CHANGE',
            amount: planDef.monthlyPrice, // Registramos el valor del plan para histórico
            details: {
                previousPlan: oldPlan || 'FREE',
                newPlan: newPlanTier,
                reason: reason || 'Manual update via admin dashboard'
            },
            created_by: adminUser.id
        })

    if (eventErr) console.error("Could not log billing event:", eventErr) // Non-fatal

    revalidatePath('/admin/billing')
    return true
}

/**
 * Ajustar créditos OCR manualmente (agregar o quitar)
 */
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

/**
 * Registrar el pago manual de un cliente
 */
export async function registerPayment(restaurantId: string, amount: number, concept: string) {
    const { user: adminUser } = await requireSuperAdmin()
    const supabase = await createClient()

    if (!amount || amount <= 0) throw new Error("Amount must be positive")
    if (!concept) throw new Error("Concept is required")

    // Usaremos la RPC "admin_execute_sql" si necesitamos interactuar sin pasar por RLS, 
    // pero billing_events está abierta para superadmins
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

/**
 * Obtener historial de facturación de un restaurante específico
 */
export async function getBillingHistory(restaurantId: string): Promise<BillingEvent[]> {
    await requireSuperAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('billing_events')
        .select(`
            *,
            created_by_profile:created_by ( /* pseudo-join if profile doesn't exist, we will use email */ )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw new Error("Failed to fetch billing history: " + error.message)

    return data as unknown as BillingEvent[]
}
