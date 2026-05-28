# Cierre Fase 37 — Hardening multi-cliente

## Objetivo

Endurecer la resolución del restaurante activo para consultores con cartera multi-cliente.

## Cambios aplicados

- `getUserRestaurant()` sigue validando la cookie `active_consultant_restaurant_id` contra `consultant_restaurants.status='ACTIVE'`.
- Si la cookie ya no corresponde a una relación activa, ahora se elimina además de ignorarse.
- Si la relación sigue activa, se mantiene la cookie y se retorna el cliente seleccionado.

## Seguridad

- La cookie no concede permisos por sí sola.
- Una relación `PAUSED`, `REVOKED` o eliminada no deja un estado fantasma persistente en sesiones largas.
- Impersonación admin conserva prioridad sobre la cookie de consultoría.

## Tests

- `tests/unit/utils.test.ts` cubre limpieza de cookie inválida y conservación de cookie válida.

## Resultado

El flujo multi-cliente queda más robusto ante cambios de permisos en caliente: revocar un acceso deja de producir cookies activas obsoletas.
