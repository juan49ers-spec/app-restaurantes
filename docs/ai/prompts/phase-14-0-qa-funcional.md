# Prompt para Codex — Fase 14.0: QA funcional completo

## Contexto del proyecto

App SaaS de finanzas para restaurantes (Next.js 15 / Supabase / TypeScript).
Modelo de negocio: un **consultor** prepara informes profesionales y los entrega a su **restaurante cliente** mediante un portal web.

El código ya tiene:
- Importación CSV de ventas, gastos, ventas por receta, turnos, facturas, recetas y empleados con defensa 3 capas (preview → preflight → import).
- Motor puro de reporting en `src/lib/reporting/` que genera `ProfessionalRestaurantReport` sin consultar Supabase.
- Capa de presentación (`buildProfessionalReportPresentation`) y quality gate (`evaluateProfessionalReportQualityGate`).
- Persistencia de borradores con versionado inmutable en `professional_report_drafts`.
- Publicación explícita (`published_at`) separada de estado interno (`READY`).
- Portal cliente en `/portal` con portada ejecutiva, capítulos, comparativa mensual, acciones sugeridas, PDF imprimible y solicitud de reunión.
- Workspace del consultor en `/consultant` con checklist ponderada, flujo de entrega, solicitudes de reunión y branding.
- Plan de revisión determinista (`buildConsultantBriefing`) sin LLM.
- Health check en `/api/health`.
- Migración de índice único parcial para meeting requests.
- 437 tests verdes en 63 archivos. Build limpio.

## Objetivo de esta fase

Escribir **tests E2E y de integración** que verifiquen el flujo completo de entrega consultor→cliente. NO se trata de construir funcionalidad nueva, sino de **verificar que lo existente funciona correctamente encadenado**. Si durante los tests descubres un bug real, corrígelo y documéntalo.

## Flujo a verificar (el "happy path" completo)

Escribe tests que cubran esta secuencia como un viaje integrado:

### Bloque 1 — Preparación de datos (server actions)
1. **Cargar ventas** del periodo (ej. mayo 2026) mediante `importFinancialCsv({ kind: 'sales', csvText })`.
2. **Cargar gastos** del periodo mediante `importFinancialCsv({ kind: 'expenses', csvText })`.
3. **Verificar checklist del consultor**: llamar a `getPreparationChecklistForPeriod({ month: '2026-05' })` y verificar que ventas y gastos marcan `complete`.

### Bloque 2 — Generación de informe (server actions)
4. **Generar borrador**: llamar a `getProfessionalReportDraft({ from: '2026-05-01', to: '2026-05-31' })` y verificar que devuelve un `ProfessionalRestaurantReport` con secciones de ventas y gastos en estado `OK` o `PARTIAL` (no `MISSING`).
5. **Guardar versión READY**: llamar a `saveProfessionalReportDraft({ periodFrom, periodTo, status: 'READY', narrativeOverrides: {} })` y verificar que retorna un `id` y `version`.
6. **Verificar quality gate**: sobre el snapshot guardado, llamar a `evaluateProfessionalReportQualityGate(snapshot)` y verificar que no hay bloqueos (`blockers` vacío).

### Bloque 3 — Publicación (server actions)
7. **Publicar**: llamar a `publishReportDraft(draftId)` y verificar que retorna éxito.
8. **Verificar visibilidad en portal**: llamar a `getPublishedReports()` y verificar que el informe aparece en la lista con `published_at` no null.
9. **Abrir detalle publicado**: llamar a `getPublishedReportDetail(draftId)` y verificar que devuelve el snapshot completo.

### Bloque 4 — Experiencia cliente (server actions + lógica pura)
10. **Verificar viewed_at**: después de abrir el detalle, `viewed_at` debe estar marcado.
11. **Construir presentación**: llamar a `buildProfessionalReportPresentation(snapshot)` y verificar que tiene `chapters`, `conclusions` y `executiveKpis`.
12. **Comparativa mensual**: llamar a `buildPortalPeriodComparison(input)` con datos del periodo y del mes anterior. Verificar que retorna deltas válidos.
13. **Acciones sugeridas**: llamar a `buildPortalSuggestedActions(presentation)` y verificar que retorna un array (puede ser vacío si todo está bien).
14. **Briefing del consultor**: llamar a `buildConsultantBriefing(presentation)` y verificar que retorna `headline`, `priorities` y `nextSteps`.

### Bloque 5 — Solicitud de reunión (server actions)
15. **Solicitar reunión**: llamar a `requestConsultantMeeting({ reportId: draftId, message: 'Quiero revisar los gastos' })` y verificar que crea una solicitud `PENDING`.
16. **Verificar anti-duplicado**: llamar otra vez a `requestConsultantMeeting` con el mismo `reportId` y verificar que retorna la solicitud existente con `reused: true`, no crea una nueva.
17. **Gestionar desde consultor**: llamar a `updateMeetingRequestStatus({ id: requestId, status: 'COMPLETED' })` y verificar que se actualiza.

