import { createChandraClient } from '../src/lib/chandra-client'
import { checkOCRProvidersHealth } from '../src/lib/invoice-extractor-v2'
import fs from 'fs'

async function quickTest() {
    console.log('🧪 Quick OCR System Test')
    console.log('========================\n')

    // 1. Check environment variables
    console.log('📋 Environment Variables:')
    console.log(`   CHANDRA_API_KEY: ${process.env.CHANDRA_API_KEY ? '✅ Configured' : '❌ Missing'}`)
    console.log(`   GEMINI_API_KEY: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Configured' : '❌ Missing'}`)
    console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`)
    console.log(`   OCR_PROVIDER: ${process.env.OCR_PROVIDER || 'Not set'}\n`)

    // 2. Check providers health
    console.log('🔍 Providers Health Check:')
    try {
        const health = await checkOCRProvidersHealth()
        console.log(`   Chandra: ${health.chandra ? '✅' : '❌'}`)
        console.log(`   Gemini: ${health.gemini ? '✅' : '❌'}`)
        console.log(`   Anthropic: ${health.anthropic ? '✅' : '❌'}`)
        console.log(`   Ollama: ${health.ollama ? '✅' : '❌'}\n`)
    } catch (error) {
        console.log(`   ⚠️  Health check failed: ${error.message}\n`)
    }

    // 3. Test Chandra client
    if (process.env.CHANDRA_API_KEY) {
        console.log('🚀 Testing Chandra API Connection:')
        try {
            const client = createChandraClient({
                apiKey: process.env.CHANDRA_API_KEY,
                timeout: 10000
            })

            const isHealthy = await client.healthCheck()
            console.log(`   Health Check: ${isHealthy ? '✅ PASS' : '❌ FAIL'}\n`)
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`)
        }
    }

    // 4. Summary
    console.log('📊 Summary:')
    const hasAnyProvider = !!(
        process.env.CHANDRA_API_KEY || 
        process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
        process.env.ANTHROPIC_API_KEY || 
        process.env.OCR_PROVIDER === 'ollama'
    )
    
    if (hasAnyProvider) {
        console.log('   ✅ System ready to process invoices')
        console.log('   📝 Go to: http://localhost:3000/invoices/new')
        console.log('   📖 Read: README_OCR.md for usage guide\n')
    } else {
        console.log('   ⚠️  No OCR providers configured')
        console.log('   📖 Configure at least one provider in .env.local')
        console.log('   📖 See: OCR_SETUP.md for instructions\n')
    }

    console.log('✅ Test completed!')
}

quickTest().catch(console.error)
