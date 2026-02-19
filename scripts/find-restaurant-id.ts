/**
 * Script para encontrar tu restaurant_id
 */

import { createClient } from '@supabase/supabase-js'

async function findRestaurantId() {
    // Necesitas tus credenciales de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Credenciales de Supabase no encontradas')
        console.log('\n💡 Pasos:')
        console.log('   1. Ve a .env.local')
        console.log('   2. Copia NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
        console.log('   3. Ejecuta: node scripts/find-restaurant-id.ts')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔍 Buscando tus restaurantes...\n')

    const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, owner_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('❌ Error:', error)
        return
    }

    if (!data || data.length === 0) {
        console.log('❌ No se encontraron restaurantes')
        return
    }

    console.log('✅ Tus restaurantes:\n')
    data.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}`)
        console.log(`   ID: ${r.id}`)
        console.log(`   Owner ID: ${r.owner_id}`)
        console.log(`   Creado: ${new Date(r.created_at).toLocaleDateString()}`)
        console.log('')
    })

    console.log('📋 Copia el ID del restaurante que quieres usar y péalo en el SQL:')
    console.log(`   ${data[0].id}`)
}

findRestaurantId()
