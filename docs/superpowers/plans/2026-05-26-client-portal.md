# Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/portal`, an authenticated client-facing area where restaurants can view published professional reports, request a review meeting, and download the existing printable report.

**Architecture:** Reuse `professional_report_drafts` as the immutable report source. Add explicit publication fields, portal meeting requests, server actions in `src/app/actions/portal.ts`, a clean `/portal` layout, and small portal components that consume `ProfessionalRestaurantReport` snapshots without recalculating report data.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase/Postgres RLS, Zod, shadcn/ui, Vitest.

---

## File Map

- Create `supabase/migrations/20260526120000_add_client_portal.sql`: publication columns, consultant fields, meeting requests table, RLS policies.
- Create `src/app/actions/portal.ts`: all portal actions and response types.
- Modify `src/app/actions/professional-reporting.ts`: expose `publishedAt`/`publishedBy` in saved draft types and history.
- Create `src/components/portal/PortalMeetingRequestDialog.tsx`: client modal/form for meeting requests.
- Create `src/components/portal/PortalReportSummary.tsx`: reusable summary for latest report and history rows.
- Create `src/app/portal/layout.tsx`: authenticated portal shell without operational sidebar.
- Create `src/app/portal/page.tsx`: portal home.
- Create `src/app/portal/reports/[id]/page.tsx`: report detail.
- Modify `src/components/reports/ProfessionalReportReview.tsx`: publish/unpublish controls in internal report history.
- Create `tests/portal/portal-actions.test.ts`: server action coverage.
- Create `tests/components/PortalMeetingRequestDialog.test.tsx`: client interaction coverage for meeting request submission.
- Create `docs/ai/20-portal-cliente.md`; update `docs/ai/README.md`, `docs/ai/19-reports.md`, `docs/ai/T02-base-de-datos.md`, `docs/ai/T06-server-actions-comunes.md`, `docs/ai/T11-reporting-profesional.md`.

---

### Task 1: Database Publication Model

**Files:**
- Create: `supabase/migrations/20260526120000_add_client_portal.sql`
- Modify: `docs/ai/T02-base-de-datos.md`

- [ ] **Step 1: Add migration with publication fields**

Create `supabase/migrations/20260526120000_add_client_portal.sql`:

```sql
ALTER TABLE public.professional_report_drafts
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professional_report_drafts_published
    ON public.professional_report_drafts (restaurant_id, published_at DESC)
    WHERE published_at IS NOT NULL;

ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS consultant_name TEXT,
    ADD COLUMN IF NOT EXISTS consultant_email TEXT,
    ADD COLUMN IF NOT EXISTS consultant_logo_url TEXT;
```

- [ ] **Step 2: Add meeting requests table with RLS**

Append to the same migration:

```sql
CREATE TABLE IF NOT EXISTS public.portal_meeting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.professional_report_drafts(id) ON DELETE SET NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'COMPLETED')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_meeting_requests_restaurant_created
    ON public.portal_meeting_requests (restaurant_id, created_at DESC);

ALTER TABLE public.portal_meeting_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_meeting_requests_select_own_restaurant" ON public.portal_meeting_requests;
CREATE POLICY "portal_meeting_requests_select_own_restaurant"
    ON public.portal_meeting_requests
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "portal_meeting_requests_insert_own_restaurant" ON public.portal_meeting_requests;
CREATE POLICY "portal_meeting_requests_insert_own_restaurant"
    ON public.portal_meeting_requests
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "portal_meeting_requests_update_own_restaurant" ON public.portal_meeting_requests;
CREATE POLICY "portal_meeting_requests_update_own_restaurant"
    ON public.portal_meeting_requests
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    );
```

- [ ] **Step 3: Document database changes**

Update `docs/ai/T02-base-de-datos.md`:

