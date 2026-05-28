# Cierre Fase 36 — Notificaciones reales de entrega

## Objetivo

Conectar el flujo consultor-cliente con el centro de notificaciones in-app para que publicación de informe y solicitudes de reunión queden visibles sin depender solo de `/consultant`.

## Cambios aplicados

- Nuevos tipos de alerta: `REPORT_PUBLISHED` y `CLIENT_MEETING_REQUEST`.
- `AlertNotificationSchema` permite `entity_type = REPORT` y `rule_id` nullable para eventos que no nacen de una regla configurable.
- Publicar un informe inserta una notificación `REPORT_PUBLISHED`.
- Crear una solicitud nueva de reunión inserta una notificación `CLIENT_MEETING_REQUEST`.
- Si se reutiliza una solicitud abierta, no se crea una notificación duplicada.
- `NotificationCenter` y `NotificationHistory` enlazan notificaciones `REPORT` a `/portal/reports/{id}`.
- Migración `20260528233000_delivery_notifications.sql` permite `rule_id = NULL` en `alert_notifications`.

## Seguridad y robustez

- Las notificaciones se crean después de que la acción principal ya haya pasado validación de restaurante activo.
- La inserción de notificación es no bloqueante: un fallo se registra con logger estructurado y no revierte publicación ni solicitud.
- No se acepta `restaurant_id` desde el cliente.

## Tests

- `tests/portal/portal-actions.test.ts` verifica notificación al publicar.
- El mismo test verifica notificación al crear reunión nueva y que no se duplica cuando se reutiliza una solicitud abierta.

## Resultado

El centro de notificaciones empieza a reflejar eventos reales del ciclo de entrega profesional, sin introducir automatismos externos ni dependencia de email/push.
