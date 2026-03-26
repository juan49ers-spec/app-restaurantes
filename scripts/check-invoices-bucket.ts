import { createClient } from '../src/lib/supabaseServer'

async function checkInvoicesBucket() {
    console.log('🔍 Checking Supabase Invoices Bucket')
    console.log('===================================\n')

    try {
        const supabase = await createClient()
        
        // 1. Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            console.log('❌ Not authenticated')
            console.log('   Please log in first: http://localhost:3000/login')
            return
        }

        console.log('✅ Authenticated as:', user.email)
        console.log('   User ID:', user.id)
        console.log('')

        // 2. List buckets
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

        if (bucketsError) {
            console.log('❌ Error listing buckets:', bucketsError.message)
            return
        }

        console.log('📦 Available buckets:')
        buckets?.forEach(bucket => {
            console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
        })
        console.log('')

        // 3. Check if invoices bucket exists
        const invoicesBucket = buckets?.find(b => b.name === 'invoices')

        if (!invoicesBucket) {
            console.log('⚠️  "invoices" bucket not found!')
            console.log('   Creating bucket...')
            
            const { error: createError } = await supabase.storage.createBucket('invoices', {
                public: false,
                fileSizeLimit: 10485760 // 10MB
            })

            if (createError) {
                console.log('❌ Error creating bucket:', createError.message)
                console.log('')
                console.log('📝 To create manually, run in Supabase SQL Editor:')
                console.log(`INSERT INTO storage.buckets (id, name, public, file_size_limit)`)
                console.log(`VALUES ('invoices', 'invoices', false, 10485760);`)
            } else {
                console.log('✅ Bucket created successfully!')
            }
        } else {
            console.log('✅ "invoices" bucket exists')
        }

        console.log('')

        // 4. Check RLS policies
        console.log('🔒 Checking RLS policies...')
        
        // Try to upload a test file
        const testFileName = `test-${Date.now()}.txt`
        const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(testFileName, new Blob(['test']), {
                contentType: 'text/plain',
                upsert: true
            })

        if (uploadError) {
            console.log('❌ Cannot upload to bucket:', uploadError.message)
            console.log('')
            console.log('📝 You may need to add RLS policies. Run in Supabase SQL Editor:')
            console.log(`-- Allow authenticated users to upload`)
            console.log(`CREATE POLICY "Allow upload" ON storage.objects`)
            console.log(`FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');`)
            console.log(``)
            console.log(`-- Allow users to see their own files`)
            console.log(`CREATE POLICY "Allow select own" ON storage.objects`)
            console.log(`FOR SELECT USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);`)
        } else {
            console.log('✅ Can upload to bucket')
            
            // Clean up test file
            await supabase.storage.from('invoices').remove([testFileName])
        }

        console.log('')
        console.log('✅ Check completed!')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

checkInvoicesBucket()
