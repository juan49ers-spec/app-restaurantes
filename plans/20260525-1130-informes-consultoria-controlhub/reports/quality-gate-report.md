# Informe de calidad previo a Fase 1

Fecha: 2026-05-25

## Qué no estaba bien

- `npm run build` dependía del `NODE_ENV` heredado por la terminal. Con `NODE_ENV=development` fallaba durante prerender.
- ESLint tenía una configuración incompatible con Next 16/ESLint flat config y podía romper o analizar archivos que no correspondían, como `test-bundle.js`.
- Una vez arreglada la configuración, aparecieron errores reales de lint en componentes React 19/Compiler: setState síncrono en effects, refs tocadas durante render, `any` y memoizaciones frágiles.

## Qué se ha corregido

- `npm run build` ahora llama a `scripts/run-next-build.mjs`, que ejecuta Next con `NODE_ENV=production` de forma determinista en Windows.
- `eslint.config.mjs` usa configuración flat nativa de `eslint-config-next` y excluye artefactos generados/no relevantes.
- `/admin` fuerza render dinámico para evitar prerender inseguro con sesión/cookies.
- `global-error.tsx` ya no importa componentes de la app durante el render de error global.
- `error.tsx` también queda autocontenido para que el error boundary no pueda fallar por imports de UI o iconos externos.
- El proxy y el root layout evitan llamadas a Supabase cuando no hay cookie de sesión; `/login` ya no depende de red externa para pintar la primera pantalla.
- El build script elimina `.next/dev` antes de compilar para que artefactos del dev server no contaminen la validación de tipos de producción.
- Billing admin normaliza datos nulos antes de renderizar.
- Se corrigieron errores de React Compiler y TypeScript en hooks, layout, financial-control, staff y utilidades compartidas.

## Estado verificado

- `npm run typecheck`: pasa.
- `npx eslint --max-warnings=0`: pasa sin warnings.
- `npm run lint`: pasa sin warnings.
- `npm run build`: pasa sin warnings ni avisos de deprecación.
- `GET /login`: responde 200 tras compilar; segunda carga comprobada en 211 ms.
- `GET /suppliers` sin sesión: responde 307 hacia `/login`.
- `dev-codex-localhost.err.log`: 0 bytes tras reinicio limpio del dev server.

## Riesgo pendiente

- No quedan warnings conocidos de lint ni avisos de build de Next tras migrar `middleware.ts` a `proxy.ts`.
