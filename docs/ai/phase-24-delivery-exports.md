# Cierre Fase 24 — Exportaciones y entregables

## 1. Objetivo

Ordenar los entregables visibles para el cliente: informe web, PDF imprimible y revisión con consultor.

No se crea un segundo motor de exportación. El foco es que el cliente entienda qué puede usar y que todo parte del mismo snapshot publicado.

## 2. Qué se ha añadido

- Nuevo componente `PortalDeliveryPack`.
- Se integra en:
  - `/portal`;
  - `/portal/reports/[id]`.
- Muestra tres piezas:
  - informe web;
  - PDF imprimible;
  - revisión con consultor.
- Añade enlace directo al PDF del informe publicado.

## 3. Flujo técnico de datos

No hay nuevas queries, tablas ni mutaciones.

El componente recibe `reportId` y construye el enlace `/reports/print/{reportId}`. La disponibilidad real sigue protegida por la página de impresión y por el estado publicado del draft.

## 4. Reglas de negocio

- El PDF y el informe web consumen el mismo snapshot publicado.
- No se muestran como fuentes diferentes de verdad.
- Despublicar el informe debe ocultar el acceso desde el portal.
- La revisión con consultor sigue gestionándose mediante `PortalMeetingRequestDialog` y `portal_meeting_requests`.

## 5. Dependencias e implicaciones cruzadas

- Portal cliente.
- PDF imprimible en `/reports/print/[draftId]`.
- `professional_report_drafts.report_snapshot`.
- `PortalMeetingRequestDialog`.

## 6. Casos límite

- Si un cliente abre un PDF despublicado por URL directa, la ruta de impresión debe seguir aplicando sus propias comprobaciones.
- Si el informe no tiene acciones sugeridas, el paquete de entrega sigue mostrando PDF y revisión como recursos disponibles.

## 7. Verificación

- Test de componente añadido en `PortalPremiumComponents.test.tsx`.
- `npm run verify` debe seguir pasando antes de cerrar la fase.
