'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabaseServer'
import { buildProfessionalRestaurantReport } from '@/lib/reporting'
import type {
    EmployeeReportRow,
    ExpenseReportRow,
    InvoiceReportRow,
    DailyRecipeSalesReportRow,
    MenuEngineeringReportRow,
    MonthlyTargetReportRow,
    ProfessionalRestaurantReport,
    RecipeReportRow,
    SalesReportRow,
    ShiftReportRow,
    SupplierReportRow,
} from '@/lib/reporting'
import { getUserRestaurant } from './utils'

const ReportPeriodSchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((period) => period.from <= period.to, {
    message: 'La fecha inicial debe ser anterior o igual a la fecha final.',
    path: ['from'],
})

const REPORT_SECTION_IDS = [
    'executive_summary',
    'sales',
    'costs',
    'staff',
    'suppliers',
    'menu_performance',
    'menu_engineering',
    'profitability',
    'recommendations',
    'data_appendix',
] as const

const ReportDraftStatusSchema = z.enum(['DRAFT', 'REVIEWED', 'READY'])

const SaveProfessionalReportDraftSchema = z.object({
    period: ReportPeriodSchema,
    narrativeOverrides: z.record(z.string(), z.string().max(6000)).default({}),
    status: ReportDraftStatusSchema.default('DRAFT'),
})

type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export type ProfessionalReportDraftStatus = z.infer<typeof ReportDraftStatusSchema>

export interface SavedProfessionalReportDraft {
    id: string
    periodFrom: string
    periodTo: string
    version: number
    status: ProfessionalReportDraftStatus
    schemaVersion: string
    createdAt: string
    updatedAt: string
    exportedAt: string | null
}

export interface SavedProfessionalReportDraftDetail extends SavedProfessionalReportDraft {
    report: ProfessionalRestaurantReport
    narrativeOverrides: Record<string, string>
}

function daysInclusive(from: string, to: string) {
    const start = new Date(`${from}T00:00:00.000Z`)
    const end = new Date(`${to}T00:00:00.000Z`)
    const diff = end.getTime() - start.getTime()
    return Math.floor(diff / 86_400_000) + 1
}

function monthYear(date: string) {
    return date.slice(0, 7)
}

function sanitizeNarrativeOverrides(raw: Record<string, string>) {
    const allowed = new Set<string>(REPORT_SECTION_IDS)

    return Object.fromEntries(
        Object.entries(raw)
            .filter(([sectionId]) => allowed.has(sectionId))
            .map(([sectionId, value]) => [sectionId, value.trim()])
    )
}

function mapMenuEngineeringReport(raw: unknown): MenuEngineeringReportRow | null {
    if (!raw || typeof raw !== 'object') return null

    const row = raw as {
        id?: string
        name?: string
        date_from?: string | null
        date_to?: string | null
        avg_popularity?: number | null
        avg_margin?: number | null
        items?: Array<{
            id?: string
            quantity_sold?: number | null
            contribution_margin?: number | null
            total_sales?: number | null
            total_profit?: number | null
            popularity_pct?: number | null
            classification?: MenuEngineeringReportRow['items'][number]['classification']
            recipe?: { name?: string | null } | null
        }>
    }

    if (!row.id || !row.name) return null

    return {
        id: row.id,
        name: row.name,
        date_from: row.date_from,
        date_to: row.date_to,
        avg_popularity: row.avg_popularity,
        avg_margin: row.avg_margin,
        items: (row.items || []).map(item => ({
            id: item.id || '',
            name: item.recipe?.name || 'Producto sin nombre',
            classification: item.classification,
            quantity_sold: item.quantity_sold,
            contribution_margin: item.contribution_margin,
            total_sales: item.total_sales,
            total_profit: item.total_profit,
            popularity_pct: item.popularity_pct,
        })),
    }
}

function mapDraftRow(row: {
    id: string
    period_from: string
    period_to: string
    version: number
    status: ProfessionalReportDraftStatus
    schema_version: string
    created_at: string
    updated_at: string
    exported_at: string | null
}): SavedProfessionalReportDraft {
    return {
        id: row.id,
        periodFrom: row.period_from,
        periodTo: row.period_to,
        version: row.version,
        status: row.status,
        schemaVersion: row.schema_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        exportedAt: row.exported_at,
    }
}

