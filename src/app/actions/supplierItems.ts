'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const SupplierItemSchema = z.object({
    supplier_id: z.string().uuid(),
    name_on_invoice: z.string().min(1),
    sku_on_invoice: z.string().optional(),
    pack_size: z.coerce.number().optional(),
    master_ingredient_id: z.string().uuid().optional(), // Can be null if not mapped yet
    last_price: z.coerce.number().optional()
})

export async function getSupplierItems(supplierId: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('supplier_items')
        .select(`
            *,
            master_ingredients (
                id,
                name
            )
        `)
        .eq('supplier_id', supplierId)
        .eq('restaurant_id', restaurantId)
        .order('name_on_invoice')

    if (error) throw new Error(error.message)
    return data
}

export async function createSupplierItem(formData: FormData) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const rawData = {
        supplier_id: formData.get('supplier_id'),
        name_on_invoice: formData.get('name_on_invoice'),
        sku_on_invoice: formData.get('sku_on_invoice'),
        pack_size: formData.get('pack_size'),
        master_ingredient_id: formData.get('master_ingredient_id') || undefined,
        last_price: formData.get('last_price')
    }

    const validated = SupplierItemSchema.parse(rawData)

    const { error } = await supabase
        .from('supplier_items')
        .insert({
            ...validated,
            restaurant_id: restaurantId
        })

    if (error) throw new Error(error.message)
    revalidatePath(`/suppliers/${validated.supplier_id}`)
}

export async function updateSupplierItem(id: string, formData: FormData) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()
    const supplierId = formData.get('supplier_id') as string

    const rawData = {
        name_on_invoice: formData.get('name_on_invoice'),
        sku_on_invoice: formData.get('sku_on_invoice'),
        pack_size: formData.get('pack_size'),
        master_ingredient_id: formData.get('master_ingredient_id') || null, // Allow unmapping
        last_price: formData.get('last_price')
    }

    const { error } = await supabase
        .from('supplier_items')
        .update(rawData)
        .eq('id', id)
        .eq('restaurant_id', restaurantId)

    if (error) throw new Error(error.message)
    revalidatePath(`/suppliers/${supplierId}`)
}

export async function deleteSupplierItem(id: string, supplierId: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { error } = await supabase
        .from('supplier_items')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', restaurantId)

    if (error) throw new Error(error.message)
    revalidatePath(`/suppliers/${supplierId}`)
}
