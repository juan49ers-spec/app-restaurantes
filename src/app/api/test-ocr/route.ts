import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { extractInvoiceData } from '@/lib/invoice-extractor'

/**
 * Diagnostic endpoint: reprocesses the first stuck invoice in 'processing' status.
 * This runs as an API route (not server action) so all console.log goes to terminal stdout.
 */
export async function GET() {
    const steps: Record<string, unknown> = {}
    
    try {
        // 1. Auth
        const supabase = await createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        steps['1_auth'] = { user: user?.id, error: authErr?.message }
        console.log('[REPROCESS] Step 1 Auth:', user?.id || 'NO USER')
        if (!user) return NextResponse.json({ steps, fatal: 'No user' }, { status: 401 })

        // 2. Find stuck invoice
        const { data: invoice, error: findErr } = await supabase
            .from('invoices')
            .select('*')
            .in('status', ['processing', 'error'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        
        steps['2_find_invoice'] = { 
            id: invoice?.id, 
            file_url: invoice?.file_url, 
            error: findErr?.message 
        }
        console.log('[REPROCESS] Step 2 Invoice:', invoice?.id, 'file:', invoice?.file_url)
        if (!invoice) return NextResponse.json({ steps, fatal: 'No processing invoice found' })

        // 3. Download from storage
        const { data: fileBlob, error: dlErr } = await supabase.storage
            .from('invoices')
            .download(invoice.file_url)
        
        steps['3_download'] = { 
            size: fileBlob?.size, 
            type: fileBlob?.type,
            error: dlErr?.message 
        }
        console.log('[REPROCESS] Step 3 Download:', fileBlob?.size, 'bytes, type:', fileBlob?.type)
        if (!fileBlob) return NextResponse.json({ steps, fatal: 'Download failed' })

        // 4. Convert to Buffer
        const arrayBuffer = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        steps['4_buffer'] = { size: buffer.length }
        console.log('[REPROCESS] Step 4 Buffer:', buffer.length, 'bytes')

        // 5. Determine MIME type
        const ext = invoice.file_url.split('.').pop()?.toLowerCase()
        let mimeType = 'image/png'
        if (ext === 'pdf') mimeType = 'application/pdf'
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
        else if (ext === 'webp') mimeType = 'image/webp'
        steps['5_mime'] = { extension: ext, mimeType }
        console.log('[REPROCESS] Step 5 MIME:', ext, '->', mimeType)

        // 6. OCR Extraction
        console.log('[REPROCESS] Step 6 Starting OCR...')
        const startTime = Date.now()
        const result = await extractInvoiceData(buffer, mimeType, invoice.file_url)
        const elapsed = Date.now() - startTime
        
        steps['6_ocr'] = { 
            elapsed_ms: elapsed,
            success: result.success, 
            error: result.error,
            items: result.data?.items?.length,
            total: result.data?.total,
            confidence: result.data?.confidence
        }
        console.log('[REPROCESS] Step 6 OCR:', elapsed, 'ms, success:', result.success)
        
        if (!result.success || !result.data) {
            // Mark as error in DB
            await supabase.from('invoices').update({ status: 'error' }).eq('id', invoice.id)
            steps['7_status_update'] = 'marked as error'
            return NextResponse.json({ steps, fatal: 'OCR failed', ocr_error: result.error })
        }

        // 7. Normalize
        const normalizedData = {
            supplier: result.data.supplier_name || 'Sin proveedor',
            cif: result.data.cif || '',
            date: result.data.date,
            invoice_number: result.data.invoice_number || 'PENDING',
            currency: result.data.currency || 'EUR',
            subtotal: result.data.subtotal,
            tax_rate: result.data.tax_rate,
            tax_amount: result.data.tax_amount,
            total: result.data.total,
            items: (result.data.items || []).map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
            }))
        }
        steps['7_normalize'] = { items: normalizedData.items.length }

        // 8. Update DB
        const { data: updated, error: updateErr } = await supabase
            .from('invoices')
            .update({
                status: 'review_required',
                scanned_data: normalizedData,
                invoice_number: result.data.invoice_number ?? 'PENDING',
                total_amount: result.data.total,
                date: result.data.date
            })
            .eq('id', invoice.id)
            .select()
            .single()
        
        steps['8_update'] = { 
            success: !!updated, 
            error: updateErr?.message,
            new_status: updated?.status 
        }
        console.log('[REPROCESS] Step 8 Update:', updated?.status, updateErr?.message)

        return NextResponse.json({ steps, success: true })
        
    } catch (err: unknown) {
        const error = err as Error
        console.error('[REPROCESS] FATAL:', error.message, error.stack)
        return NextResponse.json({ steps, fatal: error.message, stack: error.stack }, { status: 500 })
    }
}
