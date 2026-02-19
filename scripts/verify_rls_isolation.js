
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

// Admin client for setup/cleanup
const adminClient = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY);

const USER_A = {
    email: 'rls_test_a_' + Date.now() + '@example.com',
    password: 'password123',
    name: 'Restaurante A'
};

const USER_B = {
    email: 'rls_test_b_' + Date.now() + '@example.com',
    password: 'password123',
    name: 'Restaurante B'
};


async function createTestUserAndRestaurant(email, password, restName) {
    // 1. SignUp
    const { data: authData, error: authError } = await adminClient.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error(`❌ Error creating user ${email}:`, authError.message);
        return null;
    }

    const session = authData.session;
    const user = authData.user;

    if (!session) {
        // Should not happen if auto-confirm is on, but strictly speaking signUp might not return session if confirmation needed.
        // For test env with disabling email confirmation, it works. 
        // If it fails, we might need to signIn.
        console.warn(`⚠️ No session returned for ${email}. Trying sign in...`);
        const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({ email, password });
        if (signInError || !signInData.session) {
            console.error(`❌ Could not get session for ${email}`);
            return null;
        }
        // Use the new session
        return createRestaurantWithSession(signInData.user, signInData.session, restName);
    }

    return createRestaurantWithSession(user, session, restName);
}

async function createRestaurantWithSession(user, session, restName) {
    // Create a client acting as the new user
    const userClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    });

    // 2. Create Restaurant Row (As the User)
    const { data: restData, error: restError } = await userClient
        .from('restaurants')
        .insert([{
            owner_id: user.id,
            name: restName
        }])
        .select()
        .single();

    if (restError) {
        console.error(`❌ Error creating restaurant for ${user.email}:`, restError.message);
        return null;
    }

    return { user: user, restaurant: restData };
}

async function loginAndGetClient(email, password) {
    const { data, error } = await adminClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(`❌ Error logging in ${email}:`, error.message);
        return null;
    }

    // Return a new client with the user's session
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${data.session.access_token}`
            }
        }
    });
}

async function runTest() {
    console.log('🚀 Starting RLS Isolation Test (Table-Based Strategy)...');

    // 1. Create Users & Restaurants
    console.log('\n👤 Creating Test Users & Restaurants...');
    const contextA = await createTestUserAndRestaurant(USER_A.email, USER_A.password, USER_A.name);
    const contextB = await createTestUserAndRestaurant(USER_B.email, USER_B.password, USER_B.name);

    if (!contextA || !contextB) {
        console.error('Stopping test due to setup failure.');
        return;
    }

    const restIdA = contextA.restaurant.id;
    const restIdB = contextB.restaurant.id;

    console.log(`✅ Setup Complete: \n  A: ${USER_A.email} (RestID: ${restIdA})\n  B: ${USER_B.email} (RestID: ${restIdB})`);

    // 2. Login as User A
    console.log('\n🔑 Logging in as User A...');
    const clientA = await loginAndGetClient(USER_A.email, USER_A.password);
    if (!clientA) return;

    // 3. User A inserts data
    console.log('📝 User A inserting ingredients...');
    const { data: insertDataA, error: insertErrorA } = await clientA
        .from('master_ingredients')
        .insert([
            {
                name: 'Tomate Test A',
                category: 'vegetables',
                price: 1.5,
                unit: 'kg',
                standard_waste_pct: 0,
                // Valid RLS requires restaurant_id to match one owned by the user
                restaurant_id: restIdA
            }
        ])
        .select();

    if (insertErrorA) {
        console.error('❌ User A Insert Failed:', insertErrorA.message);
    } else {
        console.log('✅ User A Inserted:', insertDataA[0].name);
    }

    // 4. Login as User B
    console.log('\n🔑 Logging in as User B...');
    const clientB = await loginAndGetClient(USER_B.email, USER_B.password);
    if (!clientB) return;

    // 5. User B tries to read User A's data
    console.log('🕵️ User B reading ingredients...');
    const { data: readDataB, error: readErrorB } = await clientB
        .from('master_ingredients')
        .select('*');

    if (readErrorB) {
        console.error('❌ User B Read Failed:', readErrorB.message);
    } else {
        console.log(`📊 User B sees ${readDataB.length} ingredients.`);
        const seesUserAData = readDataB.some(item => item.name === 'Tomate Test A');
        if (seesUserAData) {
            console.error('❌ SECURITY FAILURE: User B can see User A\'s data!');
        } else {
            console.log('✅ PASS: User B cannot see User A\'s data.');
        }
    }

    // 6. User B inserts their own data
    console.log('\n📝 User B inserting ingredients...');
    const { data: insertDataB, error: insertErrorB } = await clientB
        .from('master_ingredients')
        .insert([
            {
                name: 'Lechuga Test B',
                category: 'vegetables',
                price: 0.8,
                unit: 'kg',
                standard_waste_pct: 0,
                restaurant_id: restIdB
            }
        ])
        .select();

    if (insertErrorB) {
        console.error('❌ User B Insert Failed:', insertErrorB.message);
    } else {
        console.log('✅ User B Inserted:', insertDataB[0].name);
    }

    // 7. Verify User A cannot see User B's data
    console.log('\n🕵️ User A reading ingredients...');
    const { data: readDataA_Final } = await clientA.from('master_ingredients').select('*');
    console.log(`📊 User A sees ${readDataA_Final.length} ingredients.`);
    const seesUserBData = readDataA_Final.some(item => item.name === 'Lechuga Test B');
    if (seesUserBData) {
        console.error('❌ SECURITY FAILURE: User A can see User B\'s data!');
    } else {
        console.log('✅ PASS: User A cannot see User B\'s data.');
    }

    console.log('\n🎉 RLS Verification Complete.');
}

runTest();