```md
| `professional_report_drafts` | `restaurant_id`, `period_from`, `period_to`, `version`, `status`, `report_snapshot`, `narrative_overrides`, `exported_at`, `published_at`, `published_by` | Versiones guardadas de informes profesionales. Solo las filas con `published_at IS NOT NULL` aparecen en el portal cliente. |
| `portal_meeting_requests` | `restaurant_id`, `report_id`, `message`, `status`, `created_by`, `created_at` | Solicitudes de reunion desde el portal cliente. RLS por restaurante propietario. |
```

- [ ] **Step 4: Commit**

Run:

```powershell
git add supabase/migrations/20260526120000_add_client_portal.sql docs/ai/T02-base-de-datos.md
git commit -m "feat: add client portal database model"
```

---

### Task 2: Portal Server Actions and Tests

**Files:**
- Create: `src/app/actions/portal.ts`
- Modify: `src/app/actions/professional-reporting.ts`
- Create: `tests/portal/portal-actions.test.ts`
- Modify: `docs/ai/T06-server-actions-comunes.md`

- [ ] **Step 1: Write action tests first**

Create `tests/portal/portal-actions.test.ts` using the mock-query style from `tests/reporting/professional-reporting-action.test.ts`. Required test names:

```ts
it('publishes only READY drafts owned by the active restaurant', async () => {})
it('rejects publishing a draft from another restaurant', async () => {})
it('lists only published reports without report snapshots', async () => {})
it('rejects unpublished report details', async () => {})
it('returns consultant identity and current month revenue progress', async () => {})
it('creates a pending meeting request for the active restaurant', async () => {})
```

Expected filters to assert:

```ts
expect(call.filters).toContainEqual(['eq', 'restaurant_id', RESTAURANT_ID])
expect(call.filters).not.toContainEqual(['eq', 'restaurant_id', expect.anythingFromInput])
expect(detailCall.filters).toContainEqual(['not', 'published_at', 'is', null])
```

- [ ] **Step 2: Implement `src/app/actions/portal.ts`**

Use this shape:

```ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabaseServer'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import type { ProfessionalRestaurantReport } from '@/lib/reporting'
import { getUserRestaurant } from './utils'

type ActionResponse<T> = { success: boolean; data?: T; error?: string }

const DraftIdSchema = z.object({ id: z.string().uuid() })
const MeetingRequestSchema = z.object({
  reportId: z.string().uuid(),
  message: z.string().max(2000).optional(),
})

export async function publishReportDraft(id: string): Promise<ActionResponse<{ id: string; publishedAt: string }>> {
  const parsed = DraftIdSchema.safeParse({ id })
  if (!parsed.success) return { success: false, error: 'Informe inválido.' }
  const restaurantId = await getUserRestaurant()
  if (!restaurantId) return { success: false, error: 'No hay restaurante activo.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuario no autenticado.' }

  const publishedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('professional_report_drafts')
    .update({ published_at: publishedAt, published_by: user.id })
    .eq('id', parsed.data.id)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'READY')
    .select('id, published_at')
    .single()

  if (error || !data) return { success: false, error: 'No se pudo publicar el informe.' }
  revalidatePath('/reports')
  revalidatePath('/portal')
  return { success: true, data: { id: data.id, publishedAt: data.published_at } }
}
```

Implement these exports in the same file with the following behavior:

```ts
export async function unpublishReportDraft(id: string): Promise<ActionResponse<{ id: string }>>
export async function getPublishedReports(): Promise<ActionResponse<PublishedReportSummary[]>>
export async function getPublishedReportDetail(id: string): Promise<ActionResponse<PublishedReportDetail>>
export async function getPortalContext(): Promise<ActionResponse<PortalContext>>
export async function requestConsultantMeeting(input: { reportId: string; message?: string }): Promise<ActionResponse<{ id: string }>>
```

Rules for each function:

