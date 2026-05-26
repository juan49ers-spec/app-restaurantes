# Fase 9 — Área cliente (portal profesional)

## Contexto del proyecto

App Next.js (App Router) + Supabase + TypeScript para gestión financiera de restaurantes. Multi-tenant: cada usuario tiene un restaurante activo resuelto server-side con `getUserRestaurant()` de `src/app/actions/utils.ts`. Nunca se acepta `restaurant_id` del cliente.

Ya existe un sistema de **informes profesionales** con:

- **Motor puro** en `src/lib/reporting/` que genera `ProfessionalRestaurantReport` (secciones, KPIs, quality tracking, narrative, sourceMap).
- **Capa de presentación** en `src/lib/reporting/professional-report-presentation.ts` que transforma el report en capítulos, KPIs ejecutivos y conclusiones (`buildProfessionalReportPresentation()`).
- **Persistencia** en tabla `professional_report_drafts` con estados `DRAFT | REVIEWED | READY`, versionado por `(restaurant_id, period_from, period_to, version)`, RLS por `owner_id`, y snapshots JSONB inmutables.
- **Server actions** en `src/app/actions/professional-reporting.ts`: `getProfessionalReportDraft()`, `saveProfessionalReportDraft()`, `getSavedProfessionalReportDraft()`, `markProfessionalReportDraftExported()`.
- **Layout actual**: `src/app/layout.tsx` envuelve todo en `<AppLayout>` que incluye `<Sidebar>`. La ruta `/admin` tiene su propio layout sin sidebar operativo (`src/app/admin/layout.tsx` con `AdminShell`). No hay middleware de auth a nivel de archivo — la protección es por layout + server actions.

## Objetivo de esta fase

Crear un **área cliente** dentro de la app donde el restaurante ve sus informes **publicados**. Es un portal ejecutivo profesional, sin sidebar operativo, con layout propio limpio.

## Decisiones de diseño ya tomadas

1. **Auth**: solo usuarios autenticados del restaurante. Los enlaces compartibles sin login se dejan para una fase posterior.
2. **Experiencia**: portal híbrido controlado — el informe cerrado manda, con una capa mínima de dato vivo claramente etiquetada.
3. **Publicación separada**: `DRAFT → REVIEWED → READY` sigue siendo el flujo interno. La publicación al cliente se marca con `published_at` / `published_by`. Solo lo que tiene `published_at IS NOT NULL` aparece en el portal.
4. **Layout sin sidebar**: ruta `/portal`, layout propio sin el sidebar operativo de ControlHub.
5. **Identidad del consultor**: el portal muestra marca/nombre del consultor que produce el informe, no solo el nombre del restaurante.
6. **Dato vivo**: únicamente ventas acumuladas del mes en curso vs. objetivo mensual. Nada más.
7. **Acción de contacto**: botón "Solicitar reunión de revisión" que envía email o crea registro interno.

## Entregables

### 1. Migración SQL: publicación + datos de consultor

Archivo: `supabase/migrations/YYYYMMDDHHMMSS_add_portal_publication.sql`

```sql
-- Añadir campos de publicación a professional_report_drafts
ALTER TABLE public.professional_report_drafts
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professional_report_drafts_published
    ON public.professional_report_drafts (restaurant_id, published_at DESC)
    WHERE published_at IS NOT NULL;

-- Datos del consultor a nivel de restaurante
ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS consultant_name TEXT,
    ADD COLUMN IF NOT EXISTS consultant_email TEXT,
    ADD COLUMN IF NOT EXISTS consultant_logo_url TEXT;
```

No crear tabla nueva. Reusar `professional_report_drafts` con los campos adicionales.

### 2. Server actions del portal

Archivo: `src/app/actions/portal.ts`

Acciones necesarias (todas usan `getUserRestaurant()` server-side, nunca reciben `restaurant_id`):

- **`publishReportDraft(draftId: string)`**: Marca un draft como publicado (`published_at = NOW()`, `published_by = user.id`). Solo si el draft existe, pertenece al restaurante activo, y tiene status `READY`. Devuelve `ActionResponse`.

- **`unpublishReportDraft(draftId: string)`**: Quita la publicación (`published_at = null`, `published_by = null`). Solo si pertenece al restaurante activo.

- **`getPublishedReports()`**: Devuelve todos los drafts del restaurante activo con `published_at IS NOT NULL`, ordenados por `published_at DESC`. Campos: `id, period_from, period_to, version, status, published_at, created_at`. NO incluir `report_snapshot` (es pesado para el listado).

- **`getPublishedReportDetail(draftId: string)`**: Devuelve un draft publicado completo (con `report_snapshot` y `narrative_overrides`). Solo si `published_at IS NOT NULL` y pertenece al restaurante activo.

- **`getPortalContext()`**: Devuelve el contexto mínimo del portal: nombre del restaurante, datos del consultor (`consultant_name`, `consultant_email`, `consultant_logo_url`), y dato vivo (ventas acumuladas del mes en curso vs. objetivo mensual desde `daily_sales` y `monthly_targets`).

- **`requestConsultantMeeting(reportId: string, message?: string)`**: Crea un registro de solicitud de reunión. Fase 1: insertar en una tabla simple `portal_meeting_requests(id, restaurant_id, report_id, message, created_at, status)` con status `PENDING`. El envío de email se deja para fase posterior.

### 3. Migración SQL: solicitudes de reunión

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

