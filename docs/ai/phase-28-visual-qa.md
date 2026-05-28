# Cierre Fase 28 — QA visual robusta

## Objetivo

Verificar el portal cliente, el detalle de informe y la vista imprimible con Playwright sin depender del puerto local `:3000`, que suele estar ocupado durante desarrollo.

## Cambios aplicados

- `playwright.config.ts` usa `http://127.0.0.1:3100` por defecto.
- `E2E_PORT` permite cambiar el puerto local.
- `BASE_URL` permite apuntar Playwright a una URL remota; en ese caso no se arranca servidor local.
- `scripts/cli/qa-client-flow.mjs` pasa `BASE_URL` desde `QA_BASE_URL`, `BASE_URL` o el puerto local por defecto.

## Resultado

Se ejecutó `RUN_VISUAL_QA=true npm run qa:client-flow` contra servidor local en `127.0.0.1:3100`.

- QA determinista consultor -> cliente: pasada.
- Actions portal y anti-duplicado: pasadas.
- Workspace consultor y cartera: pasados.
- Componentes visibles de entrega: pasados.
- Playwright portal visual: 12/12 tests pasados.

## Reglas operativas

- Para local: `RUN_VISUAL_QA=true npm run qa:client-flow`.
- Para producción: `QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow`.
- Las capturas viven en `tests/e2e/screenshots/` y no se versionan.

## Riesgos cerrados

- Evita fallos `EADDRINUSE` cuando ya hay un servidor en `:3000`.
- Evita que Playwright se conecte accidentalmente a una app local vieja o con error en otro puerto.