- `unpublishReportDraft`: validate UUID, resolve active restaurant, update only matching `id + restaurant_id`, set `published_at` and `published_by` to `null`, revalidate `/reports`, `/portal`, and `/portal/reports/${id}`.
- `getPublishedReports`: select `id, period_from, period_to, version, status, schema_version, created_at, updated_at, exported_at, published_at, published_by`, filter `restaurant_id`, filter `published_at IS NOT NULL`, order `published_at DESC`, and do not select `report_snapshot`.
- `getPublishedReportDetail`: select full snapshot and narrative overrides, filter `id`, `restaurant_id`, and `published_at IS NOT NULL`.
- `getPortalContext`: select restaurant consultant fields plus current-month `daily_sales.revenue_total` and matching `monthly_targets.revenue_target`; return live progress only when target is greater than zero.
- `requestConsultantMeeting`: validate `reportId` and optional message, prove the report belongs to the active restaurant and is published, then insert `portal_meeting_requests` with `restaurant_id`, `report_id`, `message`, `created_by`, and `status='PENDING'`.

- [ ] **Step 3: Extend saved draft metadata**

Modify `SavedProfessionalReportDraft` in `src/app/actions/professional-reporting.ts`:

```ts
export interface SavedProfessionalReportDraft {
  id: string
  periodFrom: string
  periodTo: string
  version: number
  status: ProfessionalReportDraftStatus
  schemaVersion: string
  createdAt: string
  updatedAt: string
  exportedAt: string | null
  publishedAt: string | null
  publishedBy: string | null
}
```

Update selects and `mapDraftRow()` to include `published_at, published_by`.

- [ ] **Step 4: Run tests**

Run:

```powershell
npm.cmd test -- tests/portal/portal-actions.test.ts tests/reporting/professional-reporting-action.test.ts
```

Expected: portal tests and existing reporting action tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/app/actions/portal.ts src/app/actions/professional-reporting.ts tests/portal/portal-actions.test.ts docs/ai/T06-server-actions-comunes.md
git commit -m "feat: add client portal server actions"
```

---

### Task 3: Portal Layout and Pages

**Files:**
- Create: `src/app/portal/layout.tsx`
- Create: `src/app/portal/page.tsx`
- Create: `src/app/portal/reports/[id]/page.tsx`
- Create: `src/components/portal/PortalMeetingRequestDialog.tsx`
- Create: `src/components/portal/PortalReportSummary.tsx`
- Create: `tests/components/PortalMeetingRequestDialog.test.tsx`
- Create: `docs/ai/20-portal-cliente.md`

- [ ] **Step 1: Create portal layout**

`src/app/portal/layout.tsx` must be a server component:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentRestaurant } from '@/app/actions/user'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const restaurant = await getCurrentRestaurant()
  if (!restaurant) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/portal" className="text-sm font-semibold text-slate-950">
            Portal cliente
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link href="/portal">Inicio</Link>
            <Link href="/reports">Volver a ControlHub</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create home page**

`src/app/portal/page.tsx`:

```tsx
import Link from 'next/link'
import { getPortalContext, getPublishedReports, getPublishedReportDetail } from '@/app/actions/portal'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'

