import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

type HealthStatus = 'healthy' | 'unhealthy'

export async function GET() {
  const startedAt = Date.now()
  const checks = {
    database: await checkDatabase(),
  }
  const status: HealthStatus = checks.database.ok ? 'healthy' : 'unhealthy'

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    },
    {
      status: status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

async function checkDatabase() {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1)

    if (error) {
      return { ok: false, message: 'Database check failed.' }
    }

    return { ok: true, message: 'Database reachable.' }
  } catch {
    return { ok: false, message: 'Database check failed.' }
  }
}
