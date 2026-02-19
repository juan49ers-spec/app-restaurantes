/**
 * FASE 2.1: Wrapper para función RPC de facturas atómicas
 * 
 * Esta función maneja el upsert de facturas e ítems en una sola transacción,
 * garantizando que nunca se queden facturas a medias sin sus ítems o viceversa.
 */

import { createClient } from "@/lib/supabaseServer"

export interface InvoiceItemInput {
    description: string
    quantity: number
    unit_price: number
    total_price: number
    tax_rate?: number
    tax_amount?: number
}

export interface InvoiceInput {
    restaurant_id: string
    supplier_id?: string
    idempotency_key?: string
    invoice_number: string
    invoice_date: string // ISO date string
    total_amount: number
    file_url?: string
    scanned_data?: Record<string, unknown>
    items: InvoiceItemInput[]
}

export interface InvoiceResult {
    success: boolean
    invoice_id?: string
    error?: string
    items_created?: number
}

/**
 * Guarda una factura con sus ítems de forma atómica.
 * 
 * @param data - Datos de la factura e ítems
 * @returns Resultado de la operación
 * 
 * @example
 * const result = await saveInvoiceWithItems({
 *     restaurant_id: 'uuid',
 *     supplier_id: 'uuid',
 *     invoice_number: 'FAC-2024-001',
 *     invoice_date: '2024-01-15',
 *     total_amount: 1500.00,
 *     items: [
 *         {
 *             description: 'Tomates 10kg',
 *             quantity: 10,
 *             unit_price: 150.00,
 *             total_price: 1500.00
 *         }
 *     ]
 * })
 */
export async function saveInvoiceWithItems(data: InvoiceInput): Promise<InvoiceResult> {
    const supabase = await createClient()
    
    try {
        // Llamar a la función RPC
        const { data: result, error } = await supabase.rpc('upsert_invoice_with_items', {
            p_restaurant_id: data.restaurant_id,
            p_supplier_id: data.supplier_id || null,
            p_idempotency_key: data.idempotency_key || null,
            p_invoice_number: data.invoice_number,
            p_invoice_date: data.invoice_date,
            p_total_amount: data.total_amount,
            p_file_url: data.file_url || null,
            p_scanned_data: data.scanned_data || {},
            p_items: JSON.stringify(data.items)
        })

        if (error) {
            console.error('Error en RPC upsert_invoice_with_items:', error)
            return {
                success: false,
                error: error.message
            }
        }

        if (!result || result.length === 0) {
            return {
                success: false,
                error: 'No response from RPC'
            }
        }

        const rpcResult = result[0] as {
            success: boolean
            invoice_id: string
            error_message: string | null
            items_created: number
        }

        if (!rpcResult.success) {
            return {
                success: false,
                error: rpcResult.error_message || 'Unknown error'
            }
        }

        return {
            success: true,
            invoice_id: rpcResult.invoice_id,
            items_created: rpcResult.items_created
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error en saveInvoiceWithItems:', error)
        return {
            success: false,
            error: message
        }
    }
}

/**
 * Genera una clave de idempotencia basada en los datos de la factura.
 * Previene duplicados cuando se reintentan operaciones.
 */
export function generateIdempotencyKey(data: {
    restaurant_id: string
    invoice_number: string
    invoice_date: string
    supplier_id?: string
    total_amount: number
}): string {
    const keyData = [
        data.restaurant_id,
        data.invoice_number,
        data.invoice_date,
        data.supplier_id || 'unknown',
        data.total_amount.toString()
    ].join('|')
    
    // Simple hash (para producción usar crypto.subtle.digest)
    return Buffer.from(keyData).toString('base64').substring(0, 64)
}

/**
 * Guarda una factura con idempotencia automática.
 * Si ya existe una factura con los mismos datos, no se duplica.
 */
export async function saveInvoiceWithIdempotency(data: InvoiceInput): Promise<InvoiceResult> {
    const idempotencyKey = generateIdempotencyKey({
        restaurant_id: data.restaurant_id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        supplier_id: data.supplier_id,
        total_amount: data.total_amount
    })

    return await saveInvoiceWithItems({
        ...data,
        idempotency_key: idempotencyKey
    })
}
