"use server"

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const PolicySchema = z.object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    is_required: z.boolean().default(true),
    created_at: z.string().optional()
})

export type Policy = z.infer<typeof PolicySchema>

export async function getPolicies(restaurantId: string): Promise<Policy[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('policies')
        .select('id, restaurant_id, title, description, category, is_required, created_at')
        .eq('restaurant_id', restaurantId)
        .order('category')
        .order('title')

    if (error) throw error
    return data as Policy[]
}

export async function upsertPolicy(policy: Policy) {
    const supabase = await createClient()
    const validated = PolicySchema.parse(policy)

    const { error } = await supabase
        .from('policies')
        .upsert({
            ...validated,
            id: validated.id || undefined
        })

    if (error) throw error
    revalidatePath('/staff/policies')
    return { success: true }
}

export async function deletePolicy(policyId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', policyId)

    if (error) throw error
    revalidatePath('/staff/policies')
    return { success: true }
}
