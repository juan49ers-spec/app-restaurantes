"use server"

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { Employee, Shift } from "@/types/schema"
import { getUserRestaurant } from "./utils"
import { z } from "zod"
import {
    parseEmployeesCsvPreview,
    type EmployeesCsvPayload,
} from "@/lib/importing/employees-csv"
import {
    parseShiftsCsvPreview,
    type ShiftsCsvPayload,
} from "@/lib/importing/shifts-csv"

const EmployeesCsvImportSchema = z.object({
    csvText: z.string().min(1, "CSV vacío"),
})

const ShiftsCsvImportSchema = z.object({
    csvText: z.string().min(1, "CSV vacío"),
})

type EmployeesCsvPreflight = {
    canImport: boolean
    existingRows: {
        key: string
        rowNumbers: number[]
        message: string
    }[]
    summary: ReturnType<typeof parseEmployeesCsvPreview>["summary"]
}

type ShiftsCsvPreflight = {
    canImport: boolean
    existingRows: {
        key: string
        rowNumbers: number[]
        message: string
    }[]
    summary: ReturnType<typeof parseShiftsCsvPreview>["summary"]
}

export async function validateEmployeesCsvImport(input: z.input<typeof EmployeesCsvImportSchema>): Promise<{
    success: boolean
    data?: EmployeesCsvPreflight
    error?: string
}> {
    const parsed = EmployeesCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar empleados." }

    const preview = parseEmployeesCsvPreview(parsed.data)
    const validationError = employeesCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const existingRows = await findExistingEmployeeRows(supabase, preview, restaurantId)
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

export async function importEmployeesCsv(input: z.input<typeof EmployeesCsvImportSchema>): Promise<{
    success: boolean
    data?: {
        importedRows: number
        summary: ReturnType<typeof parseEmployeesCsvPreview>["summary"]
    }
    error?: string
}> {
    const parsed = EmployeesCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar empleados." }

    const preview = parseEmployeesCsvPreview(parsed.data)
    const validationError = employeesCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const existingRows = await findExistingEmployeeRows(supabase, preview, restaurantId)
    if (!existingRows.success) return { success: false, error: existingRows.error }
    if (existingRows.rows.length > 0) {
        return { success: false, error: "El CSV contiene empleados que ya existen. Revisa duplicados antes de importar." }
    }

    const rows = preview.rows
        .filter((row): row is typeof row & { payload: EmployeesCsvPayload } => row.status === "valid" && row.payload !== undefined)
        .map(row => ({
            restaurant_id: restaurantId,
            first_name: row.payload.first_name,
            last_name: row.payload.last_name,
            role: row.payload.role,
            email: row.payload.email,
            phone: row.payload.phone,
            contract_type: row.payload.contract_type,
            contract_hours_weekly: row.payload.contract_hours_weekly,
            wage_type: row.payload.wage_type,
            hourly_rate: row.payload.hourly_rate,
            monthly_base_salary: row.payload.monthly_base_salary,
            status: row.payload.status,
            is_active: row.payload.status === "ACTIVE",
            color_code: row.payload.color_code,
            system_access_level: "NONE",
        }))

    const { data, error } = await supabase
        .from("employees")
        .insert(rows)
        .select()

    if (error) return { success: false, error: error.message }

    revalidatePath("/staff/employees")
    revalidatePath("/staff/schedule")
    revalidatePath("/consultant")
    revalidatePath("/reports")

    return {
        success: true,
        data: {
            importedRows: Array.isArray(data) ? data.length : rows.length,
            summary: preview.summary,
        },
    }
}

function employeesCsvValidationError(preview: ReturnType<typeof parseEmployeesCsvPreview>) {
    if (preview.fileErrors.length > 0 || preview.invalidRows > 0) {
        return "El CSV contiene errores. Revisa el preview antes de importar."
    }

    if (preview.duplicates.length > 0) {
        return "El CSV contiene duplicados internos. Revisa el preview antes de importar."
    }

    if (preview.validRows === 0) {
        return "El CSV no contiene empleados válidos."
    }

    return null
}

async function findExistingEmployeeRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    preview: ReturnType<typeof parseEmployeesCsvPreview>,
    restaurantId: string,
): Promise<{
    success: true
    rows: EmployeesCsvPreflight["existingRows"]
} | { success: false; error: string }> {
    const validRows = preview.rows.filter((row): row is typeof row & { payload: EmployeesCsvPayload } =>
        row.status === "valid" && row.payload !== undefined
    )
    const rowNumbersByName = new Map(validRows.map(row => [normalizeEmployeeName(`${row.payload.first_name} ${row.payload.last_name}`), [row.rowNumber]]))
    const rowNumbersByEmail = new Map(
        validRows
            .filter(row => row.payload.email)
            .map(row => [row.payload.email?.toLowerCase() ?? "", [row.rowNumber]])
    )

    const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .eq("restaurant_id", restaurantId)

    if (error) {
        return {
            success: false,
            error: "No se pudieron comprobar empleados existentes. Inténtalo de nuevo antes de importar.",
        }
    }

    const rows: EmployeesCsvPreflight["existingRows"] = []
    for (const employee of (data ?? []) as { id: string; first_name: string; last_name: string; email?: string | null }[]) {
        const email = employee.email?.toLowerCase()
        if (email && rowNumbersByEmail.has(email)) {
            rows.push({
                key: `email:${email}`,
                rowNumbers: rowNumbersByEmail.get(email) ?? [],
                message: `Ya existe un empleado con email ${email}.`,
            })
            continue
        }

        const nameKey = normalizeEmployeeName(`${employee.first_name} ${employee.last_name}`)
        if (rowNumbersByName.has(nameKey)) {
            rows.push({
                key: `name:${nameKey}`,
                rowNumbers: rowNumbersByName.get(nameKey) ?? [],
                message: `Ya existe un empleado llamado ${employee.first_name} ${employee.last_name}.`,
            })
        }
    }

    return { success: true, rows }
}

