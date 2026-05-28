'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { revalidatePath } from "next/cache"

const log = createActionLogger('billing')

export async function getCredits() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('restaurants')
        .select('ocr_credits')
        .eq('id', restaurantId)
        .single()

    if (error) {
        log.error({ err: error }, "Error fetching credits")
        return 0
    }

    return data.ocr_credits || 0
}

export async function deductCredit(amount: number = 1) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // 1. Get current credits
    const currentCredits = await getCredits()

    if (currentCredits < amount) {
        throw new Error("Saldo insuficiente de créditos OCR.")
    }

    // 2. Deduct
    const { error } = await supabase
        .from('restaurants')
        .update({ ocr_credits: currentCredits - amount })
        .eq('id', restaurantId)

    if (error) throw new Error("Error actualizando créditos")

    revalidatePath('/invoices') // Update UI if showing credits there
    return true
}

export async function checkCreditsAvailable() {
    const credits = await getCredits()
    return credits > 0
}
