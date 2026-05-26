# T01 — Arquitectura general

> Transversal. Todas las páginas dependen de esto. Léelo antes de tocar cualquier ruta nueva.

## Identidad

- **Nombre del producto:** ControlHub (en `src/app/layout.tsx` el metadata title es "ControlHub", el README todavía dice "Restaurant Financial Management System").
- **Tagline interno:** "Gastronomic Intelligence Platform".
- **Tipo:** SaaS multi-tenant para restaurantes. Un usuario = un restaurante propio (campo `restaurants.owner_id = auth.uid()`). Los super-admins pueden impersonar restaurantes.

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 — App Router |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui (Radix) + framer-motion + lucide-react |
| Backend | Supabase (PostgreSQL + Auth + Storage) vía `@supabase/ssr` y `@supabase/supabase-js` |
| Formularios | react-hook-form + zod |
| Gráficos | Recharts |
| OCR | OpenAI GPT-4o vision (`src/services/openai-vision.ts`) |
| Logger | pino + pino-pretty |
| Exportes | jsPDF + jspdf-autotable, xlsx, file-saver |
| Tours | driver.js |
| DnD | @dnd-kit (turnos del módulo Staff) |
| Tests | vitest (unit) + playwright (e2e) |

## Estructura del repo (lo que un agente necesita saber)

```
src/
├── app/
│   ├── layout.tsx               ← Root layout: AppLayout + Sidebar + BroadcastBanner + ImpersonationBanner
│   ├── page.tsx                 ← Dashboard raíz (UnifiedDashboard) — redirige admins a /admin
│   ├── proxy.ts                 ← Auth gate (ver T03)
│   ├── login/                   ← Único punto sin auth obligatoria
│   ├── onboarding/              ← Crear restaurante por primera vez
│   ├── admin/                   ← Panel super-admin (NAV_ITEMS hardcoded en AdminShell)
│   ├── api/                     ← Endpoints internos (debug, invoices/uploads, seed-ops)
│   ├── actions/                 ← Server Actions agrupadas por dominio (ver T06)
│   ├── financial-control/       ← Hub financiero con 4 tabs lazy-loaded
│   ├── reports/                 ← Mesa de revision de informes profesionales
│   ├── consultant/              ← Mesa interna del consultor para entregas y solicitudes
│   ├── portal/                  ← Area cliente para informes publicados
│   ├── invoices/                ← Ingesta de facturas + OCR + review
│   ├── escandallos/             ← Hub UI (tabs: Recetas + Ingredientes)
│   ├── recipes/                 ← CRUD de fichas técnicas (editor full-screen)
│   ├── ingredients/             ← Catálogo maestro de ingredientes
│   ├── menu-engineering/        ← Análisis BCG (STAR/PLOWHORSE/PUZZLE/DOG)
│   ├── stock/                   ← Inventario + ventas diarias + entrada manual
│   ├── suppliers/               ← CRM proveedores + scorecard + items
│   ├── purchasing/              ← Analytics de compras + smart ordering
│   ├── desperdicios/            ← Waste log + deducción automática de stock
│   ├── staff/                   ← /employees, /schedule, /policies
│   ├── operational/             ← KPIs operativos + alertas + tareas pendientes
│   └── notifications/           ← Centro de notificaciones + reglas de alerta
├── components/                  ← UI agrupada por dominio + /ui (shadcn primitives)
├── config/navigation.ts         ← Definición del sidebar por grupos (CORE/OPERATIVA/ESTRUCTURA/PROVEEDORES)
├── hooks/                       ← useDebouncedValue, useMediaQuery, useRecipeCalculator
├── lib/                         ← financial-math, menu-engineering, fiscal-utils, cached-queries, logger, supabaseClient/Server, reporting, etc.
├── services/openai-vision.ts    ← Wrapper de GPT-4o para OCR
└── types/                       ← schema.ts (Zod) + supabase.ts (generados) + tipos por dominio
```

## Server vs Client Components

- **Server por defecto.** Las páginas (`page.tsx`) hacen fetch directo a Supabase con `createClient()` de `lib/supabaseServer.ts`.
- Componentes `'use client'`: editores, formularios, dropdowns con estado, gráficos Recharts (Recharts no es SSR-safe del todo).
- Patrón habitual: `page.tsx` (server) hace fetch y pasa props a `client.tsx` (client) que orquesta UI con estado.
- `React.cache()` se usa en `getCurrentRestaurant()` y en `cached-queries.ts` para deduplicar lecturas dentro de un mismo render.

## Layout y navegación

- **Root layout** (`src/app/layout.tsx`):
  - Llama `getCurrentRestaurant()` para obtener `restaurantId`, `restaurantName`, `active_addons`.
  - Renderiza `<BroadcastBanner>` arriba (anuncios del super-admin), `<AppLayout>` (sidebar + main) y `<ImpersonationBanner>` abajo si hay impersonación activa.
- **AppLayout** (`src/components/layout/AppLayout.tsx`):
  - Sidebar 288px expandido / 96px colapsado.
  - Mobile (<768px): sidebar oculto, hay drawer.
  - Tablet (768-1024px): auto-colapsa.
  - Rutas exentas (no muestran sidebar): `/login`, `/auth`, `/admin/*`, `/portal/*`, `/reports/print/*`.
- **Sidebar** filtra grupos por `active_addons`:
  - CORE siempre visible.
  - OPERATIVA si `active_addons.includes('operativa')`.
  - ESTRUCTURA si `active_addons.includes('personal')`.
  - PROVEEDORES si `active_addons.includes('proveedores')`.
  - Admins ven todo siempre.

## Convenciones de routing

