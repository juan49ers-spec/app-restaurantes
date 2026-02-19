'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"

/**
 * Confirm a match between a pending item and an existing master ingredient
 */
export async function confirmValidation(
    bufferId: string,
    masterIngredientId: string,
    restaurantId: string
) {
    const supabase = await createClient()

    // 1. Get the buffer item details
    const { data: bufferItem, error: fetchError } = await supabase
        .from('ingestion_buffer')
        .select('*')
        .eq('id', bufferId)
        .single()

    if (fetchError || !bufferItem) {
        throw new Error('Item not found in validation buffer')
    }

    // 2. Create the permanent link in supplier_items
    const { error: insertError } = await supabase
        .from('supplier_items')
        .insert({
            restaurant_id: restaurantId,
            supplier_id: bufferItem.supplier_id,
            name_on_invoice: bufferItem.raw_name,
            last_price: bufferItem.raw_price,
            pack_size: bufferItem.raw_quantity || 1,
            master_ingredient_id: masterIngredientId
        })

    if (insertError) {
        console.error("Error inserting into supplier_items:", insertError)
        throw insertError
    }

    // 3. Update master ingredient price (optional but recommended)
    if (bufferItem.raw_price && bufferItem.raw_quantity) {
        const unitPrice = bufferItem.raw_price / bufferItem.raw_quantity
        await supabase.from('master_ingredients')
            .update({ current_avg_price: unitPrice, last_updated_at: new Date().toISOString() })
            .eq('id', masterIngredientId)

        // Log price history
        await supabase.from('price_history').insert({
            ingredient_id: masterIngredientId,
            supplier_id: bufferItem.supplier_id,
            price: unitPrice,
            date: new Date().toISOString().split('T')[0]
        })
    }

    // 4. Mark buffer item as RESOLVED
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
        .from('ingestion_buffer')
        .update({
            status: 'CONFIRMED',
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id
        })
        .eq('id', bufferId)

    revalidatePath('/admin/invoice-validation')
}

/**
 * Skip a validation item (mark as SKIPPED)
 */
export async function skipValidation(bufferId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
        .from('ingestion_buffer')
        .update({
            status: 'SKIPPED',
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id
        })
        .eq('id', bufferId)

    revalidatePath('/admin/invoice-validation')
}

/**
 * Create a new Master Ingredient and map the pending item to it
 */
export async function createAndMapIngredient(
    bufferId: string,
    restaurantId: string,
    _supplierId: string,
    newIngredientName: string,
    _rawNameOnInvoice: string,
    _rawPrice: number
) {
    const supabase = await createClient()

    // 1. Create the new Master Ingredient
    const { data: newIngredient, error: createError } = await supabase
        .from('master_ingredients')
        .insert({
            restaurant_id: restaurantId,
            name: newIngredientName,
            base_unit: 'kg', // Defaulting to kg, ideally user selects this
            current_avg_price: 0 // Will update in next step or logic
        })
        .select('id')
        .single()

    if (createError) throw createError

    // 2. Call confirmValidation to link and finalize
    // We reuse the logic to ensure consistency
    await confirmValidation(bufferId, newIngredient.id, restaurantId)

    revalidatePath('/admin/invoice-validation')
    return newIngredient
}
