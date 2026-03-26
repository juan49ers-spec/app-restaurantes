import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, scanned_data, extracted_data')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    for (const inv of (data || [])) {
        console.log('=' . repeat(60));
        console.log(`Invoice: ${inv.id} | Num: ${inv.invoice_number} | Total: ${inv.total_amount}`);
        console.log('Extracted Data Keys:', Object.keys(inv.extracted_data || {}));
        console.log('Extracted Items:', JSON.stringify(inv.extracted_data?.items, null, 2));
    }
}
main();
