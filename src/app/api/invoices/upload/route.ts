import { NextRequest, NextResponse } from 'next/server'
import { extractInvoiceData } from '@/lib/invoice-extractor-v2'
import { createClient } from '@/lib/supabaseServer'

/**
 * API Endpoint para subir y procesar facturas
 * 
 * POST /api/invoices/upload
 * Content-Type: multipart/form-data
 * Body: file (File)
 * 
 * Respuesta:
 * {
 *   success: true,
 *   invoiceId: string,
 *   data: ExtractedInvoiceData,
 *   provider: string,
 *   confidence: number
 * }
 */
export async function POST(req: NextRequest) {
    console.log('========= [Invoice Upload API] Called =========')
    
    try {
        // 1. Authentication
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'No autenticado' },
                { status: 401 }
            )
        }

        // 2. Parse form data
        const formData = await req.formData()
        const file = formData.get('file') as File
        
        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No se proporcionó archivo' },
                { status: 400 }
            )
        }

        console.log(`[Upload] User: ${user.id}, File: ${file.name}, Size: ${file.size}, Type: ${file.type}`)

        // 3. Validar tamaño (máx 10MB)
        const MAX_SIZE = 10 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Archivo demasiado grande (máx 10MB)' },
                { status: 400 }
            )
        }

        // 4. Validar tipo MIME
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: `Tipo no soportado: ${file.type}. Usa JPG, PNG, WEBP o PDF` },
                { status: 400 }
            )
        }

        // 5. Obtener restaurante del usuario
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('owner_id', user.id)
            .single()

        if (!restaurant) {
            return NextResponse.json(
                { success: false, error: 'No se encontró restaurante para este usuario' },
                { status: 404 }
            )
        }

        // 6. Upload a Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        console.log(`[Upload] Subiendo a Storage: ${filePath}`)
        
        const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('[Upload] Error storage upload:', uploadError)
            return NextResponse.json(
                { success: false, error: `Error subiendo archivo: ${uploadError.message}` },
                { status: 500 }
            )
        }

        // 7. Crear registro en DB (status: processing)
        const invoiceId = crypto.randomUUID()
        
        const { error: dbError } = await supabase
            .from('invoices')
            .insert({
                id: invoiceId,
                restaurant_id: restaurant.id,
                invoice_number: 'PENDING',
                date: new Date().toISOString().split('T')[0],
                total_amount: 0,
                status: 'processing',
                file_url: filePath,
                created_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('[Upload] Error DB insert:', dbError)
            // Limpiar archivo subido
            await supabase.storage.from('invoices').remove([filePath])
            
            return NextResponse.json(
                { success: false, error: `Error creando registro: ${dbError.message}` },
                { status: 500 }
            )
        }

        console.log(`[Upload] Registro creado: ${invoiceId}`)

        // 8. Procesar con OCR (async, no bloquear respuesta)
        // En producción, esto debería ir a una cola de background (Bull, Queue, etc.)
        // Por ahora, procesamos sincrónicamente pero con timeout generoso
        
        try {
            console.log(`[OCR] Iniciando extracción: ${file.name}`)
            
            const extractionResult = await extractInvoiceData(
                buffer,
                file.type,
                file.name
            )

            if (!extractionResult.success || !extractionResult.data) {
                throw new Error(extractionResult.error || 'OCR extraction failed')
            }

            console.log(`[OCR] ✅ Éxito con ${extractionResult.provider_used} (${extractionResult.processing_time_ms}ms)`)
            console.log(`[OCR] Confidence: ${extractionResult.data.confidence}, Items: ${extractionResult.data.items?.length}`)

            // 9. Normalizar datos para compatibilidad con UI existente
            const normalizedData = {
                supplier: {
                    name: extractionResult.data.supplier_name || '',
                    tax_id: null,
                    address: null
                },
                date: extractionResult.data.date,
                invoice_number: extractionResult.data.invoice_number || null,
                total_amount: extractionResult.data.total,
                currency: 'EUR',
                items: extractionResult.data.items.map(item => ({
                    line_text: item.description,
                    description: item.description,
                    qty: item.quantity,
                    unit: 'unit',
                    unit_price: item.unit_price,
                    price: item.unit_price,
                    total_price: item.total,
                    total: item.total,
                    category: item.category || null
                }))
            }

            // 10. Actualizar registro con resultados
            const { error: updateError } = await supabase
                .from('invoices')
                .update({
                    status: 'review_required',
                    scanned_data: normalizedData,
                    invoice_number: extractionResult.data.invoice_number || 'PENDING',
                    total_amount: extractionResult.data.total,
                    date: extractionResult.data.date,
                    ocr_provider: extractionResult.provider_used,
                    ocr_confidence: extractionResult.data.confidence
                })
                .eq('id', invoiceId)

            if (updateError) {
                console.error('[Upload] Error DB update:', updateError)
                throw new Error(`Error actualizando registro: ${updateError.message}`)
            }

            console.log(`[Upload] ✅ Proceso completo: ${invoiceId}`)

            // 11. Retornar éxito
            return NextResponse.json({
                success: true,
                invoiceId,
                data: extractionResult.data,
                provider: extractionResult.provider_used,
                confidence: extractionResult.data.confidence,
                processingTime: extractionResult.processing_time_ms
            })

        } catch (ocrError) {
            console.error('[OCR] Error en procesamiento:', ocrError)
            
            // Marcar factura como error pero no borrar el archivo
            await supabase
                .from('invoices')
                .update({ status: 'error' })
                .eq('id', invoiceId)

            return NextResponse.json(
                { 
                    success: false, 
                    error: ocrError instanceof Error ? ocrError.message : 'Error en OCR',
                    invoiceId // El cliente puede reintentar
                },
                { status: 202 } // Accepted because we saved the file
            )
        }

    } catch (error) {
        console.error('[Upload] Error general:', error)
        
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Error desconocido' 
            },
            { status: 500 }
        )
    }
}

/**
 * Health check del sistema OCR
 */
export async function GET() {
    try {
        const { checkOCRProvidersHealth } = await import('@/lib/invoice-extractor-v2')
        const health = await checkOCRProvidersHealth()
        
        return NextResponse.json({
            status: 'ok',
            providers: health,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return NextResponse.json(
            { 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        )
    }
}
