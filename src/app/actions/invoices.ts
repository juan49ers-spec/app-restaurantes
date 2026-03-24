'use server'

import { createClient } from "@/lib/supabaseServer"
import { extractInvoiceData, ExtractedInvoiceData } from "@/lib/invoice-extractor"
import { InvoiceStatus, Invoice } from "@/types/schema"
import { revalidatePath } from "next/cache"

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
            created_by: user.id,
            user_id: user.id,
            created_at: new Date().toISOString()
        })

    if (dbError) throw new Error(`DB Insert failed: ${dbError.message}`)

    const invoice = { id: newInvoiceId }



    try {
        // 4. CHECK CREDITS (Billing)
        const { getCredits, deductCredit } = await import("./billing")
        const credits = await getCredits()
        if (credits <= 0) {
            throw new Error("No tienes créditos OCR suficientes. Recarga para continuar.")
        }

        // 5. Download file from Storage as Buffer
        const { data: fileBuffer, error: downloadError } = await supabase.storage
            .from('invoices')
            .download(filePath)

        if (downloadError || !fileBuffer) throw new Error("Could not download file from storage")

        // 6. Convert Blob to Buffer
        const arrayBuffer = await fileBuffer.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 7. Call Motor A (Ollama/Anthropic/Mock based on OCR_PROVIDER)
        const extractionResult = await extractInvoiceData(buffer, file.type, file.name)

        if (!extractionResult.success || !extractionResult.data) {
            throw new Error(extractionResult.error || "OCR extraction failed")
        }

        // 8. Normalize to legacy format for UI compatibility
        const normalizedData = normalizeToScannedData(extractionResult.data)

        // 9. Update Invoice with Results (both normalized for UI + raw for analytics)
        await supabase
            .from('invoices')
            .update({
                status: 'review_required',
                scanned_data: normalizedData,
                extracted_data: extractionResult.data,
                confidence_score: extractionResult.data.confidence,
                invoice_number: extractionResult.data.invoice_number ?? 'PENDING',
                total_amount: extractionResult.data.total,
                date: extractionResult.data.date,
                processed_at: new Date().toISOString()
            })
            .eq('id', invoice.id)

        // 10. Deduct Credit (Success)
        await deductCredit(1)

        revalidatePath('/invoices')
        return { success: true, invoiceId: invoice.id }

    } catch (error: unknown) {
        console.error("[Invoice Processing Error]:", error)
        await supabase
            .from('invoices')
            .update({ status: 'error' })
            .eq('id', invoice.id)

        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

