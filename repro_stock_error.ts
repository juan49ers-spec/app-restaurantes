import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config()

async function repro() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const restaurantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Example from seed
    const ingredientId = 'a1e12345-e123-4123-a123-0123456789ab' // Example from seed (Aceite)

    console.log("--- Testing stock_movements constraint ---")
    const { error: moveError } = await supabase.from('stock_movements').insert({
        restaurant_id: restaurantId,
        ingredient_id: ingredientId,
        type: 'MANUAL_ADD', // This should fail
        quantity: 10,
        notes: 'Test manual add',
        date: new Date().toISOString().split('T')[0]
    })

    if (moveError) {
        console.log("Expected Error caught:", moveError.message)
    } else {
        console.log("CRITICAL: Manual add succeeded unexpectedly!")
    }

    console.log("\n--- Testing .single() on missing stock ---")
    // Use a random UUID to ensure it doesn't exist
    const randomId = '00000000-0000-0000-0000-000000000000'
    const { data, error: singleError } = await supabase
        .from('inventory_stock')
        .select('current_qty')
        .eq('restaurant_id', restaurantId)
        .eq('ingredient_id', randomId)
        .single()

    if (singleError) {
        console.log(".single() Error caught:", singleError.message)
    } else {
        console.log(".single() Succeeded with data:", data)
    }
}

repro()
