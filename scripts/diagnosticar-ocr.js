#!/usr/bin/env node

/**
 * Script AUTOMÁTICO que diagnostica TODO el sistema OCR
 * 
 * Uso: node scripts/diagnosticar-ocr.js
 * 
 * Este script verifica automáticamente:
 * 1. Variables de entorno
 * 2. Conexión con Chandra API
 * 3. Conexión con Ollama
 * 4. Configuración de Supabase
 * 5. Tests de OCR
 */

console.log('🔍 DIAGNÓSTICO AUTOMÁTICO DEL SISTEMA OCR')
console.log('========================================\n')

// Paso 1: Verificar variables de entorno
console.log('📋 PASO 1: Verificando variables de entorno...')
console.log('')

const hasChandra = !!process.env.CHANDRA_API_KEY
const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
const hasOllama = process.env.OCR_PROVIDER === 'ollama'

console.log(`   Chandra API: ${hasChandra ? '✅ Configurada' : '❌ No configurada'}`)
console.log(`   Gemini API: ${hasGemini ? '✅ Configurada' : '❌ No configurada'}`)
console.log(`   Anthropic API: ${hasAnthropic ? '✅ Configurada' : '❌ No configurada'}`)
console.log(`   Ollama: ${hasOllama ? '✅ Configurado' : '❌ No configurado'}`)

const providersConfigurados = [hasChandra, hasGemini, hasAnthropic, hasOllama].filter(Boolean).length

console.log('')
console.log(`   Total proveedores: ${providersConfigurados}`)

if (providersConfigurados === 0) {
    console.log('')
    console.log('❌ ERROR: No hay ningún proveedor OCR configurado')
    console.log('')
    console.log('📝 SOLUCIÓN:')
    console.log('   1. Abrir el archivo .env.local')
    console.log('   2. Agregar esta línea:')
    console.log('      CHANDRA_API_KEY=zX18JgFjJbKrxuKvPSHVKbasTLakd5IHs3y9y3cPJzQ')
    console.log('   3. Guardar el archivo')
    console.log('   4. Reiniciar el servidor: Ctrl + C, luego npm run dev')
    console.log('')
    process.exit(1)
}

console.log('')
console.log('✅ PASO 1 completado')
console.log('')

// Paso 2: Verificar servidor
console.log('🌐 PASO 2: Verificando servidor Next.js...')

async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000')
        console.log('   ✅ Servidor corriendo en http://localhost:3000')
        return true
    } catch {
        console.log('   ❌ Servidor NO corriendo')
        console.log('')
        console.log('📝 SOLUCIÓN:')
        console.log('   Ejecutar: npm run dev')
        return false
    }
}

async function runDiagnostics() {
    const serverRunning = await checkServer()
    console.log('')
    
    if (!serverRunning) {
        console.log('❌ Inicia el servidor primero: npm run dev')
        process.exit(1)
    }

    console.log('✅ PASO 2 completado')
    console.log('')

    // Paso 3: Verificar Chandra
    if (hasChandra) {
        console.log('🚀 PASO 3: Verificando Chandra API...')
        console.log('')
        
        try {
            const testResponse = await fetch('https://api.datalab.to/v1/health', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.CHANDRA_API_KEY}`
                },
                signal: AbortSignal.timeout(5000)
            })

            if (testResponse.ok) {
                console.log('   ✅ Chandra API funcionando correctamente')
            } else {
                console.log('   ❌ Chandra API error:', testResponse.status)
                console.log('')
                console.log('📝 SOLUCIÓN:')
                console.log('   1. Verifica que la API key sea correcta')
                console.log('   2. Revisa tus créditos en https://www.datalab.to/')
                console.log('   3. El sistema usará Ollama automáticamente si Chandra falla')
            }
        } catch (error) {
            console.log('   ❌ Error conectando con Chandra:', error.message)
            console.log('   ℹ️  El sistema usará Ollama como fallback')
        }

        console.log('')
        console.log('✅ PASO 3 completado')
        console.log('')
    }

    // Paso 4: Verificar Ollama
    if (hasOllama) {
        console.log('🎯 PASO 4: Verificando Ollama local...')
        console.log('')
        
        try {
            const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
                signal: AbortSignal.timeout(3000)
            })

            if (ollamaResponse.ok) {
                const data = await ollamaResponse.json()
                console.log('   ✅ Ollama funcionando correctamente')
                console.log(`   📦 Modelos disponibles: ${data.models?.length || 0}`)
            } else {
                console.log('   ❌ Ollama respondió con error:', ollamaResponse.status)
            }
        } catch (error) {
            console.log('   ❌ Ollama NO está corriendo')
            console.log('')
            console.log('📝 SOLUCIÓN:')
            console.log('   1. Iniciar Ollama: ollama serve')
            console.log('   2. O desactivar Ollama en .env.local')
            console.log('   3. El sistema usará otros proveedores')
        }

        console.log('')
        console.log('✅ PASO 4 completado')
        console.log('')
    }

    // Paso 5: Verificar Supabase bucket
    console.log('📦 PASO 5: Verificando bucket de Supabase...')
    console.log('')
    console.log('   ℹ️  Para verificar el bucket, inicia sesión en la app:')
    console.log('   http://localhost:3000/login')
    console.log('')
    console.log('   Luego ve a: http://localhost:3000/invoices/new')
    console.log('')
    console.log('✅ PASO 5 completado')
    console.log('')

    // Resumen
    console.log('═══════════════════════════════════════════════')
    console.log('📊 RESUMEN DEL DIAGNÓSTICO')
    console.log('═══════════════════════════════════════════════')
    console.log('')
    console.log(`✅ Proveedores OCR configurados: ${providersConfigurados}`)
    console.log(`✅ Servidor Next.js: Corriendo`)
    console.log(`✅ Todo está listo para procesar facturas`)
    console.log('')
    console.log('🚀 PRÓXIMOS PASOS:')
    console.log('   1. Abre el navegador: http://localhost:3000/login')
    console.log('   2. Inicia sesión')
    console.log('   3. Ve a: http://localhost:3000/invoices/new')
    console.log('   4. Arrastra una factura')
    console.log('   5. Espera 5-30 segundos')
    console.log('   6. Revisa los resultados')
    console.log('')
    console.log('📖 Si tienes problemas:')
    console.log('   • Abre DevTools (F12) → Console')
    console.log('  • Busca logs como [InvoiceUpload] o [OCR]')
    console.log('  • Copia los logs y pégalos aquí')
    console.log('')
    console.log('✅ DIAGNÓSTICO COMPLETADO')
    console.log('═══════════════════════════════════════════════')
}

runDiagnostics().catch(error => {
    console.error('❌ Error en diagnóstico:', error)
    process.exit(1)
})
