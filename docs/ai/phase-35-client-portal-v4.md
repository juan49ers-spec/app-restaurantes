# Cierre Fase 35 — Portal Cliente V4

## Objetivo

Hacer que el cliente sepa qué hacer después de abrir un informe: leer, revisar prioridades, pedir reunión o consultar el histórico.

## Cambios aplicados

- Añadida la función pura `buildPortalClientReviewPlan()` en `src/lib/portal-insights.ts`.
- Añadido el componente `PortalClientReviewPlan` en el detalle del informe publicado.
- Añadidas anclas estables en el detalle: `#resumen-ejecutivo`, `#acciones-sugeridas` y `#solicitar-reunion`.
- El plan usa `viewedAt`, `meetingStatus` y acciones sugeridas ya existentes. No añade tablas ni estado duplicado.

## Seguridad y reglas

- No se añade ninguna mutación.
- El plan no acepta `restaurant_id`.
- No usa IA ni genera causalidad nueva.
- Si ya hay reunión abierta, no invita a duplicarla; enlaza al estado de solicitud.

## Tests

- `tests/portal/portal-client-review-plan.test.ts` cubre lectura pendiente, revisión de prioridades, reunión abierta y revisión completada.
- `tests/components/PortalClientReviewPlan.test.tsx` cubre renderizado del plan, acción principal y pasos accesibles.

## Resultado

El portal se siente más guiado y menos “dashboard”: el cliente entiende el siguiente paso dentro del propio informe, con reglas deterministas y sin deuda de datos.
