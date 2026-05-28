# Cierre Fase 23 — Portal Cliente V3

## 1. Objetivo

Mejorar el storytelling del portal cliente sin tocar base de datos ni cambiar el motor de reporting.

La intención es que el cliente entienda mejor el estado de la entrega: si el informe ya está publicado, si se ha leído, si hay reunión pendiente y qué acciones conviene revisar.

## 2. Qué se ha añadido

- Nuevo componente `PortalReviewRoadmap`.
- El roadmap aparece en:
  - `/portal`, para acompañar el histórico y la portada ejecutiva;
  - `/portal/reports/[id]`, para cerrar el detalle del informe con un recorrido de revisión.
- Usa datos existentes:
  - `viewed_at`;
  - `meetingStatus`;
  - número de acciones sugeridas.

## 3. Flujo técnico de datos

No hay nuevas queries.

`PortalReviewRoadmap` recibe props ya cargadas por las páginas del portal. El estado de reunión sigue viniendo de `portal_meeting_requests` mediante `getPublishedReportsForRestaurant()` o `getPublishedReportDetailForRestaurant()`.

## 4. Reglas de negocio

- El roadmap no persiste estado.
- El roadmap no sustituye al histórico ni a los badges de `PortalReportSummary`.
- El estado de reunión mantiene la misma semántica:
  - `PENDING`: reunión solicitada;
  - `ACKNOWLEDGED`: reunión en preparación;
  - `COMPLETED`: revisión completada.
- Si no hay acciones sugeridas, se muestra una lectura tranquila sin inventar urgencia.

## 5. Dependencias e implicaciones cruzadas

- Portal cliente: `/portal` y `/portal/reports/[id]`.
- `PublishedReportSummary.meetingStatus`.
- `buildPortalSuggestedActions()`.
- `professional_report_drafts.viewed_at`.
- `portal_meeting_requests.status`.

## 6. Casos límite

- Si el informe no se ha leído, el roadmap marca la lectura como pendiente.
- Si no existe reunión abierta, invita a solicitar revisión desde el detalle.
- Si la reunión está completada, marca el recorrido como revisión cerrada.
- Si no hay acciones sugeridas, no fuerza una llamada a la acción urgente.

## 7. Verificación

- Test de componente añadido en `PortalPremiumComponents.test.tsx`.
- `npm run verify` debe seguir pasando antes de cerrar la fase.
