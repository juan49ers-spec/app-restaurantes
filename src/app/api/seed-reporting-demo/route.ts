import { NextResponse } from 'next/server'
import { seedProfessionalReportDemoData } from '@/app/actions/seed-professional-report-demo'

export async function POST() {
  const result = await seedProfessionalReportDemoData()

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result.data)
}
