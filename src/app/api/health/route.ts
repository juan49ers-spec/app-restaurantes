import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

type HealthStatus = 'healthy' | 'unhealthy'
const DATABASE_CHECK_TIMEOUT_MS = 2500

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
    const { error } = await withTimeout(async () => {
      const supabase = await createClient()
      return supabase
        .from('restaurants')
        .select('id')
        .limit(1)
    }, DATABASE_CHECK_TIMEOUT_MS)

    if (error) {
      return { ok: false, message: 'Database check failed.' }
    }

    return { ok: true, message: 'Database reachable.' }
  } catch {
    return { ok: false, message: 'Database check failed.' }
  }
}

function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Health check timed out.'))
    }, timeoutMs)

    operation()
      .then(resolve, reject)
      .finally(() => clearTimeout(timer))
  })
}