export async function validateShiftsCsvImport(input: z.input<typeof ShiftsCsvImportSchema>): Promise<{
    success: boolean
    data?: ShiftsCsvPreflight
    error?: string
}> {
    const parsed = ShiftsCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar turnos." }

    const preview = parseShiftsCsvPreview(parsed.data)
    const validationError = shiftsCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const resolved = await resolveShiftRows(supabase, preview, restaurantId)
    if (!resolved.success) return { success: false, error: resolved.error }

    const existingRows = await safeFindExistingShiftRows(supabase, resolved.rows, resolved.employeeNames, restaurantId)
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

export async function importShiftsCsv(input: z.input<typeof ShiftsCsvImportSchema>): Promise<{
    success: boolean
    data?: {
        importedRows: number
        summary: ReturnType<typeof parseShiftsCsvPreview>["summary"]
    }
    error?: string
}> {
    const parsed = ShiftsCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar turnos." }

    const preview = parseShiftsCsvPreview(parsed.data)
    const validationError = shiftsCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const resolved = await resolveShiftRows(supabase, preview, restaurantId)
    if (!resolved.success) return { success: false, error: resolved.error }

    const existingRows = await safeFindExistingShiftRows(supabase, resolved.rows, resolved.employeeNames, restaurantId)
    if (!existingRows.success) return { success: false, error: existingRows.error }
    if (existingRows.rows.length > 0) {
        return { success: false, error: "El CSV contiene turnos que ya existen. Revisa duplicados antes de importar." }
    }

    const rows = resolved.rows.map(row => ({
        restaurant_id: restaurantId,
        employee_id: row.employee_id,
        date: row.date,
        start_time: row.start_time,
        end_time: row.end_time,
        break_minutes: row.break_minutes,
        shift_type: row.shift_type,
        status: row.status,
        estimated_cost: row.estimated_cost,
        notes: row.notes,
    }))

    const { data, error } = await supabase
        .from("shifts")
        .insert(rows)
        .select()

    if (error) return { success: false, error: error.message }

    revalidatePath("/staff/schedule")
    revalidatePath("/consultant")
    revalidatePath("/reports")

    return {
        success: true,
        data: {
            importedRows: Array.isArray(data) ? data.length : rows.length,
            summary: preview.summary,
        },
    }
}

function shiftsCsvValidationError(preview: ReturnType<typeof parseShiftsCsvPreview>) {
    if (preview.fileErrors.length > 0 || preview.invalidRows > 0) {
        return "El CSV contiene errores. Revisa el preview antes de importar."
    }

    if (preview.duplicates.length > 0) {
        return "El CSV contiene duplicados internos. Revisa el preview antes de importar."
    }

    if (preview.validRows === 0) {
        return "El CSV no contiene turnos válidos."
    }

    return null
}

type ResolvedShiftRow = {
    employee_id: string
    date: string
    start_time: string
    end_time: string
    break_minutes: number
    shift_type?: string
    status: string
    estimated_cost: number
    notes?: string
    rowNumber: number
}

async function resolveShiftRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    preview: ReturnType<typeof parseShiftsCsvPreview>,
    restaurantId: string,
): Promise<{
    success: true
    rows: ResolvedShiftRow[]
    employeeNames: Map<string, string>
} | { success: false; error: string }> {
    const validRows = preview.rows.filter((row): row is typeof row & { payload: ShiftsCsvPayload } =>
        row.status === "valid" && row.payload !== undefined
    )

    const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, hourly_rate, status")
        .eq("restaurant_id", restaurantId)

    if (error) return { success: false, error: error.message }

    const employees = (data ?? []) as {
        id: string
        first_name: string
        last_name: string
        hourly_rate: number | null
        status?: string | null
    }[]

    const employeesById = new Map(employees.map(employee => [employee.id, employee]))
    const employeeNameCounts = new Map<string, number>()
    for (const employee of employees) {
        const key = normalizeEmployeeName(`${employee.first_name} ${employee.last_name}`)
        employeeNameCounts.set(key, (employeeNameCounts.get(key) ?? 0) + 1)
    }

    const employeesByName = new Map(employees.map(employee => [normalizeEmployeeName(`${employee.first_name} ${employee.last_name}`), employee]))
    const employeeNames = new Map(employees.map(employee => [employee.id, `${employee.first_name} ${employee.last_name}`.trim()]))
    const rows: ResolvedShiftRow[] = []

    for (const row of validRows) {
        const payload = row.payload
        const employeeNameKey = normalizeEmployeeName(payload.employee_name ?? "")
        if (!payload.employee_id && employeeNameKey && (employeeNameCounts.get(employeeNameKey) ?? 0) > 1) {
            return { success: false, error: "El CSV contiene nombres de empleado ambiguos. Usa employee_id para esos turnos." }
        }

        const employee = payload.employee_id
            ? employeesById.get(payload.employee_id)
            : employeesByName.get(employeeNameKey)

        if (!employee) {
            return { success: false, error: "El CSV contiene empleados que no existen en este restaurante." }
        }

        if (employee.status === "INACTIVE") {
            return { success: false, error: "El CSV contiene empleados inactivos. Revisa el equipo antes de importar turnos." }
        }

        rows.push({
            employee_id: employee.id,
            date: payload.date,
            start_time: payload.start_time,
            end_time: payload.end_time,
            break_minutes: payload.break_minutes,
            shift_type: payload.shift_type,
            status: payload.status,
            estimated_cost: calculateShiftCost(payload, employee.hourly_rate ?? 0),
            notes: payload.notes,
            rowNumber: row.rowNumber,
        })
    }

    return { success: true, rows, employeeNames }
}

