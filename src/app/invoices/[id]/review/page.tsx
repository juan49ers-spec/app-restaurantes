import { createClient } from "@/lib/supabaseServer"
import { notFound, redirect } from "next/navigation"
import { InvoiceReviewForm } from "@/components/invoices/InvoiceReviewForm"
import { Invoice } from "@/types/schema"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function InvoiceReviewPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Fetch Invoice first (others depend on restaurant_id)
    const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

    if (!invoice) notFound()

    // DEBUG: inspeccionar qué datos tiene scanned_data en la DB
    console.log('[DEBUG REVIEW] Invoice ID:', invoice.id)
    console.log('[DEBUG REVIEW] scanned_data:', JSON.stringify(invoice.scanned_data, null, 2))
    console.log('[DEBUG REVIEW] extracted_data:', JSON.stringify(invoice.extracted_data, null, 2))
    console.log('[DEBUG REVIEW] scanned_data.items count:', invoice.scanned_data?.items?.length ?? 'NO ITEMS FIELD')

    // 2. Parallelize: signed URL, ingredients, and suppliers
    const [{ data: signedUrlData }, { data: ingredients }, { data: suppliers }] = await Promise.all([
        supabase.storage
            .from('invoices')
            .createSignedUrl(invoice.file_url || '', 3600),
        supabase
            .from('master_ingredients')
            .select('id, name, base_unit, current_avg_price')
            .eq('restaurant_id', invoice.restaurant_id)
            .order('name'),
        supabase
            .from('suppliers')
            .select('id, name')
            .eq('restaurant_id', invoice.restaurant_id)
            .order('name'),
    ])

    return (
        <div className="h-screen flex flex-col">
            <header className="h-14 border-b flex items-center px-4 bg-white z-10 shrink-0">
                <h1 className="font-semibold text-lg">Revisión de Factura: {invoice.invoice_number || 'Sin Número'}</h1>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        {invoice.status === 'completed' ? '✅ Procesada' : '✏️ Editando'}
                    </span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: PDF Viewer */}
                <div className="w-1/2 bg-slate-100 border-r relative hidden md:block">
                    {signedUrlData?.signedUrl ? (
                        <iframe
                            src={signedUrlData.signedUrl}
                            className="w-full h-full"
                            title="Factura PDF"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="text-sm">Sin documento adjunto</span>
                            <span className="text-xs opacity-60">Los datos se extrajeron automáticamente</span>
                        </div>
                    )}
                </div>

                {/* Right: Data Form */}
                <div className="w-full md:w-1/2 overflow-y-auto bg-white p-6">
                    <InvoiceReviewForm
                        invoice={invoice as Invoice}
                        ingredients={ingredients || []}
                        suppliers={suppliers || []}
                    />
                </div>
            </div>
        </div>
    )
}
