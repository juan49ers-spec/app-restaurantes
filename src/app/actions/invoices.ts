'use server'

import { createClient } from "@/lib/supabaseServer"
import { extractInvoiceData, ExtractedInvoiceData } from "@/lib/invoice-extractor-v2"
import { InvoiceStatus, Invoice } from "@/types/schema"
import { revalidatePath } from "next/cache"
import { validateUploadedFile, sanitizeFilename } from "@/lib/upload-validation"

// ── Normalizer: Convert Motor A (ExtractedInvoiceData) → Motor B format ──
// This allows existing UI (InvoiceReviewForm, review-invoice) to work without changes
function normalizeToScannedData(data: ExtractedInvoiceData) {
    return {
        supplier: {
            name: data.supplier_name ?? '',
            tax_id: null as string | null,
            address: null as string | null
        },
        date: data.date,
        invoice_number: data.invoice_number ?? null,
        total_amount: data.total,
        currency: 'EUR',
        items: data.items.map(item => ({
            line_text: item.description,
            description: item.description,
            qty: item.quantity,
            unit: 'unit',
            unit_price: item.unit_price,
            price: item.unit_price,
            total_price: item.total,
            total: item.total,
            category: item.category ?? null
        }))
    }
}

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

    const validation = validateUploadedFile(file)
    if (!validation.valid) throw new Error(validation.error)

    // 2. Upload to Storage
    const safeName = sanitizeFilename(file.name)
    const fileExt = safeName.split('.').pop()
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

    // INSERT directo — sin RPC innecesario
    const newInvoiceId = crypto.randomUUID()

    const { error: dbError } = await supabase
        .from('invoices')
        .insert({
            id: newInvoiceId,
            restaurant_id: restaurant.id,
            invoice_number: 'PENDING',
            date: new Date().toISOString().split('T')[0],
            total_amount: 0,
            status: 'processing' as InvoiceStatus,
            file_url: filePath,
            created_at: new Date().toISOString()
        })

    if (dbError) throw new Error("Failed to create invoice record")

    const invoice = { id: newInvoiceId }

    let shouldDeductCredit = false
    try {
        let deductCredit: ((n: number) => Promise<boolean>) | null = null
        try {
            const billing = await import("./billing")
            const credits = await billing.getCredits()
            if (credits > 0) {
                shouldDeductCredit = true
                deductCredit = billing.deductCredit
            }
        } catch {
            // Billing module unavailable — continue without credit check
        }

        const { data: fileBuffer, error: downloadError } = await supabase.storage
            .from('invoices')
            .download(filePath)

        if (downloadError || !fileBuffer) throw new Error("Could not download file from storage")

        const arrayBuffer = await fileBuffer.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const extractionResult = await extractInvoiceData(buffer, file.type, file.name)

        if (!extractionResult.success || !extractionResult.data) {
            throw new Error(extractionResult.error || "OCR extraction failed")
        }

        const normalizedData = normalizeToScannedData(extractionResult.data)

        const { data: updatedData, error: updateError } = await supabase
            .from('invoices')
            .update({
                status: 'review_required' as InvoiceStatus,
                scanned_data: normalizedData,
                invoice_number: extractionResult.data.invoice_number ?? 'PENDING',
                total_amount: extractionResult.data.total,
                date: extractionResult.data.date,
                ocr_provider: extractionResult.provider_used,
                ocr_confidence: extractionResult.data.confidence
            })
            .eq('id', invoice.id)
            .select()
            .single()

        if (updateError || !updatedData) {
            throw new Error('Failed to update invoice after OCR processing')
        }

        if (shouldDeductCredit && deductCredit) {
            await deductCredit(1)
        }

        revalidatePath('/invoices')
        return { success: true, invoiceId: invoice.id }

    } catch (error: unknown) {
        await supabase
            .from('invoices')
            .update({ status: 'error' })
            .eq('id', invoice.id)

        return { success: false, error: 'Error al procesar la factura' }
    }
}

// ── Batch Operations ──

export async function batchUpdateInvoiceStatus(ids: string[], status: InvoiceStatus) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    if (ids.length === 0) return { success: false, error: "No invoices selected" }

    const { error } = await supabase
        .from('invoices')
        .update({ status })
        .in('id', ids)

    if (error) return { success: false, error: error.message }

    revalidatePath('/invoices')
    return { success: true, count: ids.length }
}

export async function deleteInvoice(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Borrar archivo de Storage primero
    const { data: invoice } = await supabase
        .from('invoices')
        .select('file_url')
        .eq('id', id)
        .single()

    if (invoice?.file_url) {
        await supabase.storage.from('invoices').remove([invoice.file_url])
    }

    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/invoices')
    return { success: true }
}

export async function reprocessInvoice(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: invoice } = await supabase
        .from('invoices')
        .select('file_url')
        .eq('id', id)
        .single()

    if (!invoice?.file_url) return { success: false, error: "No file found for this invoice" }

    // Reset status a processing
    await supabase
        .from('invoices')
        .update({ status: 'processing' as InvoiceStatus })
        .eq('id', id)

    try {
        const { data: fileBuffer, error: downloadError } = await supabase.storage
            .from('invoices')
            .download(invoice.file_url)

        if (downloadError || !fileBuffer) throw new Error("Could not download file from storage")

        const arrayBuffer = await fileBuffer.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const fileExt = invoice.file_url.split('.').pop() || 'pdf'
        const mimeType = fileExt === 'pdf' ? 'application/pdf' : `image/${fileExt}`

        const extractionResult = await extractInvoiceData(buffer, mimeType, `reprocess.${fileExt}`)

        if (!extractionResult.success || !extractionResult.data) {
            throw new Error(extractionResult.error || "OCR extraction failed")
        }

        const normalizedData = normalizeToScannedData(extractionResult.data)

        const { data: updatedData, error: updateError } = await supabase
            .from('invoices')
            .update({
                status: 'review_required' as InvoiceStatus,
                scanned_data: normalizedData,
                invoice_number: extractionResult.data.invoice_number ?? 'PENDING',
                total_amount: extractionResult.data.total,
                date: extractionResult.data.date,
                ocr_provider: extractionResult.provider_used,
                ocr_confidence: extractionResult.data.confidence
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError || !updatedData) {
            console.error("[Supabase Update Error]:", updateError)
            throw new Error(`Failed to update invoice: ${updateError?.message || 'No data returned after update'}`)
        }

        revalidatePath('/invoices')
        return { success: true }

    } catch (error: unknown) {
        console.error('[Reprocess Error]:', error)
        await supabase
            .from('invoices')
            .update({ status: 'error' as InvoiceStatus })
            .eq('id', id)

        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

