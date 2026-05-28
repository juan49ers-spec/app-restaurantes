import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requestConsultantMeetingForRestaurant } from '@/lib/portal'
import { getUserRestaurant } from '@/app/actions/utils'

const MeetingRequestSchema = z.object({
  reportId: z.string().uuid(),
  message: z.string().max(2000).optional(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = MeetingRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Solicitud inválida.' }, { status: 400 })
  }

  const restaurantId = await getUserRestaurant()
  if (!restaurantId) {
    return NextResponse.json({ success: false, error: 'No hay restaurante activo.' }, { status: 401 })
  }

  const result = await requestConsultantMeetingForRestaurant({
    restaurantId,
    reportId: parsed.data.reportId,
    message: parsed.data.message,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
