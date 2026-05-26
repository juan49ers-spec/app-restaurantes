import { NextResponse } from 'next/server'
import { seedProfessionalReportDemoData } from '@/app/actions/seed-professional-report-demo'
import { createClient } from '@/lib/supabaseServer'

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function isDemoSeedRouteAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_REPORTING_DEMO_SEED === 'true'
}

function getRateLimitKey(request: Request, userId: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedFor || request.headers.get('x-real-ip') || 'unknown-ip'
  return `${userId}:${ip}`
}

function isRateLimited(key: string, now = Date.now()) {
  const current = rateLimitBuckets.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  current.count += 1
  return false
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  if (!isDemoSeedRouteAllowed()) {
    return NextResponse.json({ error: 'Seed demo no habilitada.' }, { status: 403 })
  }

  if (isRateLimited(getRateLimitKey(request, authData.user.id))) {
    return NextResponse.json(
      { error: 'Demasiadas ejecuciones de seed demo. Intenta de nuevo en unos minutos.' },
      { status: 429 },
    )
  }

  const result = await seedProfessionalReportDemoData()

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result.data)
}