async function findExistingShiftRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    rows: ResolvedShiftRow[],
    employeeNames: Map<string, string>,
    restaurantId: string,
) {
    const dates = [...new Set(rows.map(row => row.date))]
    const employeeIds = [...new Set(rows.map(row => row.employee_id))]

    const { data, error } = await supabase
        .from("shifts")
        .select("employee_id, date, start_time, end_time")
        .eq("restaurant_id", restaurantId)
        .in("date", dates)
        .in("employee_id", employeeIds)

    if (error) throw new Error(error.message)

    const rowNumbersByKey = new Map(rows.map(row => [shiftDuplicateKey(row), [row.rowNumber]]))
    const csvKeys = new Set(rowNumbersByKey.keys())

    return ((data ?? []) as { employee_id: string; date: string; start_time: string; end_time: string }[])
        .filter(row => csvKeys.has(shiftDuplicateKey(row)))
        .map(row => {
            const key = shiftDuplicateKey(row)
            return {
                key,
                rowNumbers: rowNumbersByKey.get(key) ?? [],
                message: `Ya existe turno para ${employeeNames.get(row.employee_id) ?? row.employee_id} el ${row.date} de ${row.start_time} a ${row.end_time}.`,
            }
        })
}

async function safeFindExistingShiftRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    rows: ResolvedShiftRow[],
    employeeNames: Map<string, string>,
    restaurantId: string,
): Promise<{
    success: true
    rows: Awaited<ReturnType<typeof findExistingShiftRows>>
} | { success: false; error: string }> {
    try {
        return {
            success: true,
            rows: await findExistingShiftRows(supabase, rows, employeeNames, restaurantId),
        }
    } catch {
        return {
            success: false,
            error: "No se pudieron comprobar duplicados existentes. Inténtalo de nuevo antes de importar.",
        }
    }
}

