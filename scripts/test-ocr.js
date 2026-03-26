#!/usr/bin/env node

/**
 * Script para testear el sistema OCR
 * 
 * Uso:
 * node scripts/test-ocr.js <ruta-archivo>
 * 
 * Ejemplo:
 * node scripts/test-ocr.js ./test-invoice.pdf
 */

const fs = require('fs')
const path = require('path')

async function testOCR(filePath) {
    console.log('🧪 Testing OCR System')
    console.log('====================')
    console.log(`📄 File: ${filePath}`)
    console.log('')

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: File not found: ${filePath}`)
        process.exit(1)
    }

    // Leer archivo
    const fileBuffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)
    const fileExt = path.extname(fileName).toLowerCase()
    
    // Determinar MIME type
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    }
    
    const mimeType = mimeTypes[fileExt] || 'application/octet-stream'
    
    console.log(`📋 File info:`)
    console.log(`   Name: ${fileName}`)
    console.log(`   Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`)
    console.log(`   Type: ${mimeType}`)
    console.log('')

    // Verificar variables de entorno
    console.log(`🔑 Environment check:`)
    const hasChandra = !!process.env.CHANDRA_API_KEY
    const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasOllama = process.env.OCR_PROVIDER === 'ollama'
    
    console.log(`   Chandra: ${hasChandra ? '✅' : '❌'}`)
    console.log(`   Gemini: ${hasGemini ? '✅' : '❌'}`)
    console.log(`   Anthropic: ${hasAnthropic ? '✅' : '❌'}`)
    console.log(`   Ollama: ${hasOllama ? '✅' : '❌'}`)
    console.log('')

    if (!hasChandra && !hasGemini && !hasAnthropic && !hasOllama) {
        console.log('⚠️  Warning: No OCR providers configured')
        console.log('   System will use MOCK mode (returns sample data)')
        console.log('')
        console.log('   To configure OCR providers, see: OCR_SETUP.md')
        console.log('')
    }

    // Llamar a la API de upload
    console.log(`🚀 Processing...`)
    console.log('')

    try {
        const FormData = require('form-data')
        const form = new FormData()
        form.append('file', fileBuffer, {
            filename: fileName,
            contentType: mimeType
        })

        const response = await fetch('http://localhost:3000/api/invoices/upload', {
            method: 'POST',
            body: form,
            headers: {
                ...form.getHeaders()
            }
        })

        const result = await response.json()

        if (!response.ok) {
            console.error(`❌ Error (${response.status}):`)
            console.error(`   ${result.error}`)
            process.exit(1)
        }

        console.log(`✅ Success!`)
        console.log('')
        console.log(`📊 Results:`)
        console.log(`   Invoice ID: ${result.invoiceId}`)
        console.log(`   Provider: ${result.provider}`)
        console.log(`   Confidence: ${Math.round((result.confidence || 0) * 100)}%`)
        console.log(`   Processing time: ${result.processingTime}ms`)
        console.log('')

        if (result.data) {
            console.log(`💰 Extracted data:`)
            console.log(`   Type: ${result.data.type}`)
            console.log(`   Supplier: ${result.data.supplier_name || 'N/A'}`)
            console.log(`   Invoice #: ${result.data.invoice_number || 'N/A'}`)
            console.log(`   Date: ${result.data.date}`)
            console.log(`   Total: €${result.data.total}`)
            console.log(`   Items: ${result.data.items?.length || 0}`)
            console.log(`   Category: ${result.data.expense_category || 'N/A'}`)
            console.log('')

            if (result.data.items && result.data.items.length > 0) {
                console.log(`📝 Items:`)
                result.data.items.forEach((item, i) => {
                    console.log(`   ${i + 1}. ${item.description}`)
                    console.log(`      Qty: ${item.quantity} × €${item.unit_price} = €${item.total}`)
                })
            }
        }

        console.log('')
        console.log(`🔗 Review URL: http://localhost:3000/invoices/${result.invoiceId}/review`)
        console.log('')
        console.log(`✅ Test completed successfully!`)

    } catch (error) {
        console.error(`❌ Error:`, error.message)
        console.error('')
        console.error(`   Make sure the dev server is running:`)
        console.error(`   npm run dev`)
        console.error('')
        process.exit(1)
    }
}

// Obtener argumentos
const args = process.argv.slice(2)
if (args.length === 0) {
    console.log(`
Usage: node scripts/test-ocr.js <file>

Example:
  node scripts/test-ocr.js ./test-invoice.pdf
  node scripts/test-ocr.js ./factura.jpg

For more info, see: OCR_SETUP.md
`)
    process.exit(1)
}

// Ejecutar test
testOCR(args[0])
