import { createChandraClient } from '../src/lib/chandra-client'

async function testChandraConnection() {
    console.log('🧪 Test de Conexión Chandra API')
    console.log('=================================\n')

    const apiKey = process.env.CHANDRA_API_KEY

    if (!apiKey) {
        console.log('❌ CHANDRA_API_KEY no está configurada')
        console.log('')
        console.log('📝 Para configurar, editar .env.local:')
        console.log('   CHANDRA_API_KEY=tu_api_key_aqui')
        console.log('')
        console.log('📖 Obtener API key en: https://www.datalab.to/')
        return
    }

    console.log('✅ API Key detectada')
    console.log(`   Key: ${apiKey.substring(0, 10)}...`)
    console.log('')

    try {
        console.log('🔍 Creando cliente Chandra...')
        const client = createChandraClient({
            apiKey,
            timeout: 10000
        })

        console.log('✅ Cliente creado')
        console.log('')
        console.log('🚀 Verificando conexión...')
        console.log('(Health check)')

        const isHealthy = await client.healthCheck()
        console.log('')

        if (isHealthy) {
            console.log('✅ CONEXIÓN EXITOSA')
            console.log('')
            console.log('🎉 Chandra API está funcionando correctamente!')
            console.log('   Puedes procesar facturas con Chandra.')
        } else {
            console.log('❌ ERROR DE CONEXIÓN')
            console.log('')
            console.log('🔍 Soluciones posibles:')
            console.log('   1. Verifica que la API key sea correcta')
            console.log('   2. Verifica que tengas créditos disponibles')
            console.log('   3. Revisa https://www.datalab.to/dashboard')
            console.log('   4. Verifica tu conexión a internet')
        }

    } catch (error) {
        console.log('❌ ERROR AL CONECTAR')
        console.log('')
        console.log(`Error: ${error.message}`)
        console.log('')
        console.log('🔍 Soluciones posibles:')
        console.log('   1. Verifica que la API key sea válida')
        console.log('   2. Verifica tu conexión a internet')
        console.log('   3. Intenta con otro proveedor (Gemini, Claude, Ollama)')
        console.log('   4. Revisa la documentación: https://github.com/datalab-to/chandra')
    }

    console.log('')
    console.log('✅ Test completado!')
}

testChandraConnection()