function shiftDuplicateKey(row: { employee_id: string; date: string; start_time: string; end_time: string }) {
    return `${row.date}|${row.employee_id}|${row.start_time}|${row.end_time}`
}

function calculateShiftCost(payload: ShiftsCsvPayload, hourlyRate: number) {
    const start = timeToMinutes(payload.start_time)
    const end = timeToMinutes(payload.end_time)
    const durationMinutes = (end >= start ? end - start : end + 1440 - start) - payload.break_minutes
    const hours = Math.max(0, durationMinutes / 60)
    return Math.round(hours * hourlyRate * 100) / 100
}

function timeToMinutes(value: string) {
    const [hours, minutes] = value.split(":").map(Number)
    return hours * 60 + minutes
}

function normalizeEmployeeName(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, " ")
}

// ==========================================
// EMPLOYEES
// ==========================================

export async function getEmployees(): Promise<{ data: Employee[] | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { data: null, error: "No autorizado." }
        }

        if (!restaurantId) {
            return { data: null, error: "No hay restaurante activo." }
        }

        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("first_name", { ascending: true })

        if (error) {
            console.error("Error fetching employees:", error)
            return { data: null, error: "No se pudieron cargar los empleados." }
        }

        return { data: data as Employee[], error: null }
    } catch (err) {
        console.error("Unexpected error in getEmployees:", err)
        return { data: null, error: "Error inesperado al cargar empleados." }
    }
}

export async function upsertEmployee(employee: Partial<Employee>): Promise<{ success: boolean; data: Employee | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, data: null, error: "No autorizado para modificar personal." }
        }

        if (!restaurantId) {
            return { success: false, data: null, error: "Faltan datos de restaurante." }
        }

        const { restaurant_id: _ignoredRestaurantId, ...safeEmployee } = employee

        const { data, error } = await supabase
            .from("employees")
            .upsert({ ...safeEmployee, restaurant_id: restaurantId })
            .select()
            .single()

        if (error) {
            console.error("Error upserting employee:", error)
            return { success: false, data: null, error: "No se pudo guardar el empleado." }
        }

        revalidatePath("/staff/employees")
        revalidatePath("/staff/schedule")

        return { success: true, data: data as Employee, error: null }
    } catch (err) {
        console.error("Unexpected error in upsertEmployee:", err)
        return { success: false, data: null, error: "Error inesperado al guardar el empleado." }
    }
}

