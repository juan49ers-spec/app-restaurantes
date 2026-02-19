import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // or SERVICE_ROLE_KEY if needed for RLS bypass

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runVerification() {
    console.log('🔥 Starting Inventory Atomic Verification (The Fire Test)...')

    // 1. Setup: Get a Recipe and its Ingredient
    // We'll pick the first recipe found and one of its ingredients
    const { data: recipes } = await supabase.from('recipes').select('id, name').limit(1)
    if (!recipes?.length) throw new Error('No recipes found to test.')

    const recipe = recipes[0]
    console.log(`\n📋 Test Recipe: ${recipe.name} (${recipe.id})`)

    const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('master_ingredient_id, quantity_gross')
        .eq('recipe_id', recipe.id)
        .limit(1)

    if (!ingredients?.length) throw new Error('Recipe has no ingredients.')

    const ingredient = ingredients[0]
    const ingredientId = ingredient.master_ingredient_id
    const qtyPerUnit = ingredient.quantity_gross

    // Get Current Stock
    const { data: initialStock } = await supabase
        .from('inventory_stock')
        .select('current_qty')
        .eq('ingredient_id', ingredientId)
        .single()

    const startQty = initialStock?.current_qty || 0
    console.log(`Initial Stock: ${startQty}`)

    // 2. Simulate Sale (10 Units)
    const DATE = new Date().toISOString().split('T')[0] // Today
    const QTY_1 = 10
    console.log(`\n👉 Step 1: Processing Sale of ${QTY_1} units...`)

    // We need to call the RPC directly or simulate the action logic
    // Since we can't easily import the action here (Next.js server action context), 
    // we will CALL THE RPC DIRECTLY to verify the DB logic (which is the critical part).

    // Payload Construction (Mimicking stock-actions.ts logic)
    const salesPayload_1 = [{ recipe_id: recipe.id, quantity_sold: QTY_1 }]
    const deductionsPayload_1 = [{ ingredient_id: ingredientId, quantity_deducted: QTY_1 * qtyPerUnit }]

    const { error: error1 } = await supabase.rpc('process_daily_sales_atomic', {
        p_restaurant_id: (await supabase.auth.getUser()).data.user?.user_metadata?.restaurant_id || '00000000-0000-0000-0000-000000000000', // Mock/Hardcode if needed or use Service Role
        // Wait, we need a valid restaurant ID. 
        // For this script to work without Auth, we might need to query one or use a valid user token.
        // Let's assumpe Anon Key + RLS allows it OR we need Service Key.
        // User didn't give Service Key. We'll try. 
        // Actually, fetching a restaurant ID from the recipe is safer.
    })

    // RE-PLAN: We need a valid Restaurant ID.
    const { data: recipeData } = await supabase.from('recipes').select('restaurant_id').eq('id', recipe.id).single()
    const restaurantId = recipeData?.restaurant_id

    if (!restaurantId) throw new Error('Could not determine restaurant ID')

    console.log(`Context: Restaurant ${restaurantId}, Date ${DATE}`)

    // Clean slate for test date first (Optional, but good for repeatability)
    // await supabase.from('daily_recipe_sales').delete().match({ restaurant_id: restaurantId, date: DATE })
    // await supabase.from('stock_movements').delete().match({ restaurant_id: restaurantId, date: DATE, notes: 'Ventas diarias atomic' })

    // CALL 1
    const { error: rpcError1 } = await supabase.rpc('process_daily_sales_atomic', {
        p_restaurant_id: restaurantId,
        p_date: DATE,
        p_sales: salesPayload_1,
        p_deductions: deductionsPayload_1
    })

    if (rpcError1) throw new Error(`RPC 1 Failed: ${rpcError1.message}`)

    // Verify Stock 1
    const { data: stock1 } = await supabase.from('inventory_stock').select('current_qty').eq('ingredient_id', ingredientId).single()
    const expected1 = startQty - (QTY_1 * qtyPerUnit)
    console.log(`Stock after 10 units: ${stock1?.current_qty} (Expected: ${expected1})`)

    if (Math.abs((stock1?.current_qty || 0) - expected1) > 0.001) {
        console.error('❌ FAIL: Stock mismatch after Step 1')
    } else {
        console.log('✅ PASS: Step 1 OK')
    }

    // 3. Simulate Correction (15 Units)
    const QTY_2 = 15
    console.log(`\n👉 Step 2: Correcting Sale to ${QTY_2} units (Idempotency Test)...`)

    const salesPayload_2 = [{ recipe_id: recipe.id, quantity_sold: QTY_2 }]
    const deductionsPayload_2 = [{ ingredient_id: ingredientId, quantity_deducted: QTY_2 * qtyPerUnit }]

    // CALL 2
    const { error: rpcError2 } = await supabase.rpc('process_daily_sales_atomic', {
        p_restaurant_id: restaurantId,
        p_date: DATE,
        p_sales: salesPayload_2,
        p_deductions: deductionsPayload_2
    })

    if (rpcError2) throw new Error(`RPC 2 Failed: ${rpcError2.message}`)

    // Verify Stock 2
    const { data: stock2 } = await supabase.from('inventory_stock').select('current_qty').eq('ingredient_id', ingredientId).single()

    // The previous deduction (10 * rate) should be GONE, and replaced by (15 * rate)
    // So Expected = Start - (15 * rate)
    // NOT Start - 10 - 15
    const expected2 = startQty - (QTY_2 * qtyPerUnit)

    console.log(`Stock after correction to 15: ${stock2?.current_qty} (Expected: ${expected2})`)
    console.log(`(If Logic Bomb exists, stock would be: ${startQty - (QTY_1 * qtyPerUnit) - (QTY_2 * qtyPerUnit)})`)

    if (Math.abs((stock2?.current_qty || 0) - expected2) > 0.001) {
        console.error('❌ FAIL: Idempotency check failed! Stock is corrupt.')
    } else {
        console.log('✅ PASS: Idempotency Verified. Logic Bomb Diffused.')
    }
}

runVerification().catch(e => console.error(e))
