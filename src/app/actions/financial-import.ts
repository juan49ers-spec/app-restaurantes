'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { parseFinancialCsvPreview, type ExpenseCsvPayload, type FinancialCsvKind, type SalesCsvPayload } from "@/lib/importing/financial-csv"
import { getUserRestaurant } from "./utils"


const FinancialCsvImportSchema = z.object({
    kind: z.enum(['sales', 'expenses']),
    csvText: z.string().min(1, 'CSV vacío'),
})

type ImportFinancialCsvResult = {
    kind: FinancialCsvKind
    importedRows: number
    skippedRows: number
    summary: ReturnType<typeof parseFinancialCsvPreview>['summary']
}

type FinancialCsvExistingRow = {
    key: string
    rowNumbers: number[]
    message: string
}

type FinancialCsvImportPreflight = {
    kind: FinancialCsvKind
    canImport: boolean
    existingRows: FinancialCsvExistingRow[]
}

export async function importFinancialCsv(input: z.input<typeof FinancialCsvImportSchema>): Promise<{
    success: boolean
    data?: ImportFinancialCsvResult
    error?: string
}> {
    const parsed = FinancialCsvImportSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: 'CSV inválido.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para importar datos.' }
    }

    const preview = parseFinancialCsvPreview(parsed.data)

    if (preview.fileErrors.length > 0 || preview.invalidRows > 0) {
        return { success: false, error: 'El CSV contiene errores. Revisa el preview antes de importar.' }
    }

    if (preview.duplicates.length > 0) {
        return { success: false, error: 'El CSV contiene duplicados internos. Revisa el preview antes de importar.' }
    }

    const supabase = await createClient()
    const validPayloads = preview.rows
        .filter(hasFinancialCsvPayload)
        .map(row => row.payload)

    if (parsed.data.kind === 'sales') {
        const hasNegativeRevenue = validPayloads.some(payload =>
            'revenue_total' in payload && payload.revenue_total < 0
        )

        if (hasNegativeRevenue) {
            return {
                success: false,
                error: 'El CSV de ventas contiene importes negativos. Revisa revenue_total antes de importar.',
            }
        }

        const existingRowsResult = await getExistingFinancialCsvRows(supabase, preview, validPayloads, restaurantId)
        if (!existingRowsResult.success) return { success: false, error: existingRowsResult.error }

        const existingRows = existingRowsResult.data
        if (existingRows.length > 0) {
            return {
                success: false,
                error: 'El CSV contiene filas que ya existen en la base de datos. Revisa duplicados antes de importar.',
            }
        }

        const rows = validPayloads.map(payload => buildSalesImportRow(payload as SalesCsvPayload, restaurantId))
        const { data, error } = await supabase
            .from('daily_sales')
            .upsert(rows, { onConflict: 'restaurant_id,date' })
            .select()

        if (error) return { success: false, error: error.message }

        revalidateFinancialControl()
        return {
            success: true,
            data: {
                kind: preview.kind,
                importedRows: Array.isArray(data) ? data.length : rows.length,
                skippedRows: 0,
                summary: preview.summary,
            },
        }
    }

    const existingRowsResult = await getExistingFinancialCsvRows(supabase, preview, validPayloads, restaurantId)
    if (!existingRowsResult.success) return { success: false, error: existingRowsResult.error }

    const existingRows = existingRowsResult.data
    if (existingRows.length > 0) {
        return {
            success: false,
            error: 'El CSV contiene filas que ya existen en la base de datos. Revisa duplicados antes de importar.',
        }
    }

    const rows = validPayloads.map(payload => buildExpenseImportRow(payload as ExpenseCsvPayload, restaurantId))
    const { data, error } = await supabase
        .from('operating_expenses')
        .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
        .select()

    if (error) return { success: false, error: error.message }

    revalidateFinancialControl()
    return {
        success: true,
        data: {
            kind: preview.kind,
            importedRows: Array.isArray(data) ? data.length : rows.length,
            skippedRows: Math.max(rows.length - (Array.isArray(data) ? data.length : rows.length), 0),
            summary: preview.summary,
        },
    }
}

export async function validateFinancialCsvImport(input: z.input<typeof FinancialCsvImportSchema>): Promise<{
    success: boolean
    data?: FinancialCsvImportPreflight
    error?: string
}> {
    const parsed = FinancialCsvImportSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: 'CSV inválido.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para importar datos.' }
    }

    const preview = parseFinancialCsvPreview(parsed.data)

    if (preview.fileErrors.length > 0 || preview.invalidRows > 0) {
        return { success: false, error: 'El CSV contiene errores. Revisa el preview antes de importar.' }
    }

    if (preview.duplicates.length > 0) {
        return { success: false, error: 'El CSV contiene duplicados internos. Revisa el preview antes de importar.' }
    }

    const validPayloads = preview.rows
        .filter(hasFinancialCsvPayload)
        .map(row => row.payload)

    if (parsed.data.kind === 'sales') {
        const hasNegativeRevenue = validPayloads.some(payload =>
            'revenue_total' in payload && payload.revenue_total < 0
        )

        if (hasNegativeRevenue) {
            return {
                success: false,
                error: 'El CSV de ventas contiene importes negativos. Revisa revenue_total antes de importar.',
            }
        }
    }

    const supabase = await createClient()
    const existingRowsResult = await getExistingFinancialCsvRows(supabase, preview, validPayloads, restaurantId)
    if (!existingRowsResult.success) return { success: false, error: existingRowsResult.error }

    const existingRows = existingRowsResult.data

    return {
        success: true,
        data: {
            kind: preview.kind,
            canImport: existingRows.length === 0,
            existingRows,
        },
    }
}