export async function toggleEmployeeStatus(employeeId: string, currentStatus: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: "No autorizado." }
        }

        if (!restaurantId) {
            return { success: false, error: "No hay restaurante activo." }
        }

        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

        const { error } = await supabase
            .from("employees")
            .update({ status: newStatus })
            .eq("id", employeeId)
            .eq("restaurant_id", restaurantId) // Double verify access via restaurant

        if (error) {
            console.error("Error toggling employee status:", error)
            return { success: false, error: "No se pudo cambiar el estado." }
        }

        revalidatePath("/staff/employees")
        return { success: true, error: null }
    } catch (err) {
        console.error("Unexpected error in toggleEmployeeStatus:", err)
        return { success: false, error: "Error inesperado." }
    }
}

export async function deleteEmployee(employeeId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: "No autorizado." }
        }

        if (!restaurantId) {
            return { success: false, error: "No hay restaurante activo." }
        }

        // Se usa hard delete aquí, pero el soft delete se realiza con toggleEmployeeStatus hacia INACTIVE. 
        // Esta función se mantiene por si el dueño quiere borrar el registro por completo.
        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", employeeId)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Error deleting employee:", error)
            return { success: false, error: "Error al eliminar ficha del empleado. Es posible que tenga turnos asignados." }
        }

        revalidatePath("/staff/employees")
        return { success: true, error: null }
    } catch (err) {
        console.error("Unexpected error in deleteEmployee:", err)
        return { success: false, error: "Error inesperado." }
    }
}

// ==========================================
// SHIFTS
// ==========================================

export interface DailyForecast {
    date: string
    projectedSales: number
    actualSales: number | null
    laborCost: number
    laborHours: number
    targetLaborCostPct: number
    status: 'OPTIMAL' | 'OVERSTAFFED' | 'UNDERSTAFFED'
    efficiency: number // (Labor / Sales) * 100
}

export async function getStaffingForecast(_restaurantId: string, startDate: string, endDate: string): Promise<DailyForecast[]> {
    try {
        const supabase = await createClient()
        const activeRestaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("No autorizado.")
        if (!activeRestaurantId) throw new Error("No hay restaurante activo.")

        // 1. Fetch Scheduled Shifts for the period
        const { data: shifts } = await supabase
            .from('shifts')
            .select('*')
            .eq('restaurant_id', activeRestaurantId)
            .gte('date', startDate)
            .lte('date', endDate)

        // 2. Fetch Actual Sales for the period (if any)
        const { data: actualSales } = await supabase
            .from('daily_sales')
            .select('date, revenue_total')
            .eq('restaurant_id', activeRestaurantId)
            .gte('date', startDate)
            .lte('date', endDate)

        // 3. Fetch Monthly Target (Labor Cost %)
        const monthYear = startDate.substring(0, 7)
        const { data: target } = await supabase
            .from('monthly_targets')
            .select('labor_target_pct')
            .eq('restaurant_id', activeRestaurantId)
            .eq('month_year', monthYear)
            .single()

        const targetPct = target?.labor_target_pct || 30

        // 4. Calculate Forecast 
        const startObj = new Date(startDate)
        const endObj = new Date(endDate)
        const days: DailyForecast[] = []

        // Fetch Historical Sales for Forecasting
        const historyStart = new Date(startObj)
        historyStart.setDate(historyStart.getDate() - 30)
        const historyStartStr = historyStart.toISOString().split('T')[0]

        const { data: historySales } = await supabase
            .from('daily_sales')
            .select('date, revenue_total')
            .eq('restaurant_id', activeRestaurantId)
            .gte('date', historyStartStr)
            .lt('date', startDate)

        for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]
            const actual = actualSales?.find(s => s.date === dateStr)
            let projected = 0

            if (actual) {
                projected = actual.revenue_total
            } else {
                const dayOfWeek = d.getDay()
                const relevant = historySales?.filter(h => new Date(h.date).getDay() === dayOfWeek) || []
                if (relevant.length > 0) {
                    const total = relevant.reduce((acc, curr) => acc + curr.revenue_total, 0)
                    projected = total / relevant.length
                }
            }

            const dayShifts = shifts?.filter(s => s.date === dateStr) || []
            const laborCost = dayShifts.reduce((acc, s) => acc + (s.estimated_cost || 0), 0)

            const laborHours = dayShifts.reduce((acc, s) => {
                const start = parseInt(s.start_time.split(':')[0]) + parseInt(s.start_time.split(':')[1]) / 60
                const end = parseInt(s.end_time.split(':')[0]) + parseInt(s.end_time.split(':')[1]) / 60
                return acc + (end - start)
            }, 0)

            const salesBase = actual ? actual.revenue_total : (projected || 1)
            const efficiency = salesBase > 1 ? (laborCost / salesBase) * 100 : 0

            let status: DailyForecast['status'] = 'OPTIMAL'
            if (efficiency > targetPct + 5) status = 'OVERSTAFFED'
            else if (efficiency < targetPct - 5 && efficiency > 0) status = 'UNDERSTAFFED'

            days.push({
                date: dateStr,
                projectedSales: projected,
                actualSales: actual ? actual.revenue_total : null,
                laborCost,
                laborHours,
                targetLaborCostPct: targetPct,
                status,
                efficiency
            })
        }

        return days
    } catch (err) {
        console.error("Error in getStaffingForecast:", err)
        return []
    }
}

