import { createClient } from "@/lib/supabaseServer"
import { NextResponse } from "next/server"
import { processInvoicePayload } from "@/lib/services/InvoiceIngestionService"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        // 1. Get a test restaurant (first one found)
        const { data: restaurant } = await supabase.from('restaurants').select('id, owner_id').limit(1).maybeSingle()
        if (!restaurant) return NextResponse.json({ error: "No restaurant found" }, { status: 404 })

        const ownerId = restaurant.owner_id

        // 2. Get/Create a test supplier
        let { data: supplier } = await supabase.from('suppliers').select('id').eq('restaurant_id', restaurant.id).limit(1).maybeSingle()
        if (!supplier) {
            const { data: newSupplier } = await supabase.from('suppliers').insert({
                restaurant_id: restaurant.id,
                name: "Test Supplier Inc.",
                category: "General"
            }).select().single()
            supplier = newSupplier
        }

        // 3. Create a Dummy Invoice
        const { data: invoice } = await supabase.from('invoices').insert({
            restaurant_id: restaurant.id,
            supplier_id: supplier!.id,
            invoice_number: `TEST-${Date.now()}`,
            date: new Date().toISOString(),
            total_amount: 150.00,
            status: 'processed',
            created_by: ownerId // Important for RLS
        }).select().single()

        // 4. Define Test Items
        // - "Tomate Pera": Should match fuzzy if exists, or go to pending
        // - "Aceite Oliva": Known item check (if you seeded data)
        // - "Random New Item 9000": Should definitely go to pending
        const testItems = [
            { description: "Tomate Pera Malla 5kg", price: 10.50, quantity: 2, unit: "malla" },
            { description: "Leche Entera 1L", price: 1.20, quantity: 12, unit: "brick" },
            { description: "Mystery Ingredient X", price: 50.00, quantity: 1, unit: "box" }
        ]

        // 5. Run Ingestion
        const results = await processInvoicePayload(invoice.id, supplier!.id, testItems)

        return NextResponse.json({
            success: true,
            restaurantId: restaurant.id,
            invoiceId: invoice.id,
            results
        })

    } catch (e: unknown) {
        const error = e as Error
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
