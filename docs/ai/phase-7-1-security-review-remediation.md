# Cierre Fase 7.1 — Remediación de revisión externa

## Qué se revisó

Claude revisó de forma independiente Reporting profesional y Menu Engineering. La revisión validó la base de reporting, pero detectó riesgos de seguridad en Menu Engineering.

## Qué se corrigió

- `updateReportItem` ya no actualiza un item solo por UUID. Primero carga el item, obtiene su `report_id` y comprueba que el reporte pertenece al restaurante activo.
- `deleteReport` borra con doble filtro: `id` y `restaurant_id`.
- `calculateMatrix` comprueba propiedad del reporte antes de leer y recalcular items, y filtra el update final por restaurante.
- `getMenuReports` y `getMenuReport` usan `getUserRestaurant()` en vez de resolver usuario manualmente.
- Se eliminaron logs de producción con IDs internos en `menu-engineering.ts`.
- Se añadió RLS reproducible para `menu_reports` y `menu_report_items`.
- Se corrigió una mutación directa en `bulkUpdateSimulatedItems`.

## Tests añadidos

- Tests de seguridad para `updateReportItem`, `deleteReport` y `calculateMatrix`.
- Tests de `saveProfessionalReportDraft` para:
  - Guardado de snapshot regenerado en servidor.
  - Sanitización de narrativas.
  - Bloqueo si el informe regenerado no pertenece al restaurante activo.
  - Retry cuando hay choque de versión por índice único.

## Resultado

Los hallazgos críticos C1-C4 quedan cerrados a nivel de server action y base de datos. El hallazgo A1 queda cubierto con tests. A2/A3 quedan mitigados en Menu Engineering al usar el contexto tenant y eliminar logs de producción en esas actions.
