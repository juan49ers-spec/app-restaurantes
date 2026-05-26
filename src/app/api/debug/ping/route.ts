import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({
        message: "pong",
        timestamp: new Date().toISOString(),
        env_check: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase URL Present" : "Supabase URL Missing"
    })
}