export default async function PortalPage() {
  const [contextRes, reportsRes] = await Promise.all([getPortalContext(), getPublishedReports()])
  const reports = reportsRes.data ?? []
  const latest = reports[0]
  const detailRes = latest ? await getPublishedReportDetail(latest.id) : null
  const detail = detailRes?.data
  const presentation = detail ? buildProfessionalReportPresentation(detail.report) : null

  if (!latest || !detail || !presentation) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase text-slate-500">Portal cliente</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">{contextRes.data?.restaurantName ?? 'Tu restaurante'}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Tu consultor aún no ha publicado ningún informe. Cuando haya un informe listo, aparecerá aquí con sus KPIs, conclusiones y descarga PDF.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase text-slate-500">Último informe publicado</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">{presentation.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{presentation.periodLabel}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/portal/reports/${latest.id}`} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white">Ver informe</Link>
            <Link href={`/reports/print/${latest.id}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Descargar PDF</Link>
          </div>
        </div>
        <PortalMeetingRequestDialog reportId={latest.id} />
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Create detail page**

`src/app/portal/reports/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getPublishedReportDetail, getPortalContext } from '@/app/actions/portal'
import { buildProfessionalReportPresentation } from '@/lib/reporting'

export default async function PortalReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detailRes, contextRes] = await Promise.all([getPublishedReportDetail(id), getPortalContext()])
  if (!detailRes.success || !detailRes.data) notFound()
  const draft = detailRes.data
  const presentation = buildProfessionalReportPresentation(draft.report)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold uppercase text-slate-500">Informe publicado</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{presentation.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{presentation.periodLabel} · Versión {draft.version}</p>
      </header>
      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {presentation.kpis.map(kpi => (
          <div key={kpi.id} className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{String(kpi.value ?? 'Sin dato')}</p>
            <p className="mt-2 text-xs text-slate-500">{kpi.note}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Add meeting dialog client component**

`src/components/portal/PortalMeetingRequestDialog.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { requestConsultantMeeting } from '@/app/actions/portal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function PortalMeetingRequestDialog({ reportId }: { reportId: string }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <Textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Mensaje opcional para tu consultor" />
      <Button disabled={isPending} onClick={() => startTransition(async () => {
        const response = await requestConsultantMeeting({ reportId, message })
        setState(response.success ? 'Solicitud enviada.' : response.error || 'No se pudo enviar la solicitud.')
      })}>
        Solicitar reunión de revisión
      </Button>
      {state && <p className="mt-2 text-sm text-slate-600">{state}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Add meeting dialog test**

`tests/components/PortalMeetingRequestDialog.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'

const requestConsultantMeeting = vi.fn()

vi.mock('@/app/actions/portal', () => ({
  requestConsultantMeeting: (input: unknown) => requestConsultantMeeting(input),
}))

describe('PortalMeetingRequestDialog', () => {
  beforeEach(() => {
    requestConsultantMeeting.mockReset()
  })

  it('submits a meeting request with an optional message', async () => {
    requestConsultantMeeting.mockResolvedValueOnce({ success: true, data: { id: 'request-1' } })
    render(<PortalMeetingRequestDialog reportId="11111111-1111-4111-8111-111111111111" />)

    fireEvent.change(screen.getByPlaceholderText('Mensaje opcional para tu consultor'), {
      target: { value: 'Quiero revisar el informe esta semana.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Solicitar reunión/i }))

    await waitFor(() => {
      expect(requestConsultantMeeting).toHaveBeenCalledWith({
        reportId: '11111111-1111-4111-8111-111111111111',
        message: 'Quiero revisar el informe esta semana.',
      })
    })
    expect(await screen.findByText('Solicitud enviada.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Commit**

```powershell
git add src/app/portal src/components/portal tests/components/PortalMeetingRequestDialog.test.tsx docs/ai/20-portal-cliente.md
git commit -m "feat: add authenticated client portal"
```

---

### Task 4: Internal Publish Controls

**Files:**
- Modify: `src/components/reports/ProfessionalReportReview.tsx`
- Modify: `tests/components/ProfessionalReportReview.test.tsx`
- Modify: `docs/ai/19-reports.md`
- Modify: `docs/ai/T11-reporting-profesional.md`

- [ ] **Step 1: Mock portal actions in existing component tests**

Add to `tests/components/ProfessionalReportReview.test.tsx`:

```ts
const publishReportDraft = vi.fn()
const unpublishReportDraft = vi.fn()

vi.mock('@/app/actions/portal', () => ({
  publishReportDraft: (...args: unknown[]) => publishReportDraft(...args),
  unpublishReportDraft: (...args: unknown[]) => unpublishReportDraft(...args),
}))
```

Add tests:

```ts
it('publishes a READY draft to the client portal', async () => {})
it('unpublishes an already published draft', async () => {})
```

- [ ] **Step 2: Add controls in history cards**

In `ProfessionalReportReview`, import:

```ts
import { publishReportDraft, unpublishReportDraft } from '@/app/actions/portal'
```

Add handler:

```ts
async function togglePublishedDraft(draft: SavedProfessionalReportDraft) {
  const response = draft.publishedAt
    ? await unpublishReportDraft(draft.id)
    : await publishReportDraft(draft.id)

  if (!response.success) {
    setSaveState({ type: 'error', message: response.error || 'No se pudo actualizar la publicación.' })
    return
  }

  setSavedDrafts(current => current.map(item => item.id === draft.id
    ? { ...item, publishedAt: draft.publishedAt ? null : new Date().toISOString() }
    : item
  ))
}
```

Render:

```tsx
{draft.status === 'READY' && (
  <Button size="sm" variant="outline" onClick={() => togglePublishedDraft(draft)}>
    {draft.publishedAt ? 'Despublicar' : 'Publicar en portal'}
  </Button>
)}
```

- [ ] **Step 3: Run component tests**

```powershell
npm.cmd test -- tests/components/ProfessionalReportReview.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```powershell
git add src/components/reports/ProfessionalReportReview.tsx tests/components/ProfessionalReportReview.test.tsx docs/ai/19-reports.md docs/ai/T11-reporting-profesional.md
git commit -m "feat: add report publishing controls"
```

---

### Task 5: Final Verification and Phase Report

**Files:**
- Create: `docs/ai/phase-9-client-portal.md`
- Modify: `docs/ai/README.md`

- [ ] **Step 1: Update AI index**

Add page row:

```md
| 20 | [Portal Cliente](./20-portal-cliente.md) | `/portal` | Área cliente para informes profesionales publicados. |
```

Add phase report link:

```md
- [Cierre Fase 9 — Área cliente](./phase-9-client-portal.md) — portal autenticado para informes publicados, solicitudes de reunión y descarga PDF.
```

- [ ] **Step 2: Write phase report**

`docs/ai/phase-9-client-portal.md` must include:

```md
# Cierre Fase 9 — Área cliente

Fecha: 2026-05-26

## Objetivo
Crear un portal autenticado para que el restaurante consulte informes profesionales publicados.

## Qué se ha construido
- Publicación explícita de versiones de informe.
- Portal `/portal` con último informe, histórico y dato vivo mínimo.
- Detalle web de informe publicado.
- Solicitud de reunión de revisión.

## Reglas de seguridad y calidad
- `restaurant_id` resuelto en servidor.
- Solo `published_at IS NOT NULL` aparece en portal.
- Snapshots inmutables como fuente del informe.

## Tests añadidos
- Actions del portal.
- Publicación/despublicación desde `/reports`.
- Render básico de portal cuando aplique.

## Verificación realizada
- `npm run verify`
```

- [ ] **Step 3: Run final verification**

```powershell
npm.cmd run verify
```

Expected:

- Typecheck OK.
- ESLint strict OK.
- Vitest all tests OK.
- Next build OK.

- [ ] **Step 4: Commit**

```powershell
git add docs/ai/README.md docs/ai/phase-9-client-portal.md
git commit -m "docs: close client portal phase"
```

---

## Self-Review

- Spec coverage: publication model, portal actions, portal UI, internal publishing, meeting request, docs and verification are covered.
- Scope check: links without login, email sending, consultant editor and server-side PDF are intentionally excluded.
- Type consistency: `publishedAt` and `publishedBy` are camelCase in TypeScript and map from `published_at`, `published_by`.
- Risk note: if `getCurrentRestaurant()` redirects unauthenticated users to onboarding instead of login through root layout behavior, keep the route behavior aligned with existing app auth rather than inventing a second auth helper.
