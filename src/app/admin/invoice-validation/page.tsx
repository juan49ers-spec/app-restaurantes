import { createClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"
import { ValidationInboxComponent, PendingItem } from "@/components/invoices/ValidationInbox"

export const dynamic = 'force-dynamic'

export default async function InvoiceValidationPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get restaurant
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!restaurant) redirect('/onboarding')

    // Fetch pending validations + master ingredients in parallel
    const [{ data: pendingItems }, { data: allIngredients }] = await Promise.all([
        supabase
            .from('ingestion_buffer')
            .select(`
                id,
                raw_name,
                raw_price,
                raw_quantity,
                raw_unit,
                suggested_master_id,
                confidence_score,
                created_at,
                invoice_id,
                supplier_id,
                invoices(invoice_number, date),
                suppliers(name),
                master_ingredients(id, name)
            `)
            .eq('restaurant_id', restaurant.id)
            .eq('status', 'PENDING_VALIDATION')
            .order('created_at', { ascending: false })
            .limit(50),
        supabase
            .from('master_ingredients')
            .select('id, name, base_unit, current_avg_price')
            .eq('restaurant_id', restaurant.id)
            .order('name'),
    ])

    // Define raw type from Supabase query
    interface RawPendingItem {
        id: string
        raw_name: string
        raw_price: number | null
        raw_quantity: number | null
        raw_unit: string | null
        suggested_master_id: string | null
        confidence_score: number | null
        created_at: string
        invoice_id: string | null
        supplier_id: string | null
        invoices: { invoice_number: string; date: string } | { invoice_number: string; date: string }[] | null
        suppliers: { name: string } | { name: string }[] | null
        master_ingredients: { id: string; name: string } | { id: string; name: string }[] | null
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b px-4 py-4">
                <h1 className="text-xl font-bold">Validación de Ítems</h1>
                <p className="text-sm text-muted-foreground">
                    {pendingItems?.length || 0} ítems pendientes de revisión
                </p>
            </header>

            <main className="p-4 max-w-2xl mx-auto">
                <ValidationInboxComponent
                    items={pendingItems?.map((item) => {
                        const raw = item as unknown as RawPendingItem
                        return {
                            ...raw,
                            invoices: Array.isArray(raw.invoices) ? raw.invoices[0] : raw.invoices,
                            suppliers: Array.isArray(raw.suppliers) ? raw.suppliers[0] : raw.suppliers,
                            master_ingredients: Array.isArray(raw.master_ingredients) ? raw.master_ingredients[0] : raw.master_ingredients
                        } as PendingItem
                    }) || []}
                    allIngredients={allIngredients || []}
                    restaurantId={restaurant.id}
                />
            </main>
        </div>
    )
}
