'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"

// ==================== TAX PERIOD MANAGEMENT ====================

export async function getCurrentTaxPeriod(): Promise<{
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    daysPassed: number
    daysTotal: number
} | null> {
    const now = new Date()

    // Get current quarter
    const currentMonth = now.getMonth() + 1
    const currentQuarterNum = Math.floor((currentMonth + 2) / 3)
    const currentQuarter = `Q${currentQuarterNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4'
    const currentYear = now.getFullYear()

    // Calculate quarter dates
    const quarterStart = new Date(currentYear, (currentQuarterNum - 1) * 3, 1)
    const quarterEnd = new Date(currentYear, currentQuarterNum * 3, 0)
    quarterEnd.setDate(quarterEnd.getDate() - 1)

    const daysPassed = Math.floor((now.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24))
    const daysTotal = Math.floor((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return {
        year: currentYear,
        quarter: currentQuarter,
        daysPassed,
        daysTotal
    }
}

export async function createTaxPeriod(restaurantId: string, year: number, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()

    // Calculate dates
    const quarterNum = parseInt(quarter[1])
    const startDate = new Date(year, (quarterNum - 1) * 3, 1)
    const endDate = new Date(year, quarterNum * 3, 0)
    endDate.setDate(endDate.getDate() - 1)

    const { error } = await supabase
        .from('tax_periods')
        .insert({
            restaurant_id: restaurantId,
            year,
            quarter,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'open'
        })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    return { success: true }
}

// ==================== TAX PAYMENTS ====================

export async function addTaxPayment(payment: {
    liability_id: string
    amount: number
    date: string
    method: 'transfer' | 'cash' | 'offset'
    reference?: string
}): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tax_payments')
        .insert({
            id: crypto.randomUUID(),
            ...payment
        })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    return { success: true }
}