export async function getProfessionalReportDraft(
    rawPeriod: z.infer<typeof ReportPeriodSchema>
): Promise<ActionResponse<ProfessionalRestaurantReport>> {
    const parsed = ReportPeriodSchema.safeParse(rawPeriod)
    if (!parsed.success) {
        return { success: false, error: 'Periodo de informe inválido.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para generar el informe.' }
    }

    const supabase = await createClient()
    const { from, to } = parsed.data
    const fromMonth = monthYear(from)
    const toMonth = monthYear(to)

    const [
        restaurantRes,
        salesRes,
        expensesRes,
        targetsRes,
        employeesRes,
        shiftsRes,
        suppliersRes,
        invoicesRes,
        recipeSalesRes,
        recipesRes,
        menuEngineeringReportRes,
    ] = await Promise.all([
        supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', restaurantId)
            .maybeSingle(),
        supabase
            .from('daily_sales')
            .select('date, revenue_total, base_10, base_21, tax_10, tax_21, revenue_dine_in, revenue_takeout, revenue_delivery, total_covers, labor_hours, cost_of_goods, labor_cost, day_status')
            .eq('restaurant_id', restaurantId)
            .gte('date', from)
            .lte('date', to)
            .order('date', { ascending: true }),
        supabase
            .from('operating_expenses')
            .select('expense_date, category, amount, tax_amount, withholding_amount, is_professional_invoice')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', from)
            .lte('expense_date', to)
            .order('expense_date', { ascending: true }),
        supabase
            .from('monthly_targets')
            .select('month_year, revenue_target, cogs_target_pct, labor_target_pct')
            .eq('restaurant_id', restaurantId)
            .gte('month_year', fromMonth)
            .lte('month_year', toMonth),
        supabase
            .from('employees')
            .select('id, role, status, hourly_rate, monthly_base_salary, contract_hours_weekly')
            .eq('restaurant_id', restaurantId),
        supabase
            .from('shifts')
            .select('date, status, estimated_cost, actual_cost')
            .eq('restaurant_id', restaurantId)
            .gte('date', from)
            .lte('date', to),
        supabase
            .from('suppliers')
            .select('id, name, reliability_score, trend_direction, total_orders, avg_price_variance')
            .eq('restaurant_id', restaurantId),
        supabase
            .from('invoices')
            .select('date, status, total_amount, supplier_id')
            .eq('restaurant_id', restaurantId)
            .gte('date', from)
            .lte('date', to),
        supabase
            .from('daily_recipe_sales')
            .select('date, recipe_id, quantity_sold')
            .eq('restaurant_id', restaurantId)
            .gte('date', from)
            .lte('date', to),
        supabase
            .from('recipes')
            .select('id, name, selling_price, current_cost')
            .eq('restaurant_id', restaurantId),
        supabase
            .from('menu_reports')
            .select('id, name, date_from, date_to, avg_popularity, avg_margin, items:menu_report_items(id, quantity_sold, contribution_margin, total_sales, total_profit, popularity_pct, classification, recipe:recipes(name))')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'ANALYZED')
            .gte('date_from', from)
            .lte('date_to', to)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    const firstError = [
        restaurantRes.error,
        salesRes.error,
        expensesRes.error,
        targetsRes.error,
        employeesRes.error,
        shiftsRes.error,
        suppliersRes.error,
        invoicesRes.error,
        recipeSalesRes.error,
        recipesRes.error,
        menuEngineeringReportRes.error,
    ].find(Boolean)

    if (firstError) {
        return { success: false, error: 'No se pudieron cargar los datos del informe.' }
    }

    if (!restaurantRes.data) {
        return { success: false, error: 'Restaurante no encontrado.' }
    }

    const report = buildProfessionalRestaurantReport({
        restaurant: {
            id: restaurantRes.data.id,
            name: restaurantRes.data.name,
        },
        period: {
            from,
            to,
            days: daysInclusive(from, to),
        },
        sales: (salesRes.data || []) as SalesReportRow[],
        expenses: (expensesRes.data || []) as ExpenseReportRow[],
        monthlyTargets: (targetsRes.data || []) as MonthlyTargetReportRow[],
        employees: (employeesRes.data || []) as EmployeeReportRow[],
        shifts: (shiftsRes.data || []) as ShiftReportRow[],
        suppliers: (suppliersRes.data || []) as SupplierReportRow[],
        invoices: (invoicesRes.data || []) as InvoiceReportRow[],
        recipeSales: (recipeSalesRes.data || []) as DailyRecipeSalesReportRow[],
        recipes: (recipesRes.data || []) as RecipeReportRow[],
        menuEngineeringReport: mapMenuEngineeringReport(menuEngineeringReportRes.data),
    })

    return { success: true, data: report }
}

export async function getProfessionalReportDraftHistory(
    rawPeriod?: z.infer<typeof ReportPeriodSchema>
): Promise<ActionResponse<SavedProfessionalReportDraft[]>> {
    const parsed = rawPeriod ? ReportPeriodSchema.safeParse(rawPeriod) : null
    if (parsed && !parsed.success) {
        return { success: false, error: 'Periodo de informe inválido.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para consultar versiones.' }
    }

    const supabase = await createClient()
    let query = supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, created_at, updated_at, exported_at')
        .eq('restaurant_id', restaurantId)
        .order('updated_at', { ascending: false })
        .limit(12)

    if (parsed?.success) {
        query = query
            .eq('period_from', parsed.data.from)
            .eq('period_to', parsed.data.to)
    }

    const { data, error } = await query

    if (error) {
        return { success: false, error: 'No se pudo cargar el historial de informes.' }
    }

    return {
        success: true,
        data: (data || []).map(row => mapDraftRow(row as Parameters<typeof mapDraftRow>[0])),
    }
}

export async function saveProfessionalReportDraft(
    rawInput: z.input<typeof SaveProfessionalReportDraftSchema>
): Promise<ActionResponse<SavedProfessionalReportDraft>> {
    const parsed = SaveProfessionalReportDraftSchema.safeParse(rawInput)
    if (!parsed.success) {
        return { success: false, error: 'Datos de guardado inválidos.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para guardar el informe.' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        return { success: false, error: 'No se pudo validar el usuario actual.' }
    }

    const reportResponse = await getProfessionalReportDraft(parsed.data.period)
    if (!reportResponse.success || !reportResponse.data) {
        return { success: false, error: reportResponse.error || 'No se pudo regenerar el informe antes de guardarlo.' }
    }

    const report = reportResponse.data
    if (report.restaurant.id !== restaurantId) {
        return { success: false, error: 'El informe no pertenece al restaurante activo.' }
    }

    let data: unknown = null
    let lastInsertError: { code?: string } | null = null

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const { data: latestVersionRow, error: latestVersionError } = await supabase
            .from('professional_report_drafts')
            .select('version')
            .eq('restaurant_id', restaurantId)
            .eq('period_from', parsed.data.period.from)
            .eq('period_to', parsed.data.period.to)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (latestVersionError) {
            return { success: false, error: 'No se pudo calcular la siguiente versión del informe.' }
        }

        const nextVersion = ((latestVersionRow?.version as number | undefined) ?? 0) + 1
        const insertResponse = await supabase
            .from('professional_report_drafts')
            .insert({
                restaurant_id: restaurantId,
                period_from: parsed.data.period.from,
                period_to: parsed.data.period.to,
                version: nextVersion,
                status: parsed.data.status,
                schema_version: report.schemaVersion,
                report_snapshot: report,
                narrative_overrides: sanitizeNarrativeOverrides(parsed.data.narrativeOverrides),
                created_by: user.id,
            })
            .select('id, period_from, period_to, version, status, schema_version, created_at, updated_at, exported_at')
            .single()

        if (!insertResponse.error) {
            data = insertResponse.data
            lastInsertError = null
            break
        }

        lastInsertError = insertResponse.error
        if (insertResponse.error.code !== '23505') break
    }

    if (lastInsertError || !data) {
        return { success: false, error: 'No se pudo guardar la versión del informe.' }
    }

    revalidatePath('/reports')

    return {
        success: true,
        data: mapDraftRow(data as Parameters<typeof mapDraftRow>[0]),
    }
}

export async function getSavedProfessionalReportDraft(
    id: string
): Promise<ActionResponse<SavedProfessionalReportDraftDetail>> {
    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) {
        return { success: false, error: 'Identificador de informe inválido.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para abrir el informe.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .select('id, period_from, period_to, version, status, schema_version, report_snapshot, narrative_overrides, created_at, updated_at, exported_at')
        .eq('id', parsedId.data)
        .eq('restaurant_id', restaurantId)
        .maybeSingle()

    if (error) {
        return { success: false, error: 'No se pudo cargar la versión guardada.' }
    }

    if (!data) {
        return { success: false, error: 'Informe guardado no encontrado.' }
    }

    return {
        success: true,
        data: {
            ...mapDraftRow(data as Parameters<typeof mapDraftRow>[0]),
            report: data.report_snapshot as ProfessionalRestaurantReport,
            narrativeOverrides: (data.narrative_overrides || {}) as Record<string, string>,
        },
    }
}

export async function markProfessionalReportDraftExported(id: string): Promise<ActionResponse<SavedProfessionalReportDraft>> {
    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) {
        return { success: false, error: 'Identificador de informe inválido.' }
    }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) {
        return { success: false, error: 'No hay restaurante activo para marcar el informe.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('professional_report_drafts')
        .update({ exported_at: new Date().toISOString() })
        .eq('id', parsedId.data)
        .eq('restaurant_id', restaurantId)
        .select('id, period_from, period_to, version, status, schema_version, created_at, updated_at, exported_at')
        .single()

    if (error) {
        return { success: false, error: 'No se pudo marcar el informe como exportado.' }
    }

    revalidatePath('/reports')
    revalidatePath(`/reports/print/${parsedId.data}`)

    return {
        success: true,
        data: mapDraftRow(data as Parameters<typeof mapDraftRow>[0]),
    }
}
