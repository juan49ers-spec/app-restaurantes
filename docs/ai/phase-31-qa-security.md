# Cierre Fase 31 — Seguridad QA

## Objetivo

Eliminar credenciales reales hardcodeadas en los tests E2E y dejar un guardia automático para que no vuelvan a entrar secretos en el código.

## Cambios aplicados

- `tests/e2e/portal-visual-qa.spec.ts` ya no contiene email ni contraseña por defecto.
- La QA visual requiere `E2E_EMAIL` y `E2E_PASSWORD` desde entorno o `.env.local`.
- `scripts/cli/qa-client-flow.mjs` carga `.env.local` y `.env` antes de ejecutar las pruebas.
- `tests/security/no-hardcoded-e2e-credentials.test.ts` verifica que el spec visual no contiene las credenciales reales y que usa variables de entorno.
- El helper de login de Playwright espera a que el botón esté habilitado, registra la espera de navegación antes del click y da margen de 45 segundos a Supabase/Vercel en producción para evitar falsos flakies por latencia.

## Regla de seguridad

Las credenciales de QA nunca se versionan. Deben configurarse localmente o en el entorno CI/CD.

## Verificación

- `npm run test -- tests/security/no-hardcoded-e2e-credentials.test.ts` pasa.
- La QA visual se salta con explicación si faltan credenciales, en vez de fallar o depender de valores incrustados.