### Bloque 6 — Flujo de entrega del consultor (server actions)
18. **Workspace actualizado**: llamar a `getConsultantWorkspace()` y verificar que:
    - El informe publicado aparece en la lista.
    - La solicitud completada aparece en meeting requests.
    - `viewed_at` del informe refleja que el cliente ya lo vio.

### Bloque 7 — Despublicación y limpieza
19. **Despublicar**: llamar a `unpublishReportDraft(draftId)` y verificar que `published_at` queda null.
20. **Verificar que el portal ya no lo muestra**: `getPublishedReports()` retorna lista vacía (o sin ese informe).

## Tests negativos obligatorios

Además del happy path, escribe tests para estos escenarios:

- **Publicar informe bloqueado**: crear un snapshot con incidencias críticas y verificar que `publishReportDraft` lo rechaza.
- **Abrir detalle no publicado**: verificar que `getPublishedReportDetail(draftId)` falla si el informe no está publicado.
- **Reunión duplicada**: cubierto en el paso 16, pero asegura que la BD no tiene dos filas.
- **Checklist sin datos**: llamar a `getPreparationChecklistForPeriod` para un mes vacío y verificar que los ítems de ventas y gastos marcan `missing` con severidad `blocker`.
- **Quality gate con conflicto**: crear un snapshot con una sección `CONFLICT` y verificar que el gate retorna `BLOCKED`.

## Reglas técnicas obligatorias

1. **`restaurant_id` NUNCA viaja desde cliente.** Todas las actions usan `getUserRestaurant()`.
2. **Mockear Supabase**, no la base real. Los tests de integración mockean `createClient()` como ya hacen los tests existentes en `tests/`.
3. **Seguir el patrón AAA** (Arrange-Act-Assert) en cada test.
4. **No usar `any`**. Usar tipos importados de `src/lib/reporting/types.ts`, `src/lib/consultant/types.ts`, etc.
5. **Inmutabilidad**: no mutar objetos en tests; crear copias con spread.
6. **Sin `console.log`** en código de test ni en fixes.
7. **Nombre de archivo**: `tests/qa/full-delivery-flow.test.ts` para el happy path integrado. Tests negativos pueden ir en el mismo archivo o en `tests/qa/delivery-edge-cases.test.ts`.
8. **Zod validation**: si algún input de action falla validación Zod, el test debe verificar que el error es claro y no un crash genérico.

## Fixtures recomendados

Para no depender del seed demo, crea fixtures mínimos inline:

```typescript
const SALES_CSV = `date,revenue_total,covers
2026-05-01,1500.50,45
2026-05-02,1800.00,52
2026-05-03,2100.75,61`;

const EXPENSES_CSV = `expense_date,category,amount,description
2026-05-01,COGS,450.00,Compra semanal
2026-05-15,PERSONAL,2800.00,Nóminas mayo
2026-05-20,OPERATIONS,350.00,Mantenimiento`;
```

## Verificación final

Después de escribir los tests:

1. Ejecutar `npm test -- tests/qa/` y verificar que todos pasan.
2. Ejecutar `npm run verify` (typecheck + lint:strict + test + build).
3. Si algún test descubre un bug real en el código de producción:
   - Corregir el bug con el diff mínimo.
   - Documentar el fix en el mensaje de commit.
   - Verificar que el test pasa después del fix.

## Commits esperados

- `test: add full delivery flow QA tests` — el happy path completo.
- `test: add delivery edge case tests` — los tests negativos.
- Si hay bugs encontrados: `fix: <descripción del bug>` como commits separados ANTES de los tests.

## Archivos clave a leer antes de empezar

- `docs/ai/T11-reporting-profesional.md` — contrato del informe y quality gate.
- `docs/ai/20-portal-cliente.md` — portal, publicación, reuniones.
- `docs/ai/21-consultant-workspace.md` — checklist, entrega, branding.
- `docs/ai/19-reports.md` — mesa de revisión de informes.
- `src/lib/reporting/types.ts` — tipos del informe.
- `src/lib/reporting/quality-gate.ts` — evaluador de quality gate.
- `src/lib/consultant/types.ts` — tipos del workspace.
- `src/lib/portal-insights.ts` — comparativa y acciones sugeridas.
- `src/lib/reporting/consultant-briefing.ts` — briefing determinista.
- `src/app/actions/portal.ts` — actions del portal.
- `src/app/actions/consultant.ts` — actions del consultor.
- `src/app/actions/professional-reporting.ts` — actions de informes.
- `src/app/actions/financial-control.ts` — importación CSV financiera.
- `tests/` — estudiar los patrones de mock existentes antes de escribir mocks nuevos.
