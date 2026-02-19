import { createClient } from "@/lib/supabaseServer"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        console.log("Starting Seed Process (Hybrid Auth)...")

        // 1. Try Standard Auth (Cookies)
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        console.log("Auth Result:", { userId: user?.id || null, authError: authError?.message || null })

        let db = supabase
        let restaurantId: string | undefined

        if (user) {
            console.log("User detected:", user.id)
            // Get User's restaurant
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('id')
                .eq('owner_id', user.id)
                .limit(1)
                .maybeSingle()
            restaurantId = restaurant?.id
        }
        else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log("No User. Switching to Service Role...")
            // 2. Fallback to Service Role
            const adminDb = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            // We can use SupabaseClient type but for this script using the specific client type or just createClient return type is better. 
            // Since db is initialized with createClient(), we should try to keep types compatible. 
            // However, createAdminClient returns a generic SupabaseClient.
            // Let's rely on structural compatibility or use 'unknown' if we must, but better to avoid 'any'.
            db = adminDb as unknown as typeof supabase

            // Get ANY restaurant
            const { data: firstRestaurant } = await adminDb
                .from('restaurants')
                .select('id')
                .limit(1)
                .single()
            restaurantId = firstRestaurant?.id
        }

        if (!restaurantId) {
            return NextResponse.json({
                error: "Unauthorized. Please Log In to the app first.",
                details: "No active session found and SUPABASE_SERVICE_ROLE_KEY not configured for fallback."
            }, { status: 401 })
        }

        console.log("Target Restaurant:", restaurantId)

        // --- Seeding Logic (Using 'db' client) ---

        // 2. Create Supplier "Frutas Demo"
        let { data: supplier } = await db
            .from('suppliers')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('name', 'Frutas Demo S.L.')
            .single()

        if (!supplier) {
            const { data: newSupplier, error: supError } = await db
                .from('suppliers')
                .insert({
                    restaurant_id: restaurantId,
                    name: 'Frutas Demo S.L.'
                })
                .select()
                .single()
            if (supError) throw supError
            supplier = newSupplier
        }

        // 3. Create Master Ingredient "Tomate Pera"
        let { data: ingredient } = await db
            .from('master_ingredients')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('name', 'Tomate Pera')
            .single()

        if (!ingredient) {
            const { data: newIngredient, error: ingError } = await db
                .from('master_ingredients')
                .insert({
                    restaurant_id: restaurantId,
                    name: 'Tomate Pera',
                    base_unit: 'kg',
                    current_avg_price: 1.50
                })
                .select()
                .single()
            if (ingError) throw ingError
            ingredient = newIngredient
        }

        // 4. Create Invoice
        const { data: invoice, error: invoiceError } = await db
            .from('invoices')
            .insert({
                restaurant_id: restaurantId,
                status: 'review_required',
                invoice_number: `FACT-TEST-${Date.now().toString().slice(-4)}`,
                date: new Date().toISOString().split('T')[0],
                total_amount: 55.00,
                scanned_data: {
                    supplier: { name: "Frutas Manolo" },
                    invoice_number: "FACT-TEST-001",
                    date: new Date().toISOString().split('T')[0],
                    total_amount: 55.00,
                    items: [
                        {
                            line_text: "Tomates Pera Calidad Extra - 10kg - 1.80€/kg",
                            description: "Tomates Pera Calidad Extra",
                            qty: 10,
                            unit: "kg",
                            price: 1.80, // > 1.50 -> Alert
                            total: 18.00
                        },
                        {
                            line_text: "Naranjas Zumo - 20kg - 1.00€/kg",
                            description: "Naranjas Zumo",
                            qty: 20,
                            unit: "kg",
                            price: 1.00,
                            total: 20.00
                        }
                    ]
                }
            })
            .select()
            .single()

        if (invoiceError) {
            console.error("Invoice Error:", invoiceError)
            throw invoiceError
        }

        return NextResponse.json({
            message: "Seeded Mock Invoice SUCCESS",
            invoice_id: invoice.id,
            review_url: `/invoices/${invoice.id}/review`,
            check_alert: "Checking Item 1 should show Price Alert +20%"
        })

    } catch (e: unknown) {
        console.error("Server Error:", e)
        const errorMessage = e instanceof Error ? e.message : "Server Error"
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
