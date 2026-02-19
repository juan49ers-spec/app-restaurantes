'use server'

import { createClient } from "@/lib/supabaseServer"
import { SupabaseClient } from "@supabase/supabase-js"

// Constants for auto-acceptance
const AUTO_ACCEPT_THRESHOLD = 0.85
const PRICE_SPIKE_THRESHOLD = 0.10 // 10%
const ANOMALY_THRESHOLD = 5.0 // 5x the average

interface InvoiceLineItem {
    description: string
    price: number
    quantity: number
    unit?: string
    total?: number
}

interface ProcessedItem {
    rawName: string
    status: 'matched' | 'auto_matched' | 'pending_validation' | 'error'
    masterIngredientId?: string
    masterIngredientName?: string
    confidenceScore?: number
    priceAlert?: {
        type: 'PRICE_SPIKE' | 'ANOMALY'
        previousPrice: number
        newPrice: number
        percentChange: number
    }
}

/**
 * Main entry point: Process all line items from an invoice
 */
export async function processInvoicePayload(
    invoiceId: string,
    supplierId: string,
    lineItems: InvoiceLineItem[],
    injectedSupabase?: SupabaseClient
): Promise<ProcessedItem[]> {
    const supabase = injectedSupabase || await createClient()
    const results: ProcessedItem[] = []

    // Get restaurant_id from invoice
    const { data: invoice } = await supabase
        .from('invoices')
        .select('restaurant_id')
        .eq('id', invoiceId)
        .single()

    if (!invoice) throw new Error('Invoice not found')

    for (const item of lineItems) {
        const result = await processInvoiceLine(
            supabase,
            invoice.restaurant_id,
            invoiceId,
            supplierId,
            item
        )
        results.push(result)
    }

    return results
}

/**
 * Process a single line item from an invoice
 */
async function processInvoiceLine(
    supabase: Awaited<ReturnType<typeof createClient>> | SupabaseClient,
    restaurantId: string,
    invoiceId: string,
    supplierId: string,
    item: InvoiceLineItem
): Promise<ProcessedItem> {
    const normalizedName = item.description.toLowerCase().trim()

    // Step 1: Check if we already know this item from this supplier
    const { data: knownItem } = await supabase
        .from('supplier_items')
        .select('id, master_ingredient_id, last_price, pack_size, master_ingredients(id, name, current_avg_price)')
        .eq('supplier_id', supplierId)
        .ilike('name_on_invoice', normalizedName)
        .limit(1)
        .maybeSingle()

    if (knownItem?.master_ingredient_id) {
        // CASE A: Known item - update price and check for alerts
        let masterIngredient: { id: string; name: string; current_avg_price: number } | null = null

        // Handle potentially different checking return depending on client type
        if (Array.isArray(knownItem.master_ingredients)) {
            masterIngredient = knownItem.master_ingredients[0] as any
        } else {
            masterIngredient = knownItem.master_ingredients as any
        }

        if (masterIngredient) {
            const unitPrice = item.price / (knownItem.pack_size || 1)
            const currentAvgPrice = masterIngredient.current_avg_price || 0

            // Update supplier_items.last_price
            await supabase
                .from('supplier_items')
                .update({ last_price: item.price })
                .eq('id', knownItem.id)

            // Check for price alerts
            let priceAlert: ProcessedItem['priceAlert'] = undefined
            if (currentAvgPrice > 0) {
                const percentChange = (unitPrice - currentAvgPrice) / currentAvgPrice

                if (Math.abs(percentChange) >= ANOMALY_THRESHOLD) {
                    priceAlert = {
                        type: 'ANOMALY',
                        previousPrice: currentAvgPrice,
                        newPrice: unitPrice,
                        percentChange: percentChange * 100
                    }
                    // Don't update master ingredient for anomalies - needs review
                    await createAlert(supabase, restaurantId, 'ANOMALY',
                        `Precio anómalo detectado: ${item.description}`,
                        `Precio ${unitPrice.toFixed(2)}€ es ${(percentChange * 100).toFixed(0)}% diferente del promedio`
                    )
                } else if (Math.abs(percentChange) >= PRICE_SPIKE_THRESHOLD) {
                    priceAlert = {
                        type: 'PRICE_SPIKE',
                        previousPrice: currentAvgPrice,
                        newPrice: unitPrice,
                        percentChange: percentChange * 100
                    }
                    // Update master ingredient but also alert
                    await updateMasterIngredientPrice(supabase, knownItem.master_ingredient_id, unitPrice, supplierId)
                    await createAlert(supabase, restaurantId, 'PRICE_SPIKE',
                        `Subida de precio: ${masterIngredient.name}`,
                        `+${(percentChange * 100).toFixed(0)}% (${currentAvgPrice.toFixed(2)}€ → ${unitPrice.toFixed(2)}€)`
                    )
                } else {
                    // Normal price update
                    await updateMasterIngredientPrice(supabase, knownItem.master_ingredient_id, unitPrice, supplierId)
                }
            } else {
                // First price set
                await updateMasterIngredientPrice(supabase, knownItem.master_ingredient_id, unitPrice, supplierId)
            }

            return {
                rawName: item.description,
                status: 'matched',
                masterIngredientId: knownItem.master_ingredient_id,
                masterIngredientName: masterIngredient.name,
                priceAlert
            }
        }
    }

    // CASE B: Unknown item - try fuzzy matching
    const suggestion = await fuzzyMatchIngredient(supabase, restaurantId, item.description)

    if (suggestion && suggestion.score >= AUTO_ACCEPT_THRESHOLD) {
        // Auto-accept: Create supplier_items link automatically
        await supabase.from('supplier_items').insert({
            restaurant_id: restaurantId,
            supplier_id: supplierId,
            name_on_invoice: item.description,
            last_price: item.price,
            pack_size: item.quantity || 1,
            master_ingredient_id: suggestion.id
        })

        // Update master ingredient price
        const unitPrice = item.price / (item.quantity || 1)
        await updateMasterIngredientPrice(supabase, suggestion.id, unitPrice, supplierId)

        return {
            rawName: item.description,
            status: 'auto_matched',
            masterIngredientId: suggestion.id,
            masterIngredientName: suggestion.name,
            confidenceScore: suggestion.score
        }
    }

    // Low confidence or no match - add to validation queue
    await supabase.from('ingestion_buffer').insert({
        restaurant_id: restaurantId,
        invoice_id: invoiceId,
        supplier_id: supplierId,
        raw_name: item.description,
        raw_price: item.price,
        raw_quantity: item.quantity,
        raw_unit: item.unit,
        suggested_master_id: suggestion?.id || null,
        confidence_score: suggestion?.score || 0,
        status: 'PENDING_VALIDATION'
    })

    // Alert about new pending validation
    await createAlert(supabase, restaurantId, 'VALIDATION_NEEDED',
        'Nuevo ítem requiere validación',
        `"${item.description}" necesita ser mapeado a un ingrediente`
    )

    return {
        rawName: item.description,
        status: 'pending_validation',
        masterIngredientId: suggestion?.id,
        masterIngredientName: suggestion?.name,
        confidenceScore: suggestion?.score
    }
}

