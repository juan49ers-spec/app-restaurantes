# Cierre Fase 32 — Onboarding real de clientes

## Objetivo

Hacer más fiable el alta de restaurantes cliente en el modelo consultor-first, evitando estados incompletos y mostrando al admin un estado inicial claro.

## Cambios aplicados

- `createAdminClientWorkspace()` sigue requiriendo admin y validando Zod.
- Si se crea el restaurante pero falla la relación `consultant_restaurants`, la action intenta eliminar el restaurante recién creado.
- Si el rollback funciona, devuelve un error claro sin dejar cliente incompleto.
- Si el rollback falla, devuelve un mensaje explícito para revisar el panel de restaurantes.
- `ClientOnboardingWizard` muestra un bloque `Estado inicial` con restaurante, owner, consultor y primer informe.

## Seguridad

- No se acepta `restaurant_id` operativo desde cliente.
- La creación sigue protegida por `requireAdmin()`.
- La relación consultor-restaurante sigue escribiéndose solo desde action admin.

## Tests

- `tests/admin/consultant-access-actions.test.ts` cubre el rollback cuando falla la asignación de consultor.
- `tests/components/ClientOnboardingWizard.test.tsx` cubre el estado inicial visible tras el alta.

## Resultado

El onboarding queda más profesional: o se crea cliente + relación de consultor, o se cancela el alta sin dejar medias tintas.
