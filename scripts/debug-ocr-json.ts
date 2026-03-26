import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', '871b08bc-7051-4206-80cb-f978756113be');

    fs.writeFileSync('C:/Users/Usuario/.gemini/antigravity/playground/app finanzas restaurante/invoice-debug.json', JSON.stringify(data, null, 2));
    if (error) console.log("ERROR:", error);
}
main();
