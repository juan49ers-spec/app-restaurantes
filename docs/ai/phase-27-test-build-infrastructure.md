# Cierre Fase 27 — Infraestructura de test y build

## 1. Objetivo

Eliminar el warning `MaxListenersExceededWarning` que aparecía al ejecutar Vitest y el build de Next, dejando una salida más limpia y fiable para desarrollo, CI y revisión.

## 2. Qué se cambió

- `tests/setupTests.ts` eleva el límite de listeners del proceso de Vitest a 50.
- `scripts/run-next-build.mjs` eleva el límite en el proceso wrapper.
- `scripts/run-next-build.mjs` precarga `scripts/set-process-listener-limit.cjs` en el proceso hijo de Next build para aplicar el mismo límite dentro de Next/Turbopack.
- Se creó `scripts/set-process-listener-limit.cjs` como preload pequeño y explícito.

## 3. Por qué

Vitest/JSDOM y Next/Turbopack registran varios listeners de salida durante suites y builds grandes. El límite por defecto de Node (10) puede emitir warnings aunque no haya fuga real de memoria ni fallo funcional.

## 4. Qué no cambia

- No cambia código de aplicación.
- No cambia lógica de tests.
- No sube timeouts ni oculta tests lentos.
- No modifica Supabase, rutas, componentes ni server actions.

## 5. Verificación

- `npm run test -- tests/portal/portal-actions.test.ts tests/consultant/consultant-actions.test.ts tests/consultant/consultant-portfolio-actions.test.ts`
- `npm run build`

Ambos comandos terminaron sin `MaxListenersExceededWarning`.

## 6. Próximo paso recomendado

Ejecutar `npm run verify` tras esta fase antes de desplegar o fusionar con main.
