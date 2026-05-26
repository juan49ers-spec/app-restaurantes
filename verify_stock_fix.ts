import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyFix() {
    const restaurantId = '637da52e-ec0a-4fc6-894d-10fbd7763ff9' // LA FAVORITA

    // 1. Get an ingredient
    const { data: ingredients } = await supabase
        .from('master_ingredients')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .limit(1)

    if (!ingredients?.length) {
        console.error("No ingredients found to test with.")
        return
    }

    const ingredientId = ingredients[0].id
    console.log(`Testing with ingredient: ${ingredients[0].name} (${ingredientId})`)

    // 2. Simulate MANUAL_ADD movement
    // The code fix in stock-actions.ts maps this to 'PURCHASE'
    // Let's test if 'PURCHASE' is accepted (which it should be per the check constraint)
    console.log("Simulating movement insertion...")
    const { error: moveError } = await supabase.from('stock_movements').insert({
        restaurant_id: restaurantId,
        ingredient_id: ingredientId,
        type: 'PURCHASE', // This is what MANUAL_ADD maps to now
        quantity: 5,
        notes: 'Test verification',
        date: new Date().toISOString().split('T')[0]
    })

    if (moveError) {
        console.error("Movement insertion FAILED:", moveError)
    } else {
        console.log("Movement insertion SUCCESSFUL.")
    }

    // 3. Test RPC
    console.log("Testing RPC increment_inventory_stock...")
    const { error: rpcError } = await supabase.rpc('increment_inventory_stock', {
        p_restaurant_id: restaurantId,
        p_ingredient_id: ingredientId,
        p_quantity: 5
    })

    if (rpcError) {
        console.error("RPC FAILED:", rpcError)
    } else {
        console.log("RPC SUCCESSFUL.")
    }
}

verifyFix()
