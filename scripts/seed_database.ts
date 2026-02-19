import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
// Check if running via tsx/node directly or next
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn('⚠️ Could not load .env.local file. Checking .env...');
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in env');
    console.error('Available Environment Variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

if (!serviceRoleKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
    console.log('🌱 Seeding database...');

    const restaurantId = '00000000-0000-0000-0000-000000000000'; // Test Tenant

    // 1. Ingredients
    const ingredients = [
        { name: 'Tomate Pera', base_unit: 'kg', standard_waste_pct: 0.10, current_avg_price: 1.50 },
        { name: 'Harina Trigo', base_unit: 'kg', standard_waste_pct: 0.00, current_avg_price: 0.80 },
        { name: 'Huevos L', base_unit: 'u', standard_waste_pct: 0.05, current_avg_price: 0.20 },
        { name: 'Queso Mozzarella', base_unit: 'kg', standard_waste_pct: 0.00, current_avg_price: 6.00 },
        { name: 'Aceite Oliva', base_unit: 'l', standard_waste_pct: 0.00, current_avg_price: 5.00 },
    ];

    console.log('Creating Master Ingredients...');

    // Clean first (Optional, but good for idempotent)
    // await supabase.from('master_ingredients').delete().eq('restaurant_id', restaurantId);

    const { data: insertedIngredients, error: ingError } = await supabase
        .from('master_ingredients')
        .insert(ingredients.map(i => ({ ...i, restaurant_id: restaurantId })))
        .select();

    if (ingError) {
        console.error('Error inserting ingredients:', ingError);
        return;
    }

    if (!insertedIngredients) return;

    const tomate = insertedIngredients.find(i => i.name === 'Tomate Pera');
    const queso = insertedIngredients.find(i => i.name === 'Queso Mozzarella');
    const harina = insertedIngredients.find(i => i.name === 'Harina Trigo');

    // 2. Recipe: Pizza Margarita (Simplified)
    console.log('Creating Recipe: Pizza Margarita...');
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
            restaurant_id: restaurantId,
            name: 'Pizza Margarita',
            selling_price: 12.00,
            target_margin_pct: 70
        })
        .select()
        .single();

    if (recipeError) {
        console.error('Error inserting recipe:', recipeError);
        return;
    }

    // 3. Recipe Ingredients
    // Dough (Harina): 0.200 kg gross
    // Sauce (Tomate): 0.100 kg gross
    // Cheese (Queso): 0.150 kg gross

    const recipeItems = [
        {
            recipe_id: recipe.id, master_ingredient_id: harina.id,
            quantity_gross: 0.200, quantity_net: 0.200, yield_factor: 1.0
        },
        {
            recipe_id: recipe.id, master_ingredient_id: tomate.id,
            quantity_gross: 0.111, quantity_net: 0.100, yield_factor: 0.90
        },
        {
            recipe_id: recipe.id, master_ingredient_id: queso.id,
            quantity_gross: 0.150, quantity_net: 0.150, yield_factor: 1.0
        }
    ];

    const { error: itemsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeItems);

    if (itemsError) {
        console.error('Error inserting recipe ingredients:', itemsError);
    } else {
        console.log('✅ Seed complete!');
        console.log('Recipe ID:', recipe.id);
    }
}

seed().catch(console.error);