function buildSalesImportRow(payload: SalesCsvPayload, restaurantId: string) {
    const ivaTotal = (payload.tax_10 ?? 0) + (payload.tax_21 ?? 0)

    return {
        ...payload,
        restaurant_id: restaurantId,
        iva_collected: ivaTotal,
        day_status: payload.day_status ?? 'OPEN',
        source: 'csv_import',
        updated_at: new Date().toISOString(),
    }
}

function hasFinancialCsvPayload(row: ReturnType<typeof parseFinancialCsvPreview>['rows'][number]): row is ReturnType<typeof parseFinancialCsvPreview>['rows'][number] & {
    payload: SalesCsvPayload | ExpenseCsvPayload
} {
    return row.status === 'valid' && row.payload !== undefined
}

function buildExpenseImportRow(payload: ExpenseCsvPayload, restaurantId: string) {
    return {
        ...payload,
        restaurant_id: restaurantId,
        payment_method: payload.payment_method ?? 'bank',
        recurrence: payload.recurrence ?? 'NONE',
        is_paid: payload.is_paid ?? true,
        is_professional_invoice: payload.is_professional_invoice ?? false,
        idempotency_key: `financial-csv:${restaurantId}:expenses:${expenseImportKey(payload)}`,
    }
}

function expenseImportKey(payload: ExpenseCsvPayload) {
    return [
        payload.expense_date,
        payload.category,
        payload.amount,
        payload.description ?? '',
    ].join('|')
}

async function getExistingFinancialCsvRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    preview: ReturnType<typeof parseFinancialCsvPreview>,
    payloads: Array<SalesCsvPayload | ExpenseCsvPayload>,
    restaurantId: string,
): Promise<{ success: true; data: FinancialCsvExistingRow[] } | { success: false; error: string }> {
    try {
        return {
            success: true,
            data: await findExistingFinancialCsvRows(supabase, preview, payloads, restaurantId),
        }
    } catch {
        return {
            success: false,
            error: 'No se pudo comprobar el CSV contra la base de datos.',
        }
    }
}

async function findExistingFinancialCsvRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    preview: ReturnType<typeof parseFinancialCsvPreview>,
    payloads: Array<SalesCsvPayload | ExpenseCsvPayload>,
    restaurantId: string,
): Promise<FinancialCsvExistingRow[]> {
    if (preview.kind === 'sales') {
        const dates = payloads
            .filter((payload): payload is SalesCsvPayload => 'date' in payload)
            .map(payload => payload.date)

        if (dates.length === 0) return []

        const { data, error } = await supabase
            .from('daily_sales')
            .select('date')
            .eq('restaurant_id', restaurantId)
            .in('date', dates)

        if (error) throw new Error(error.message)

        return (data ?? []).map(row => {
            const key = String(row.date)
            return {
                key,
                rowNumbers: rowNumbersForKey(preview, key),
                message: `Ya existe una venta para ${key}.`,
            }
        })
    }

    const keys = payloads
        .filter((payload): payload is ExpenseCsvPayload => 'expense_date' in payload)
        .map(payload => `financial-csv:${restaurantId}:expenses:${expenseImportKey(payload)}`)

    if (keys.length === 0) return []

    const { data, error } = await supabase
        .from('operating_expenses')
        .select('idempotency_key')
        .eq('restaurant_id', restaurantId)
        .in('idempotency_key', keys)

    if (error) throw new Error(error.message)

    return (data ?? []).map(row => {
        const idempotencyKey = String(row.idempotency_key)
        const key = idempotencyKey.replace(`financial-csv:${restaurantId}:expenses:`, '')
        return {
            key,
            rowNumbers: rowNumbersForKey(preview, key),
            message: `Ya existe un gasto importado con clave ${key}.`,
        }
    })
}

function rowNumbersForKey(preview: ReturnType<typeof parseFinancialCsvPreview>, key: string) {
    return preview.rows
        .filter(hasFinancialCsvPayload)
        .filter(row => financialCsvPayloadKey(row.payload, preview.kind) === key)
        .map(row => row.rowNumber)
}

function financialCsvPayloadKey(payload: SalesCsvPayload | ExpenseCsvPayload, kind: FinancialCsvKind) {
    if (kind === 'sales' && 'date' in payload) return payload.date
    if ('expense_date' in payload) return expenseImportKey(payload)
    return ''
}

function revalidateFinancialControl() {
    revalidatePath('/financial-control')
    revalidatePath('/')
    revalidatePath('/dashboard')
}
