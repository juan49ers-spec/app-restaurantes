'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

interface ContractAlert {
    supplierId: string
    supplierName: string
    renewalDate: string
    daysRemaining: number
    urgency: 'critical' | 'high' | 'medium' | 'low'
    paymentTerms: string | null
}

export async function getContractAlerts(): Promise<ContractAlert[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, contract_renewal_date, payment_terms')
        .eq('restaurant_id', restaurantId)
        .not('contract_renewal_date', 'is', null)

    if (!suppliers) return []

    const now = new Date()
    const alerts: ContractAlert[] = suppliers.map(s => {
        const renewalDate = new Date(s.contract_renewal_date!)
        const diffTime = renewalDate.getTime() - now.getTime()
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low'
        if (daysRemaining <= 7) urgency = 'critical'
        else if (daysRemaining <= 15) urgency = 'high'
        else if (daysRemaining <= 30) urgency = 'medium'

        return {
            supplierId: s.id,
            supplierName: s.name,
            renewalDate: s.contract_renewal_date!,
            daysRemaining,
            urgency,
            paymentTerms: s.payment_terms || null
        }
    })

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
}

export async function updateContractRenewal(supplierId: string, renewalDate: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { error } = await supabase
        .from('suppliers')
        .update({ contract_renewal_date: renewalDate })
        .eq('id', supplierId)
        .eq('restaurant_id', restaurantId)

    if (error) throw error
}
