import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)
const restId = '637da52e-ec0a-4fc6-894d-10fbd7763ff9'

async function check() {
    const counts: Record<string, number | null> = {}

    // Using parallel requests for speed
    const [
        { count: staff },
        { count: shifts },
        { count: ingredients },
        { count: stock },
        { count: recipes },
        { count: sales },
        { count: invoices }
    ] = await Promise.all([
        supabase.from('staff').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
        supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
        supabase.from('master_ingredients').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
        supabase.from('inventory_stock').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
        supabase.from('recipes').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
        supabase.from('daily_recipe_sales').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('restaurant_id', restId),
    ])

    counts['staff'] = staff;
    counts['shifts'] = shifts;
    counts['ingredients'] = ingredients;
    counts['stock'] = stock;
    counts['recipes'] = recipes;
    counts['sales'] = sales;
    counts['invoices'] = invoices;

    console.log(JSON.stringify(counts, null, 2))
}
check()