export async function getShifts(_restaurantId: string, startDate: string, endDate: string): Promise<{ data: Shift[] | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const activeRestaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: "No autorizado." }
        if (!activeRestaurantId) return { data: null, error: "No hay restaurante activo." }

        const { data, error } = await supabase
            .from("shifts")
            .select("*, employees!inner(first_name, last_name, color_code, role)")
            .eq("restaurant_id", activeRestaurantId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true })

        if (error) {
            console.error("Error fetching shifts:", error)
            return { data: null, error: "No se pudieron cargar los turnos." }
        }

        return { data: data as Shift[], error: null }
    } catch (err) {
        console.error("Unexpected error in getShifts:", err)
        return { data: null, error: "Error inesperado." }
    }
}

export async function upsertShift(shift: Partial<Shift>): Promise<{ success: boolean; data: Shift | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, data: null, error: "No autorizado." }

        if (!restaurantId || !shift.employee_id) {
            return { success: false, data: null, error: "Faltan datos obligatorios del turno." }
        }

        const { restaurant_id: _ignoredRestaurantId, ...safeShift } = shift

        const { data, error } = await supabase
            .from("shifts")
            .upsert({ ...safeShift, restaurant_id: restaurantId })
            .select()
            .single()

        if (error) {
            console.error("Error upserting shift:", error)
            return { success: false, data: null, error: "No se pudo guardar el turno." }
        }

        revalidatePath("/staff/schedule")
        return { success: true, data: data as Shift, error: null }
    } catch (err) {
        console.error("Unexpected error in upsertShift:", err)
        return { success: false, data: null, error: "Error inesperado." }
    }
}

export async function deleteShift(shiftId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, error: "No autorizado." }
        if (!restaurantId) return { success: false, error: "No hay restaurante activo." }

        const { error } = await supabase
            .from("shifts")
            .delete()
            .eq("id", shiftId)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Error deleting shift:", error)
            return { success: false, error: "No se pudo eliminar el turno." }
        }

        revalidatePath("/staff/schedule")
        return { success: true, error: null }
    } catch (err) {
        console.error("Unexpected error in deleteShift:", err)
        return { success: false, error: "Error inesperado." }
    }
}
