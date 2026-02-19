
import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000'

async function runIntegrityTest() {
    console.log('🧪 Starting Integrity Test: Cost Trigger Logic\n')

    try {
        // 1. Create a Test Ingredient
        const { data: ingredient, error: ingError } = await supabase
            .from('master_ingredients')
            .insert({
                restaurant_id: TEST_TENANT_ID,
                name: 'Test Ingredient ' + Date.now(),
                base_unit: 'kg',
                current_avg_price: 10.00, // 10 EUR/kg
                standard_waste_pct: 0
            })
            .select()
            .single()

        if (ingError) throw new Error(`Create Ingredient Failed: ${ingError.message}`)
        console.log(`✅ Step 1: Created Ingredient '${ingredient.name}' @ €10.00`)

        // 2. Create a Test Recipe
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
                restaurant_id: TEST_TENANT_ID,
                name: 'Test Recipe ' + Date.now(),
                selling_price: 20.00,
                target_margin_pct: 70
            })
            .select()
            .single()

        if (recipeError) throw new Error(`Create Recipe Failed: ${recipeError.message}`)
        console.log(`✅ Step 2: Created Recipe '${recipe.name}'`)

        // 3. Link them (0.5 kg used)
        const { error: linkError } = await supabase
            .from('recipe_ingredients')
            .insert({
                recipe_id: recipe.id,
                master_ingredient_id: ingredient.id,
                quantity_gross: 0.5,
                quantity_net: 0.5,
                yield_factor: 1
            })

        if (linkError) throw new Error(`Link Ingredient Failed: ${linkError.message}`)
        console.log(`✅ Step 3: Linked 0.5kg of ingredient. Expected Cost: €5.00`)

        // Wait for Trigger (Although synchronous in Postgres, network latency applies)
        await new Promise(r => setTimeout(r, 1000))

        // 4. Verify Initial Cost
        let { data: recipeCheck } = await supabase
            .from('recipes')
            .select('current_cost')
            .eq('id', recipe.id)
            .single()

        if (Number(recipeCheck.current_cost) !== 5.00) {
            throw new Error(`❌ Initial Cost Mismatch. Expected 5.00, got ${recipeCheck.current_cost}`)
        }
        console.log(`✅ Step 4: Verified Initial Cost is €5.00`)

        // 5. UPDATE Ingredient Price (Double it)
        const { error: updateError } = await supabase
            .from('master_ingredients')
            .update({ current_avg_price: 20.00 })
            .eq('id', ingredient.id)

        if (updateError) throw new Error(`Update Price Failed: ${updateError.message}`)
        console.log(`✅ Step 5: Updated Ingredient Price to €20.00. Expected New Recipe Cost: €10.00`)

        // Wait for Trigger
        await new Promise(r => setTimeout(r, 1000))

        // 6. Verify Updated Cost
        let { data: recipeFinal } = await supabase
            .from('recipes')
            .select('current_cost')
            .eq('id', recipe.id)
            .single()

        if (Number(recipeFinal.current_cost) !== 10.00) {
            throw new Error(`❌ Trigger Failed. Expected 10.00, got ${recipeFinal.current_cost}`)
        }
        console.log(`✅ Step 6: Verified Updated Cost is €10.00`)

        // Cleanup
        await supabase.from('recipes').delete().eq('id', recipe.id)
        await supabase.from('master_ingredients').delete().eq('id', ingredient.id)
        console.log(`✅ Step 7: Cleanup Successful`)

        console.log('\n🎉 INTEGRITY TEST PASSED!')

    } catch (err: any) {
        console.error('\n❌ TEST FAILED:', err.message)
        process.exit(1)
    }
}

runIntegrityTest()
