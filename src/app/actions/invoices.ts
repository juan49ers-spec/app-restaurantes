'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { scanInvoiceWithGPT4o } from "@/services/openai-vision"
import { InvoiceStatus, Invoice } from "@/types/schema"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getUserRestaurant } from "./utils"
import {
    parseInvoicesCsvPreview,
    type InvoicesCsvPayload,
} from "@/lib/importing/invoices-csv"

const log = createActionLogger('invoices')

const InvoicesCsvImportSchema = z.object({
    csvText: z.string().min(1, "CSV vacío"),
})

type InvoicesCsvPreflight = {
    canImport: boolean
    existingRows: {
        key: string
        rowNumbers: number[]
        message: string
    }[]
    summary: ReturnType<typeof parseInvoicesCsvPreview>["summary"]
}

export async function getInvoices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return []

    const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

    return (data || []) as Invoice[]
}

export async function validateInvoicesCsvImport(input: z.input<typeof InvoicesCsvImportSchema>): Promise<{
    success: boolean
    data?: InvoicesCsvPreflight
    error?: string
}> {
    const parsed = InvoicesCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar facturas." }

    const preview = parseInvoicesCsvPreview(parsed.data)
    const validationError = invoicesCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const resolved = await resolveInvoiceRows(supabase, preview, restaurantId)
    if (!resolved.success) return { success: false, error: resolved.error }

    const existingRows = await safeFindExistingInvoiceRows(supabase, resolved.rows, resolved.supplierNames, restaurantId)
    if (!existingRows.success) return { success: false, error: existingRows.error }

    return {
        success: true,
        data: {
            canImport: existingRows.rows.length === 0,
            existingRows: existingRows.rows,
            summary: preview.summary,
        },
    }
}