-- RLS: mismo patrón owner_id que el resto de tablas
ALTER TABLE public.portal_meeting_requests ENABLE ROW LEVEL SECURITY;
-- Policies SELECT/INSERT para usuarios del restaurante (ver patrón en professional_report_drafts)
```

### 4. Layout del portal

Archivo: `src/app/portal/layout.tsx`

- Layout **server component** que verifica auth (igual que `/admin/layout.tsx` pero sin check de email admin — cualquier usuario autenticado con restaurante activo puede entrar).
- Si no hay usuario o no tiene restaurante → `redirect('/login')`.
- NO incluir `<AppLayout>` ni `<Sidebar>`. Layout limpio propio.
- Incluir header con: logo del consultor (si existe), nombre del restaurante, navegación mínima (Inicio, Informes, Volver a ControlHub).
- Footer discreto con nombre del consultor y año.
- Usar las mismas fuentes y tokens CSS del proyecto (Inter, Tailwind, shadcn/ui).

### 5. Páginas del portal

#### `/portal` (portada)

Archivo: `src/app/portal/page.tsx`

Contenido:
- **Último informe publicado**: card principal con periodo, título, 3 conclusiones ejecutivas (de `buildProfessionalReportPresentation()`), estado de calidad, y botones "Ver informe" + "Descargar PDF".
- **KPIs del informe**: 3-4 KPIs principales del informe publicado (del presentation layer).
- **Dato vivo**: card separada, claramente etiquetada como "Actualización operativa — no forma parte del informe", mostrando ventas acumuladas del mes vs. objetivo. Si no hay datos del mes en curso o no hay objetivo, no mostrar la card.
- **Histórico**: tabla/lista de informes anteriores publicados con fecha, periodo y enlace a detalle.
- **Solicitar reunión**: botón que abre modal con textarea opcional y envía `requestConsultantMeeting()`.

Estado vacío: si no hay ningún informe publicado, mostrar mensaje claro tipo "Tu consultor aún no ha publicado ningún informe para este periodo."

#### `/portal/reports/[id]` (detalle de informe)

Archivo: `src/app/portal/reports/[id]/page.tsx`

- Carga el informe completo con `getPublishedReportDetail()`.
- Pasa el `report_snapshot` por `buildProfessionalReportPresentation()`.
- Renderiza: header con periodo y versión, capítulos del informe (usa los `PresentationChapter` existentes), KPIs por sección, narrativas, conclusiones, calidad de datos.
- Botón "Descargar PDF" y "Solicitar reunión".
- Si el informe no existe o no está publicado → redirect a `/portal`.

### 6. Botón de publicar desde el área interna

En la vista interna existente de informes profesionales (donde el usuario gestiona drafts), añadir un botón "Publicar en portal" que llame a `publishReportDraft()`. Solo visible si el draft tiene status `READY` y `published_at IS NULL`. Si ya está publicado, mostrar "Despublicar" que llame a `unpublishReportDraft()`.

No crear página nueva para esto — integrarlo en los componentes existentes de gestión de drafts.

### 7. Tests

Archivo: `tests/portal/portal-actions.test.ts`

Tests mínimos obligatorios:
- `publishReportDraft` solo funciona si status es READY y pertenece al restaurante activo.
- `publishReportDraft` rechaza si el draft no pertenece al restaurante.
- `getPublishedReports` solo devuelve drafts con `published_at IS NOT NULL`.
- `getPublishedReportDetail` rechaza si `published_at IS NULL`.
- `getPortalContext` devuelve datos del consultor y dato vivo de ventas vs. objetivo.
- `requestConsultantMeeting` crea registro con status PENDING.

Seguir el patrón de mocks existente en `tests/reporting/professional-reporting-action.test.ts` (MockQuery con `tableResults`, `calls` tracking, mock de `getUserRestaurant`).

### 8. Documentación

Actualizar `docs/ai/README.md` con la nueva ruta `/portal`.
Crear `docs/ai/20-portal-cliente.md` con las 7 secciones canónicas del formato (ver `04-financial-control.md` como plantilla). El número 18 ya pertenece a Inventory y el 19 a Reports.

## Reglas de implementación

- **Multi-tenancy**: todas las queries filtran por `restaurant_id` resuelto server-side. Nunca aceptar IDs de restaurante del cliente.
- **Sin console.log**: usar `createActionLogger` si hace falta logging.
- **Immutabilidad**: no mutar objetos. Crear copias.
- **Zod**: validar inputs de todas las server actions.
- **RLS**: todas las tablas nuevas/modificadas con RLS habilitado y policies por `owner_id`.
- **Motor puro**: si necesitas transformar datos del informe para el portal, hacerlo en `src/lib/reporting/` sin queries a Supabase.
- **Tipos**: definir interfaces para las respuestas del portal en `src/lib/reporting/types.ts` o un nuevo `src/types/portal.ts`.

## Verificación final

Antes de hacer commit, ejecutar `npm run verify` (typecheck → lint:strict → test → build) y confirmar que pasa limpio. NO ejecutar test y build en paralelo.

## Lo que NO incluir en esta fase

- Enlaces compartibles sin login (fase posterior).
- Envío real de emails (solo crear registro de solicitud).
- Edición de datos del consultor desde la UI (se configura directamente en BD por ahora).
- PDF rendering desde el portal (reutilizar el botón de export que ya existe internamente).
- Roles/permisos granulares (todos los usuarios del restaurante ven lo mismo).
