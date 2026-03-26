import { extractInvoiceData } from '../src/lib/invoice-extractor-v2'
import { readFileSync } from 'fs'
import { join } from 'path'

async function testOCRDirectly(filePath: string) {
    console.log('🧪 Test Directo de OCR')
    console.log('====================')
    console.log(`📄 Archivo: ${filePath}`)
    console.log('')

    try {
        // Leer archivo
        const buffer = readFileSync(filePath)
        const fileName = filePath.split(/[/\\]/).pop() || 'test.pdf'
        
        // Determinar MIME type
        const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
        const mimeTypes = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
        }
        const mimeType = mimeTypes[ext] || 'application/pdf'

        console.log(`📋 Info del archivo:`)
        console.log(`   Nombre: ${fileName}`)
        console.log(`   Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`)
        console.log(`   Tipo: ${mimeType}`)
        console.log('')

        // Verificar configuración
        console.log('🔑 Configuración OCR:')
        console.log(`   Chandra: ${process.env.CHANDRA_API_KEY ? '✅' : '❌'}`)
        console.log(`   Gemini: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅' : '❌'}`)
        console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`)
        console.log(`   Ollama: ${process.env.OCR_PROVIDER === 'ollama' ? '✅' : '❌'}`)
        console.log('')

        // Extraer datos
        console.log('🚀 Procesando con OCR...')
        console.log('(Esto puede tomar 5-30 segundos)')
        console.log('')

        const startTime = Date.now()
        const result = await extractInvoiceData(buffer, mimeType, fileName)
        const duration = Date.now() - startTime

        console.log(`⏱️  Tiempo de procesamiento: ${duration}ms`)
        console.log('')

        if (!result.success) {
            console.log('❌ ERROR EN EXTRACCIÓN')
            console.log(`   Error: ${result.error}`)
            console.log(`   Provider usado: ${result.provider_used || 'Ninguno'}`)
            console.log('')
            console.log('🔍 Soluciones posibles:')
            console.log('   1. Verifica que Chandra API key es correcta')
            console.log('   2. Verifica que Ollama esté corriendo: ollama serve')
            console.log('   3. Prueba con una imagen más clara/nítida')
            console.log('   4. Verifica conexión a internet')
            return
        }

        console.log('✅ EXTRACCIÓN EXITOSA')
        console.log('')
        console.log('📊 Resultados:')
        console.log(`   Provider: ${result.provider_used}`)
        console.log(`   Confianza: ${Math.round((result.data?.confidence || 0) * 100)}%`)
        console.log(`   Tiempo: ${result.processing_time_ms}ms`)
        console.log('')

        if (result.data) {
            console.log('💰 Datos extraídos:')
            console.log(`   Tipo: ${result.data.type}`)
            console.log(`   Proveedor: ${result.data.supplier_name || 'N/A'}`)
            console.log(`   Nº Factura: ${result.data.invoice_number || 'N/A'}`)
            console.log(`   Fecha: ${result.data.date}`)
            console.log(`   Total: €${result.data.total}`)
            console.log(`   Items: ${result.data.items?.length || 0}`)
            console.log(`   Categoría: ${result.data.expense_category || 'N/A'}`)
            console.log('')

            if (result.data.items && result.data.items.length > 0) {
                console.log('📝 Items detectados:')
                result.data.items.forEach((item, i) => {
                    console.log(`   ${i + 1}. ${item.description}`)
                    console.log(`      Cantidad: ${item.quantity} × €${item.unit_price} = €${item.total}`)
                })
            } else {
                console.log('⚠️  No se detectaron items')
            }
        }

        console.log('')
        console.log('✅ Test completado!')

    } catch (error) {
        console.error('❌ Error en test:', error)
        console.error('')
        console.error('Stack trace:')
        console.error(error.stack)
    }
}

// Obtener archivo de argumentos
const args = process.argv.slice(2)
if (args.length === 0) {
    console.log(`
Uso: npx tsx scripts/test-ocr-direct.ts <archivo>

Ejemplos:
  npx tsx scripts/test-ocr-direct.ts ./factura.pdf
  npx tsx scripts/test-ocr-direct.ts ./ticket.jpg
  npx tsx scripts/test-ocr-direct.ts ./test-factura.png

Para crear una factura de prueba, puedes usar cualquier PDF o imagen
de una factura real.
`)
    process.exit(1)
}

testOCRDirectly(args[0])
