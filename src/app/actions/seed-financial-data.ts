'use server'

import { createClient } from "@/lib/supabaseServer"
import { addDays, format, subDays, startOfMonth } from "date-fns"
import { revalidatePath } from "next/cache"
import { OperatingExpenseCategory } from "@/types/schema"

export async function seedFinancialData(restaurantId: string) {
    const supabase = await createClient()
    const today = new Date()
    const startDate = subDays(today, 60) // Last 60 days

    console.log(`🌱 Seeding financial data for restaurant ${restaurantId} from ${format(startDate, 'yyyy-MM-dd')}...`)

    const salesPayloads = []
    const expensesPayloads = []

    // 1. Generate Daily Sales
    for (let d = startDate; d <= today; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd')
        const isWeekend = d.getDay() === 5 || d.getDay() === 6
        const isClosed = d.getDay() === 1 // Closed on Mondays

        if (isClosed) {
            salesPayloads.push({
                restaurant_id: restaurantId,
                date: dateStr,
                day_status: 'CLOSED',
                revenue_dine_in: 0,
                revenue_takeout: 0,
                revenue_delivery: 0,
                revenue_total: 0,
                total_covers: 0,
                labor_hours: 0,
                source: 'seed_script'
            })
            continue
        }

        // Randomize revenue
        const baseRevenue = isWeekend ? 2500 : 1200
        const variance = (Math.random() * 0.4) - 0.2 // +/- 20%
        const dailyRevenue = baseRevenue * (1 + variance)

        const dineIn = dailyRevenue * 0.7
        const takeout = dailyRevenue * 0.2
        const delivery = dailyRevenue * 0.1

        const avgTicket = 25
        const covers = Math.round(dailyRevenue / avgTicket)

        // Calculate IVA (10% for hospitality sector in Spain)
        const ivaCollected = parseFloat((dailyRevenue * 0.10).toFixed(2))

        salesPayloads.push({
            restaurant_id: restaurantId,
            date: dateStr,
            day_status: 'LOCKED', // Assume past days are closed/locked
            revenue_dine_in: parseFloat(dineIn.toFixed(2)),
            revenue_takeout: parseFloat(takeout.toFixed(2)),
            revenue_delivery: parseFloat(delivery.toFixed(2)),
            revenue_total: parseFloat(dailyRevenue.toFixed(2)),
            iva_collected: ivaCollected,
            total_covers: covers,
            labor_hours: isWeekend ? 45 : 32, // Dummy labor
            source: 'seed_script'
        })

        // 2. Generate Random Expenses (Variable)
        // 30% chance of a supplier invoice
        if (Math.random() > 0.7) {
            const baseAmount = parseFloat((Math.random() * 500 + 100).toFixed(2)) // 100-600 eur
            // PROVEEDORES_COMIDA: 10% IVA (food sector)
            const taxRate = 10
            const taxAmount = parseFloat((baseAmount * (taxRate / 100)).toFixed(2))
            const totalAmount = parseFloat((baseAmount + taxAmount).toFixed(2))

            expensesPayloads.push({
                restaurant_id: restaurantId,
                expense_date: dateStr,
                category: 'PROVEEDORES_COMIDA' as OperatingExpenseCategory,
                amount: totalAmount,
                tax_amount: taxAmount,
                tax_rate: taxRate,
                withholding_amount: 0,
                withholding_rate: 0,
                description: 'Pedido Proveedor Alimentación',
                payment_method: 'bank',
                is_paid: true
            })
        }
    }

    // 3. Generate Fixed Expenses (Rent, Utilities)
    // Add for start of each month in range
    let currentMonth = startOfMonth(startDate)
    while (currentMonth <= today) {
        const dateStr = format(currentMonth, 'yyyy-MM-dd')

        // Rent (Alquiler): 21% IVA + 19% IRPF
        const rentBaseAmount = 2500
        const rentTaxRate = 21
        const rentWithholdingRate = 19
        const rentTaxAmount = parseFloat((rentBaseAmount * (rentTaxRate / 100)).toFixed(2))
        const rentWithholdingAmount = parseFloat((rentBaseAmount * (rentWithholdingRate / 100)).toFixed(2))
        const rentTotalAmount = parseFloat((rentBaseAmount + rentTaxAmount - rentWithholdingAmount).toFixed(2))

        expensesPayloads.push({
            restaurant_id: restaurantId,
            expense_date: dateStr,
            category: 'ALQUILER' as OperatingExpenseCategory,
            amount: rentTotalAmount,
            tax_amount: rentTaxAmount,
            tax_rate: rentTaxRate,
            withholding_amount: rentWithholdingAmount,
            withholding_rate: rentWithholdingRate,
            description: 'Alquiler Local Mensual',
            payment_method: 'bank',
            recurrence: 'MONTHLY',
            is_paid: true
        })

        // Utilities (~15th of month): 21% IVA
        const utilityDate = addDays(currentMonth, 14)
        if (utilityDate <= today) {
            const utilityBaseAmount = parseFloat((450 + Math.random() * 100).toFixed(2))
            const utilityTaxRate = 21
            const utilityTaxAmount = parseFloat((utilityBaseAmount * (utilityTaxRate / 100)).toFixed(2))
            const utilityTotalAmount = parseFloat((utilityBaseAmount + utilityTaxAmount).toFixed(2))

            expensesPayloads.push({
                restaurant_id: restaurantId,
                expense_date: format(utilityDate, 'yyyy-MM-dd'),
                category: 'SUMINISTROS' as OperatingExpenseCategory,
                amount: utilityTotalAmount,
                tax_amount: utilityTaxAmount,
                tax_rate: utilityTaxRate,
                withholding_amount: 0,
                withholding_rate: 0,
                description: 'Factura Luz y Agua',
                payment_method: 'bank',
                recurrence: 'MONTHLY',
                is_paid: true
            })
        }

        // Staff Payroll (~28th of month): No VAT, but we include net payroll
        const payrollDate = addDays(currentMonth, 27)
        if (payrollDate <= today) {
            expensesPayloads.push({
                restaurant_id: restaurantId,
                expense_date: format(payrollDate, 'yyyy-MM-dd'),
                category: 'NOMINAS_LIQUIDAS' as OperatingExpenseCategory,
                amount: 12000,
                tax_amount: 0,
                tax_rate: 0,
                withholding_amount: 0,
                withholding_rate: 0,
                description: 'Nóminas Plantilla',
                payment_method: 'bank',
                recurrence: 'MONTHLY',
                is_paid: true
            })
        }

        // Professional Services (~5th of month): 21% IVA + 15% IRPF
        const professionalDate = addDays(currentMonth, 4)
        if (professionalDate <= today) {
            const profBaseAmount = 300
            const profTaxRate = 21
            const profWithholdingRate = 15
            const profTaxAmount = parseFloat((profBaseAmount * (profTaxRate / 100)).toFixed(2))
            const profWithholdingAmount = parseFloat((profBaseAmount * (profWithholdingRate / 100)).toFixed(2))
            const profTotalAmount = parseFloat((profBaseAmount + profTaxAmount - profWithholdingAmount).toFixed(2))

            expensesPayloads.push({
                restaurant_id: restaurantId,
                expense_date: format(professionalDate, 'yyyy-MM-dd'),
                category: 'OTROS' as OperatingExpenseCategory, // Map to OTROS for now
                amount: profTotalAmount,
                tax_amount: profTaxAmount,
                tax_rate: profTaxRate,
                withholding_amount: profWithholdingAmount,
                withholding_rate: profWithholdingRate,
                description: 'Servicios Gestoría y Asesoría',
                payment_method: 'bank',
                recurrence: 'MONTHLY',
                is_paid: true
            })
        }

        currentMonth = addDays(currentMonth, 32)
        currentMonth = startOfMonth(currentMonth) // Jump to next month start
    }

    // Upsert Sales
    const { error: salesError } = await supabase
        .from('daily_sales')
        .upsert(salesPayloads, { onConflict: 'restaurant_id, date' })

    if (salesError) {
        console.error("Sales Seed Error:", salesError)
        return { success: false, error: salesError.message }
    }

    // Insert Expenses
    const { error: expError } = await supabase
        .from('operating_expenses')
        .insert(expensesPayloads)

    if (expError) {
        console.error("Expenses Seed Error:", expError)
        return { success: false, error: expError.message }
    }

    revalidatePath('/financial-control')
    return { success: true, message: `Seeded ${salesPayloads.length} sales and ${expensesPayloads.length} expenses.` }
}
