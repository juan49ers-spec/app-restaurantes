'use server'

// TEMPORARY: Hardcoded demo data to bypass Supabase caching issues
export async function generateDemoSalesData() {
    // Hardcoded recipes since Supabase API has caching issues
    const recipes = [
        { id: '1', name: 'Paella Valenciana', current_cost: 5.50, selling_price: 18.00, restaurant_id: 'demo' },
        { id: '2', name: 'Risotto de Setas', current_cost: 4.20, selling_price: 15.00, restaurant_id: 'demo' },
        { id: '3', name: 'Filete de Ternera', current_cost: 8.00, selling_price: 24.00, restaurant_id: 'demo' },
        { id: '4', name: 'Ensalada César', current_cost: 2.50, selling_price: 12.00, restaurant_id: 'demo' },
        { id: '5', name: 'Pasta Carbonara', current_cost: 3.80, selling_price: 14.00, restaurant_id: 'demo' },
        { id: '6', name: 'Salmón a la Plancha', current_cost: 7.00, selling_price: 19.00, restaurant_id: 'demo' },
    ]

    // Generate random sales data for each recipe
    const salesData = recipes.map((recipe) => ({
        recipe_id: recipe.id,
        quantity_sold: Math.floor(Math.random() * 100) + 10,
        revenue_total: (Math.floor(Math.random() * 100) + 10) * (recipe.selling_price || 15)
    }))

    return {
        success: true,
        salesData,
        recipes,
        periodName: "Datos Demo (Hardcoded)",
        error: undefined
    }
}
