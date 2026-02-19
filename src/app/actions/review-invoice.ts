'use server'

import { createClient } from "@/lib/supabaseServer"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ScannedItem } from "@/types/schema"
import { revalidatePath } from "next/cache"
import { createAlert } from "./alerts"

type UpdateInvoiceParams = {
    invoice_number: string
    date: string
    supplier_id: string // Mandatory at this stage
    total_amount: number
    items: ScannedItem[]
    mappings: { [key: number]: string } // Index -> Master Ingredient ID or 'new'
    conversions: { [key: number]: number } // Index -> Quantity per Unit (e.g. 12)
}

export async function updateInvoice(invoiceId: string, data: UpdateInvoiceParams) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 1. Transaction-like update (Supabase doesn't support true transactions over HTTP easily without RPC, so we do procedural)

    // Validate Supplier
    if (!data.supplier_id) return { success: false, error: "Proveedor es obligatorio" }

    try {
        // 2. Iterate Items and Handle Mappings
        for (const [indexStr, mappingValue] of Object.entries(data.mappings)) {
            const index = parseInt(indexStr)
            const item = data.items[index]
            let masterIngredientId = mappingValue
            const quantityPerUnit = data.conversions?.[index] || 1

            // 2a. Create New Ingredient if requested
            if (mappingValue === 'new' && item.description) {
                // Determine base unit? Default to 'unit' or 'kg'
                // Ideally prompt user, but for MVP create generic
                const { data: newIng, error: ingError } = await supabase
                    .from('master_ingredients')
                    .insert({
                        restaurant_id: (await getRestaurantId(user.id, supabase)),
                        name: item.description,
                        base_unit: item.unit || 'unit',
                        category: item.category, // Auto-categorization from AI
                        current_avg_price: (item.price || 0) / quantityPerUnit // Normalizar precio a unidad base
                    })
                    .select()
                    .single()

                if (ingError) throw new Error(`Error creando ingrediente: ${ingError.message}`)
                masterIngredientId = newIng.id
            }

            // 2b. Save Alias (Learning)
            // If we have a masterIngredientId (and it's not 'ignore' or 'new'), save link
            if (masterIngredientId && masterIngredientId !== 'ignore' && masterIngredientId !== 'new') {
                const rId = await getRestaurantId(user.id, supabase)

                // Check if alias exists? Or just insert/ignore
                await supabase
                    .from('supplier_aliases')
                    .upsert({
                        restaurant_id: rId,
                        alias_name: item.description || item.line_text,
                        master_ingredient_id: masterIngredientId,
                        supplier_id: data.supplier_id,
                        confidence_score: 1.0,
                        quantity_per_unit: quantityPerUnit
                    }, { onConflict: 'restaurant_id, alias_name' })

                // 2c. Price Intelligence (History & Alerts)
                if (item.price) {
                    // Normalize price to Master Unit
                    // If invoice says 24€ for a Case of 12, Unit Price = 2€
                    const unitPrice = item.price / quantityPerUnit

                    // Fetch previous latest price
                    const { data: lastPrice } = await supabase
                        .from('price_history')
                        .select('price')
                        .eq('restaurant_id', rId)
                        .eq('ingredient_id', masterIngredientId)
                        .order('date', { ascending: false })
                        .limit(1)
                        .single()

                    // Check for Spike (>10%)
                    if (lastPrice && lastPrice.price > 0) {
                        const priceDiff = unitPrice - lastPrice.price
                        const percentChange = priceDiff / lastPrice.price

                        if (percentChange > 0.10) {
                            const estimatedImpact = priceDiff * ((item.qty || 1) * quantityPerUnit) * 4 // Approx monthly impact if weekly purchase
                            await createAlert(
                                'price_spike',
                                `Subida de precio: ${item.description || "Ítem"}`,
                                `El precio ha subido un ${(percentChange * 100).toFixed(0)}% (de ${lastPrice.price}€ a ${unitPrice}€).`,
                                {
                                    ingredient_id: masterIngredientId,
                                    old_price: lastPrice.price,
                                    new_price: unitPrice,
                                    supplier_id: data.supplier_id,
                                    impact_amount: estimatedImpact
                                }
                            )
                        }
                    }

                    // Insert into History
                    await supabase
                        .from('price_history')
                        .insert({
                            restaurant_id: rId,
                            supplier_id: data.supplier_id,
                            ingredient_id: masterIngredientId,
                            price: unitPrice,
                            date: data.date || new Date().toISOString()
                        })

                    // Update Master Average (Simple Moving Average or just latest?)
                    // For now, let's keep it as "Latest Price" for simplicity in UI
                    await supabase
                        .from('master_ingredients')
                        .update({
                            current_avg_price: unitPrice,
                            last_updated_at: new Date()
                        })
                        .eq('id', masterIngredientId)
                }

                // 2d. STOCK INCREASE (The Missing Link)
                if (item.qty && item.qty > 0) {
                    const totalQuantityToAdd = item.qty * quantityPerUnit

                    // Create Stock Movement
                    await supabase.from('stock_movements').insert({
                        restaurant_id: rId,
                        ingredient_id: masterIngredientId,
                        type: 'PURCHASE',
                        quantity: totalQuantityToAdd,
                        reference_id: invoiceId,
                        notes: `Factura ${data.invoice_number || ''}`,
                        date: data.date || new Date().toISOString()
                    })

                    // Update Inventory Table
                    // Check if entry exists first
                    const { data: currentStock } = await supabase
                        .from('inventory_stock')
                        .select('current_qty')
                        .eq('restaurant_id', rId)
                        .eq('ingredient_id', masterIngredientId)
                        .single()

                    if (currentStock) {
                        await supabase.from('inventory_stock')
                            .update({
                                current_qty: currentStock.current_qty + totalQuantityToAdd,
                                last_updated: new Date().toISOString()
                            })
                            .eq('restaurant_id', rId)
                            .eq('ingredient_id', masterIngredientId)
                    } else {
                        // Create initialization entry if missing
                        await supabase.from('inventory_stock').insert({
                            restaurant_id: rId,
                            ingredient_id: masterIngredientId,
                            current_qty: totalQuantityToAdd,
                            min_qty: 0
                        })
                    }
                }
            }
        }

        // 3. Update Invoice Status
        const { error } = await supabase
            .from('invoices')
            .update({
                supplier_id: data.supplier_id,
                invoice_number: data.invoice_number,
                date: data.date,
                total_amount: data.total_amount,
                scanned_data: { ...data, processed: true }, // Save final state
                status: 'completed'
            })
            .eq('id', invoiceId)

        if (error) throw error

        revalidatePath('/invoices')
        revalidatePath(`/invoices/${invoiceId}/review`)
        return { success: true }

    } catch (error) {
        console.error("Update Invoice Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

async function getRestaurantId(userId: string, supabase: SupabaseClient) {
    const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userId)
        .single()
    return data?.id
}
