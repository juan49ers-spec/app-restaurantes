import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { extractInvoiceData } from '@/lib/invoice-extractor'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Test endpoint: sends a test image to Ollama OCR to verify the pipeline works with images.
 * GET /api/test-ocr-image
 */
export async function GET() {
    const steps: Record<string, unknown> = {}
    
    try {
        // 1. Auth
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        steps['1_auth'] = { user: user?.id }
        if (!user) return NextResponse.json({ steps, fatal: 'No user' }, { status: 401 })

        // 2. Create a simple test PNG (1x1 white pixel as minimum test)
        // Better: use a pre-existing invoice image if one exists in storage
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, file_url, status')
            .order('created_at', { ascending: false })
            .limit(5)
        
        steps['2_invoices'] = invoices?.map(i => ({ id: i.id, url: i.file_url, status: i.status }))
        
        // Find any invoice with image extension
        const imageInvoice = invoices?.find(inv => {
            if (!inv.file_url) return false
            const ext = inv.file_url.split('.').pop()?.toLowerCase()
            return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')
        })

        if (!imageInvoice) {
            // No image invoices found — test with a minimal PNG
            // Create a 100x100 white PNG manually
            steps['3_source'] = 'synthetic_test_image'
            
            // Use the test image we generated
            const testImagePath = 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\377c726a-8f00-4164-acb1-c1b6a78115b3\\test_invoice_image_1774374841297.png'
            let imageBuffer: Buffer
            try {
                imageBuffer = readFileSync(testImagePath)
                steps['3_read'] = { size: imageBuffer.length }
            } catch {
                return NextResponse.json({ steps, fatal: 'No test image found' })
            }

            console.log('[TEST-IMAGE] Starting OCR on test image...')
            const startTime = Date.now()
            const result = await extractInvoiceData(imageBuffer, 'image/png', 'test_invoice.png')
            const elapsed = Date.now() - startTime
            
            steps['4_ocr'] = {
                elapsed_ms: elapsed,
                success: result.success,
                error: result.error,
                data: result.data ? {
                    supplier: result.data.supplier_name,
                    cif: result.data.cif,
                    total: result.data.total,
                    items: result.data.items?.length,
                    date: result.data.date,
                    invoice_number: result.data.invoice_number
                } : null
            }
            
            return NextResponse.json({ steps, success: result.success })
        }

        // We have an image invoice in storage
        steps['3_source'] = 'storage_image'
        steps['3_invoice'] = { id: imageInvoice.id, url: imageInvoice.file_url }

        const { data: fileBlob, error: dlErr } = await supabase.storage
            .from('invoices')
            .download(imageInvoice.file_url)
        
        if (!fileBlob || dlErr) {
            return NextResponse.json({ steps, fatal: 'Download failed', error: dlErr?.message })
        }

        const buffer = Buffer.from(await fileBlob.arrayBuffer())
        steps['4_buffer'] = { size: buffer.length }

        const ext = imageInvoice.file_url.split('.').pop()?.toLowerCase()
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

        console.log('[TEST-IMAGE] Starting OCR on stored image...')
        const startTime = Date.now()
        const result = await extractInvoiceData(buffer, mimeType, imageInvoice.file_url)
        const elapsed = Date.now() - startTime
        
        steps['5_ocr'] = {
            elapsed_ms: elapsed,
            success: result.success,
            error: result.error,
            data: result.data ? {
                supplier: result.data.supplier_name,
                cif: result.data.cif,
                total: result.data.total,
                items: result.data.items?.length,
                date: result.data.date,
                invoice_number: result.data.invoice_number
            } : null
        }

        // If success, update the invoice
        if (result.success && result.data) {
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

            const { error: updateErr } = await supabase
                .from('invoices')
                .update({
                    status: 'review_required',
                    scanned_data: normalizedData,
                    invoice_number: result.data.invoice_number ?? 'PENDING',
                    total_amount: result.data.total,
                    date: result.data.date
                })
                .eq('id', imageInvoice.id)
            
            steps['6_update'] = { error: updateErr?.message }
        }
        
        return NextResponse.json({ steps, success: result.success })
        
    } catch (err: unknown) {
        const error = err as Error
        return NextResponse.json({ steps, fatal: error.message, stack: error.stack }, { status: 500 })
    }
}
