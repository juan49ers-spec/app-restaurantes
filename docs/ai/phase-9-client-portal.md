# Cierre Fase 9 — Área cliente

Fecha: 2026-05-26

## Objetivo

Crear un portal autenticado para que el restaurante consulte informes profesionales publicados, con experiencia web como salida principal y PDF como opción secundaria.

## Qué se ha construido

- Ruta `/portal` con layout propio, limpio y sin sidebar operativo.
- Ruta `/portal/reports/[id]` para ver el detalle web de un informe publicado.
- Publicación explícita de versiones mediante `published_at` y `published_by`.
- Acciones server-side para publicar, despublicar, listar informes publicados, abrir detalle publicado, cargar contexto del portal y solicitar reunión.
- Tabla `portal_meeting_requests` para solicitudes de revisión.
- Datos opcionales de consultor en `restaurants`.
- Dato vivo mínimo: ventas acumuladas del mes actual contra objetivo mensual, separado del informe cerrado.
- Controles internos en `/reports` para publicar o despublicar versiones `READY`.

## Reglas de seguridad y calidad

- `restaurant_id` se resuelve siempre en servidor.
- El portal solo muestra informes con `published_at IS NOT NULL`.
- `READY` no implica publicación; publicación y revisión interna quedan separadas.
- El portal consume snapshots guardados, no recalcula informes.
- Las nuevas tablas y campos quedan versionados por migración.
- La solicitud de reunión crea registro interno; no envía email todavía.

## Tests añadidos

- Actions del portal: publicación, bloqueo por restaurante ajeno, listado publicado, detalle no publicado, contexto del portal y solicitud de reunión.
- Componente de solicitud de reunión.
- Controles de publicación/despublicación desde la mesa interna de informes.

## Verificación realizada

- `npm test -- tests/portal/portal-actions.test.ts tests/reporting/professional-reporting-action.test.ts`
- `npm test -- tests/components/PortalMeetingRequestDialog.test.tsx tests/portal/portal-actions.test.ts`
- `npm test -- tests/components/ProfessionalReportReview.test.tsx`
- `npm run typecheck`
- `npm run verify` — typecheck, lint estricto, 32 archivos de test, 326 tests y build de producción.

## Fuera de alcance mantenido

- Enlaces compartibles sin login.
- Envío real de emails.
- Editor visual de datos del consultor.
- Roles granulares dentro del restaurante.
- PDF server-side nuevo.
