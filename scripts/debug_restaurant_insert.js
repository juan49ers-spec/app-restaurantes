
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("DEBUG: Starting...");
    const email = `debug_${Date.now()}@example.com`;
    const password = 'password123';

    // 1. SignUp
    const { data: authData, error: authError } = await adminClient.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error("DEBUG: SignUp Error:", authError);
        return;
    }

    console.log("DEBUG: User created:", authData.user.id);

    // 2. Create Restaurant
    const userClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${authData.session.access_token}`
            }
        }
    });

    const { data, error } = await userClient
        .from('restaurants')
        .insert([{
            owner_id: authData.user.id,
            name: "Debug Restaurant"
        }])
        .select();

    if (error) {
        console.error("DEBUG: Restaurant Insert Error:", error);
    } else {
        console.log("DEBUG: Restaurant Insert Success:", data);
    }
}

run();
