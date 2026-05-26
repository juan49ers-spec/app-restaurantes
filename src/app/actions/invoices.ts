'use server'

import { createClient } from "@/lib/supabaseServer"
import { scanInvoiceWithGPT4o } from "@/services/openai-vision"
import { InvoiceStatus, Invoice } from "@/types/schema"
import { revalidatePath } from "next/cache"

export async function getInvoices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

    return (data || []) as Invoice[]
}


export async function processInvoice(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    if (!file) throw new Error("No file attached")

    // 2. Upload to Storage
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    // Check if bucket exists (assume yes from migration, but handle error)
    const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file)

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // 3. Create Invoice Record (Processing)
    // We need restaurant_id. Let's fetch it or use active one.
    // For now, fetch the first one.
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!restaurant) throw new Error("No restaurant found")

    // PREPARE RPC DATA
    const newInvoiceId = crypto.randomUUID()
    const rpcPayload = {
        p_invoice_id: newInvoiceId,
        p_restaurant_id: restaurant.id,
        p_supplier_id: null, // supplier from OCR comes later
        p_invoice_number: 'PENDING',
        p_invoice_date: new Date().toISOString().split('T')[0],
        p_total_amount: 0,
        p_tax_amount: 0,
        p_items: []
    }

    const { error: dbError } = await supabase.rpc('upsert_invoice_with_items', rpcPayload)
    if (dbError) throw new Error(`DB RPC failed: ${dbError.message}`)

    // Update with file url later
    await supabase.from('invoices').update({ image_url: filePath, status: 'processing' as InvoiceStatus, created_at: new Date().toISOString() }).eq('id', newInvoiceId)

    const invoice = { id: newInvoiceId }



    try {
        // 4. CHECK CREDITS (Billing)
        // Only check if we are going to use OCR.
        const { getCredits, deductCredit } = await import("./billing")
        const credits = await getCredits()
        if (credits <= 0) {
            throw new Error("No tienes créditos OCR suficientes. Recarga para continuar.")
        }

        // 5. Get Signed URL for OpenAI
        const { data: signedUrlData, error: signError } = await supabase.storage
            .from('invoices')
            .createSignedUrl(filePath, 60) // 60 seconds

        if (signError || !signedUrlData?.signedUrl) throw new Error("Could not generate signed URL")
        const signedUrl = signedUrlData.signedUrl

        // 5. Call OpenAI
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) throw new Error("Server Config Error: Missing OpenAI Key")

        const scannedData = await scanInvoiceWithGPT4o(signedUrl, apiKey)

        // 6. Update Invoice with Results
        await supabase
            .from('invoices')
            .update({
                status: 'review_required',
                scanned_data: scannedData,
                invoice_number: scannedData.invoice_number,
                total_amount: scannedData.total_amount,
                date: scannedData.date,
                processed_at: new Date().toISOString()
            })
            .eq('id', invoice.id)

        // 7. Deduct Credit (Success)
        await deductCredit(1)

        revalidatePath('/invoices')
        return { success: true, invoiceId: invoice.id }

    } catch (error: unknown) {
        // Rollback or Mark Error
        console.error(error)
        await supabase
            .from('invoices')
            .update({ status: 'error' })
            .eq('id', invoice.id)

        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

export async function createInvoiceRecord(filePath: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Get restaurant
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!restaurant) throw new Error("No restaurant found")

    // Create Invoice Record
    const newInvoiceId = crypto.randomUUID()
    const rpcPayload = {
        p_invoice_id: newInvoiceId,
        p_restaurant_id: restaurant.id,
        p_supplier_id: null,
        p_invoice_number: 'PENDING',
        p_invoice_date: new Date().toISOString().split('T')[0],
        p_total_amount: 0,
        p_tax_amount: 0,
        p_items: []
    }

    const { error: dbError } = await supabase.rpc('upsert_invoice_with_items', rpcPayload)
    if (dbError) throw new Error(`DB Insert failed: ${dbError.message}`)

    await supabase.from('invoices').update({ image_url: filePath, status: 'processing' as InvoiceStatus, created_at: new Date().toISOString() }).eq('id', newInvoiceId)

    const invoice = { id: newInvoiceId }

    // Trigger OCR (Background)
    try {
        // CHECK CREDITS (Billing)
        const { getCredits, deductCredit } = await import("./billing")
        const credits = await getCredits()
        if (credits <= 0) {
            throw new Error("No tienes créditos OCR suficientes.")
        }

        const { data: signedUrlData, error: signError } = await supabase.storage
            .from('invoices')
            .createSignedUrl(filePath, 60)

        if (signError || !signedUrlData?.signedUrl) throw new Error("Could not generate signed URL")
        const signedUrl = signedUrlData.signedUrl

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) throw new Error("Server Config Error: Missing OpenAI Key")

        const scannedData = await scanInvoiceWithGPT4o(signedUrl, apiKey)

        await supabase
            .from('invoices')
            .update({
                status: 'review_required',
                scanned_data: scannedData,
                invoice_number: scannedData.invoice_number,
                total_amount: scannedData.total_amount,
                date: scannedData.date,
                processed_at: new Date().toISOString()
            })
            .eq('id', invoice.id)

        // Deduct Credit
        await deductCredit(1)

        revalidatePath('/invoices')
        return { success: true, invoiceId: invoice.id }

    } catch (error: unknown) {
        console.error("OCR Error:", error)
        await supabase
            .from('invoices')
            .update({ status: 'error' })
            .eq('id', invoice.id)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}
