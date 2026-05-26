import { NextResponse } from "next/server"
import { seedShiftsAndEmployees } from "@/app/actions/seed-shifts-robust"
import { createClient } from "@/lib/supabaseServer"

export async function POST() {
    console.log("👉 API HIT: /api/seed-ops")
    const supabase = await createClient()

    // Auth check: Is there a logged in user with a restaurant?
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!restaurant) return NextResponse.json({ error: "No restaurant found" }, { status: 404 })

    try {
        await seedShiftsAndEmployees(restaurant.id)
        return NextResponse.json({ success: true, message: "Operations data seeded successfully" })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
    }
}
