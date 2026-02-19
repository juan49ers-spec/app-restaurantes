import { createClient } from "@/lib/supabaseServer"
import { NextResponse } from "next/server"
import { processInvoicePayload } from "@/lib/services/InvoiceIngestionService"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { invoiceId, supplierId, lineItems } = body

        if (!invoiceId || !supplierId || !lineItems) {
            return NextResponse.json({
                error: "Missing required fields: invoiceId, supplierId, lineItems"
            }, { status: 400 })
        }

        const results = await processInvoicePayload(invoiceId, supplierId, lineItems)

        const summary = {
            total: results.length,
            matched: results.filter(r => r.status === 'matched').length,
            autoMatched: results.filter(r => r.status === 'auto_matched').length,
            pendingValidation: results.filter(r => r.status === 'pending_validation').length,
            priceAlerts: results.filter(r => r.priceAlert).length
        }

        return NextResponse.json({
            success: true,
            summary,
            results
        })
    } catch (error) {
        console.error("Process Invoice Error:", error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Internal Server Error"
        }, { status: 500 })
    }
}
