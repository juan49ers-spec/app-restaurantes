import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: inv } = await supabase.from('invoices').select('id, scanned_data').eq('id', '871b08bc-7051-4206-80cb-f978756113be').single();
    console.log("OLD scanned_data:", inv?.scanned_data);

    const { data, error } = await supabase
        .from('invoices')
        .update({
            scanned_data: { test: true },
            extracted_data: { test: true },
            status: 'review_required'
        })
        .eq('id', '871b08bc-7051-4206-80cb-f978756113be')
        .select();

    console.log("ERROR:", error);
    console.log("DATA updated:", !!data);
}
main();