/**
 * Fuzzy match ingredient name using pg_trgm
 */
async function fuzzyMatchIngredient(
    supabase: Awaited<ReturnType<typeof createClient>> | SupabaseClient,
    restaurantId: string,
    rawName: string
): Promise<{ id: string; name: string; score: number } | null> {
    const { data } = await supabase.rpc('fuzzy_match_ingredient', {
        p_restaurant_id: restaurantId,
        p_search_term: rawName
    })

    if (data && data.length > 0) {
        return {
            id: data[0].id,
            name: data[0].name,
            score: data[0].similarity_score
        }
    }

    return null
}

/**
 * Update master ingredient price and log to price_history
 */
async function updateMasterIngredientPrice(
    supabase: Awaited<ReturnType<typeof createClient>> | SupabaseClient,
    masterIngredientId: string,
    newPrice: number,
    supplierId: string
) {
    // Update current_avg_price (simplified - could use weighted average)
    await supabase
        .from('master_ingredients')
        .update({
            current_avg_price: newPrice,
            last_updated_at: new Date().toISOString()
        })
        .eq('id', masterIngredientId)

    // Log to price_history
    await supabase.from('price_history').insert({
        ingredient_id: masterIngredientId,
        supplier_id: supplierId,
        price: newPrice,
        date: new Date().toISOString().split('T')[0]
    })
}

/**
 * Create an alert in the alerts table
 */
async function createAlert(
    supabase: Awaited<ReturnType<typeof createClient>> | SupabaseClient,
    restaurantId: string,
    type: 'PRICE_SPIKE' | 'ANOMALY' | 'RECIPE_UPDATED' | 'VALIDATION_NEEDED',
    title: string,
    message: string,
    metadata?: Record<string, unknown>
) {
    // Check if alert already exists for today/recent to avoid spam
    // Simplified: Just insert
    await supabase.from('alerts').insert({
        restaurant_id: restaurantId,
        type,
        title,
        message,
        metadata: metadata || {}
    })
}