export async function importInvoicesCsv(input: z.input<typeof InvoicesCsvImportSchema>): Promise<{
    success: boolean
    data?: {
        importedRows: number
        summary: ReturnType<typeof parseInvoicesCsvPreview>["summary"]
    }
    error?: string
}> {
    const parsed = InvoicesCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar facturas." }

    const preview = parseInvoicesCsvPreview(parsed.data)
    const validationError = invoicesCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const resolved = await resolveInvoiceRows(supabase, preview, restaurantId)
    if (!resolved.success) return { success: false, error: resolved.error }

    const existingRows = await safeFindExistingInvoiceRows(supabase, resolved.rows, resolved.supplierNames, restaurantId)
    if (!existingRows.success) return { success: false, error: existingRows.error }
    if (existingRows.rows.length > 0) {
        return { success: false, error: "El CSV contiene facturas que ya existen. Revisa duplicados antes de importar." }
    }

    const rows = resolved.rows.map(row => ({
        restaurant_id: restaurantId,
        supplier_id: row.supplier_id,
        invoice_number: row.invoice_number,
        date: row.date,
        total_amount: row.total_amount,
        status: "completed",
        file_url: null,
        scanned_data: {
            source: "csv_import",
            mode: "invoice_header_only",
            supplier: { name: resolved.supplierNames.get(row.supplier_id) ?? null },
            tax_amount: row.tax_amount ?? null,
            note: "Importación de cabecera: no genera stock, invoice_items ni gasto operativo.",
        },
        processed_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
        .from("invoices")
        .insert(rows)
        .select()

    if (error) return { success: false, error: error.message }

    revalidatePath("/invoices")
    revalidatePath("/consultant")

    return {
        success: true,
        data: {
            importedRows: Array.isArray(data) ? data.length : rows.length,
            summary: preview.summary,
        },
    }
}

function invoicesCsvValidationError(preview: ReturnType<typeof parseInvoicesCsvPreview>) {
    if (preview.fileErrors.length > 0 || preview.invalidRows > 0) {
        return "El CSV contiene errores. Revisa el preview antes de importar."
    }

    if (preview.duplicates.length > 0) {
        return "El CSV contiene duplicados internos. Revisa el preview antes de importar."
    }

    if (preview.validRows === 0) {
        return "El CSV no contiene facturas válidas."
    }

    return null
}

type ResolvedInvoiceRow = {
    supplier_id: string
    invoice_number: string
    date: string
    total_amount: number
    tax_amount?: number
    rowNumber: number
}

async function resolveInvoiceRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    preview: ReturnType<typeof parseInvoicesCsvPreview>,
    restaurantId: string,
): Promise<{
    success: true
    rows: ResolvedInvoiceRow[]
    supplierNames: Map<string, string>
} | { success: false; error: string }> {
    const validRows = preview.rows.filter((row): row is typeof row & { payload: InvoicesCsvPayload } =>
        row.status === "valid" && row.payload !== undefined
    )

    const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("restaurant_id", restaurantId)

    if (error) return { success: false, error: error.message }

    const suppliers = (data ?? []) as { id: string; name: string }[]
    const suppliersById = new Map(suppliers.map(supplier => [supplier.id, supplier]))
    const supplierNameCounts = new Map<string, number>()
    for (const supplier of suppliers) {
        const key = normalizeSupplierName(supplier.name)
        supplierNameCounts.set(key, (supplierNameCounts.get(key) ?? 0) + 1)
    }
    const suppliersByName = new Map(suppliers.map(supplier => [normalizeSupplierName(supplier.name), supplier]))
    const supplierNames = new Map(suppliers.map(supplier => [supplier.id, supplier.name]))
    const rows: ResolvedInvoiceRow[] = []

    for (const row of validRows) {
        const payload = row.payload
        const supplierNameKey = normalizeSupplierName(payload.supplier_name ?? "")
        if (!payload.supplier_id && supplierNameKey && (supplierNameCounts.get(supplierNameKey) ?? 0) > 1) {
            return { success: false, error: "El CSV contiene nombres de proveedor ambiguos. Usa supplier_id para esas facturas." }
        }

        const supplier = payload.supplier_id
            ? suppliersById.get(payload.supplier_id)
            : suppliersByName.get(supplierNameKey)

        if (!supplier) {
            return { success: false, error: "El CSV contiene proveedores que no existen en este restaurante." }
        }

        rows.push({
            supplier_id: supplier.id,
            invoice_number: payload.invoice_number,
            date: payload.date,
            total_amount: payload.total_amount,
            tax_amount: payload.tax_amount,
            rowNumber: row.rowNumber,
        })
    }

    return { success: true, rows, supplierNames }
}

async function findExistingInvoiceRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    rows: ResolvedInvoiceRow[],
    supplierNames: Map<string, string>,
    restaurantId: string,
) {
    const supplierIds = [...new Set(rows.map(row => row.supplier_id))]
    const invoiceNumbers = [...new Set(rows.map(row => row.invoice_number))]
    const dates = [...new Set(rows.map(row => row.date))]

    const { data, error } = await supabase
        .from("invoices")
        .select("supplier_id, invoice_number, date, total_amount")
        .eq("restaurant_id", restaurantId)
        .in("supplier_id", supplierIds)
        .in("invoice_number", invoiceNumbers)
        .in("date", dates)

    if (error) throw new Error(error.message)

    const rowNumbersByKey = new Map(rows.map(row => [invoiceDuplicateKey(row), [row.rowNumber]]))
    const csvKeys = new Set(rowNumbersByKey.keys())

    return ((data ?? []) as { supplier_id: string; invoice_number: string; date: string; total_amount: number }[])
        .filter(row => csvKeys.has(invoiceDuplicateKey(row)))
        .map(row => {
            const key = invoiceDuplicateKey(row)
            return {
                key,
                rowNumbers: rowNumbersByKey.get(key) ?? [],
                message: `Ya existe la factura ${row.invoice_number} de ${supplierNames.get(row.supplier_id) ?? row.supplier_id} (${row.date}).`,
            }
        })
}

async function safeFindExistingInvoiceRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    rows: ResolvedInvoiceRow[],
    supplierNames: Map<string, string>,
    restaurantId: string,
): Promise<{
    success: true
    rows: Awaited<ReturnType<typeof findExistingInvoiceRows>>
} | { success: false; error: string }> {
    try {
        return {
            success: true,
            rows: await findExistingInvoiceRows(supabase, rows, supplierNames, restaurantId),
        }
    } catch {
        return {
            success: false,
            error: "No se pudieron comprobar duplicados existentes. Inténtalo de nuevo antes de importar.",
        }
    }
}

function invoiceDuplicateKey(row: { supplier_id: string; invoice_number: string; date: string; total_amount: number }) {
    return `${row.supplier_id}|${row.invoice_number.trim().toLowerCase()}|${row.date}|${row.total_amount}`
}

function normalizeSupplierName(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, " ")
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
        log.error({ err: error }, "Invoice action failed")
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
        log.error({ err: error }, "OCR error")
        await supabase
            .from('invoices')
            .update({ status: 'error' })
            .eq('id', invoice.id)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}
