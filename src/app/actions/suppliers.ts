'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { revalidatePath } from "next/cache"
import { SupplierSchema, Supplier } from "@/types/schema"

export async function getSuppliers() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('suppliers')
        .select('id, restaurant_id, name, tax_id, contact_email, contact_phone, payment_terms, created_at, reliability_score, trend_direction, total_orders, avg_price_variance, contract_renewal_date, last_price_audit')
        .eq('restaurant_id', restaurantId)
        .order('name')

    if (error) throw new Error(error.message)
    return data as Supplier[]
}

export async function getSupplier(id: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('suppliers')
        .select('id, restaurant_id, name, tax_id, contact_email, contact_phone, payment_terms, created_at, reliability_score, trend_direction, total_orders, avg_price_variance, contract_renewal_date, last_price_audit')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

    if (error) throw new Error(error.message)
    return data as Supplier
}

export async function createSupplier(formData: FormData) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const rawData = {
        restaurant_id: restaurantId,
        name: formData.get('name') as string,
        tax_id: formData.get('tax_id') as string,
        contact_email: formData.get('contact_email') as string,
        contact_phone: formData.get('contact_phone') as string
    }

    // Validate with Zod
    const validated = SupplierSchema.parse(rawData)

    const { error } = await supabase
        .from('suppliers')
        .insert(validated)

    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
}

export async function updateSupplier(id: string, formData: FormData) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant() // Verify ownership implicitly via RLS but good practice

    const rawData = {
        name: formData.get('name') as string,
        tax_id: formData.get('tax_id') as string,
        contact_email: formData.get('contact_email') as string,
        contact_phone: formData.get('contact_phone') as string
    }

    const { error } = await supabase
        .from('suppliers')
        .update(rawData)
        .eq('id', id)
        .eq('restaurant_id', restaurantId) // Extra safety

    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
    revalidatePath(`/suppliers/${id}`)
}

export async function deleteSupplier(id: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', restaurantId)

    if (error) throw new Error(error.message)
    revalidatePath('/suppliers')
}