- Una carpeta bajo `src/app/X/` = una ruta `/X`.
- Subrutas reales (con `page.tsx` propio): `/consultant`, `/reports`, `/reports/print/[draftId]`, `/portal`, `/portal/reports/[id]`, `/staff/employees`, `/staff/schedule`, `/staff/policies`, `/invoices/[id]/review`, `/menu-engineering/new`, `/menu-engineering/[id]`, `/recipes/[id]/edit`, `/recipes/new/edit`, `/suppliers/[id]`, `/purchasing/analytics`, y `/admin/*` (dashboard, restaurants, users, billing, audit, invoice-validation).
- Algunas "rutas" del sidebar son tabs internos (no URL): los 4 tabs de `/financial-control`, los 2 tabs de `/escandallos`, los 3 tabs de `/invoices`, los 2 tabs de `/notifications`.

## Multi-tenancy

- **Toda tabla operativa tiene `restaurant_id`** y políticas RLS (ver [T02](./T02-base-de-datos.md)).
- El `restaurant_id` **nunca viaja desde el cliente**. Se resuelve en server desde `getUserRestaurant()` / `getCurrentRestaurant()` (ver [T03](./T03-autenticacion.md) y [T06](./T06-server-actions-comunes.md)).
- Impersonación: cookies `httpOnly` `impersonated_restaurant_id` + `impersonated_restaurant_name` sobreescriben el restaurante real solo si el usuario es admin.

## Cacheo y revalidación

- Las actions de escritura llaman `revalidatePath()` con la ruta afectada. Habitualmente se incluye también `revalidatePath('/', 'layout')` para refrescar sidebar/balances en el layout.
- Para lecturas server-side compartidas en un render usar `cached-queries.ts` (`getDailySalesCached`, `getOperatingExpensesCached`, `getFiscalMetricsCached`).
- Para informes profesionales usar `src/lib/reporting/`: el motor es puro y recibe datos ya cargados; las lecturas multi-tenant viven en `src/app/actions/professional-reporting.ts`.

## Telemetría y logging

- `src/lib/logger.ts` expone `logger`, `createActionLogger(name)`, `dbLogger`, `apiLogger`, `jobLogger`, `PerformanceLogger`.
- En dev: pretty-print con colores. En producción: JSON estructurado.
- Logs redactan headers de auth y cookies.

## Operaciones no bloqueantes

- `src/lib/after.ts` + `src/lib/with-after.ts` implementan un patrón "server-after-nonblocking": el handler registra callbacks (analytics, cache warming) que se ejecutan después de devolver la respuesta HTTP.
- No bloquean el render. Sus errores se atrapan y loguean, no se relanzan.

## Tours de usuario

- `src/lib/tour-scenarios.ts` define 3 tours guiados con driver.js (`price-burger`, `log-purchase`, `analyze-sales`).
- El usuario los lanza desde el botón "Guía Interactiva" en el AppLayout.

## Estilo y design tokens

- `src/lib/design-tokens.ts`: spacing (4-64px en grid 8pt), tipografía, colores (verde primario #22c55e), border radius, shadow, transitions, z-index.
- `src/lib/financial-theme.ts`: paleta para gráficos financieros y categorías de gasto.

## Reglas duras al añadir rutas

1. Si la ruta lee datos del restaurante, debe llamar `getUserRestaurant()` o `getCurrentRestaurant()` en servidor.
2. Las mutaciones van por **server actions** (no por API routes salvo casos puntuales como uploads). Patrón: ver [T06](./T06-server-actions-comunes.md).
3. Si la ruta es operativa (no admin) y requiere onboarding, debe redirigir a `/onboarding` cuando no haya restaurante.
4. Si la ruta es solo admin, debe llamar `requireAdmin()` o `requireSuperAdmin()` antes de cualquier query.
5. Si la ruta debe aparecer/desaparecer según el plan, añadirla al filtro de grupos en `Sidebar.tsx` y referenciar el flag en `active_addons`.

## Cosas no obvias

- El README dice "Next.js 15" pero `package.json` usa Next.js 16. La realidad manda.
- `npm run build` usa `scripts/run-next-build.mjs` para forzar `NODE_ENV=production` desde el propio comando. Esto evita fallos de prerender cuando la terminal local hereda `NODE_ENV=development`.
- `npm run typecheck` usa `tsconfig.typecheck.json`, que excluye `.next/dev/**`. Next 16 puede volver a añadir `.next/dev/types/**/*.ts` al `tsconfig.json` durante `next build`, pero el gate de TypeScript no debe depender de artefactos de `next dev`.
- `npm run verify` ejecuta los gates principales en secuencia: typecheck, lint estricto, tests y build. Evita lanzar `npm test` y `npm run build` en paralelo porque JSDOM + Next build compiten por CPU/memoria y pueden provocar timeouts espurios en tests de componentes.
- Vitest usa `testTimeout=10000` para dar margen realista a tests React/JSDOM bajo carga. Un timeout aislado sigue siendo fallo a investigar; no se debe ocultar subiendo tiempos por test sin entender la causa.
- `eslint.config.mjs` usa la configuración flat nativa de `eslint-config-next` y excluye artefactos generados/no relevantes como `test-bundle.js`.
- `src/app/error.tsx` y `src/app/global-error.tsx` deben ser autocontenidos. No importes componentes UI internos ni iconos externos allí: si el boundary falla compilando, oculta la causa original y deja la app sin pantalla de error fiable.
- Hay docs viejos en `docs/` (`ARCHITECTURE.md`, `FEATURES.md`, etc.) que pueden estar desactualizados. **No se modifican.** Cuando sirvan, verificar contra el código.
- El root layout importa el componente `getActiveBroadcasts` en cada render (sin caché) — todo render del layout consulta la tabla `broadcasts`.
- Hay una tabla `staff` legacy duplicada con `employees`. Las páginas actuales usan `employees`.
