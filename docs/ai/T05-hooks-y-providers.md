# T05 — Hooks, providers y código compartido

> Transversal. Antes de duplicar una utilidad, mira si ya está aquí.

## Hooks personalizados (`src/hooks/`)

| Hook | Firma | Uso típico |
|------|-------|------------|
| `useDebouncedValue<T>(value: T, delay = 300): T` | Generic | Inputs de búsqueda en tablas grandes (`SupplierTable`, `IngredientsTable`, `RecipesClientPage`). Evita refetch/re-render por keystroke. |
| `useMediaQuery(query: string): boolean` | — | Detectar breakpoints (`(max-width: 768px)`). Lo usa `AppLayout` para el auto-collapse de sidebar en tablet. |
| `useRecipeCalculator(initialData)` | Objeto complejo | State management del editor de recetas. Retorna `{ ingredients, scaledIngredients, addIngredient, removeIngredient, updateIngredient, metrics: { totalCost, laborCost, primeCost, calculatedMargin, suggestedPrice } }`. |

**Regla:** si tu componente necesita un cálculo derivado de receta, no rehagas el cálculo — usa `useRecipeCalculator`.

## Providers (`src/components/providers/`)

### `MotionProvider`

Envuelve la app con `<LazyMotion features={domAnimation}>` (framer-motion).

- Baja el bundle de framer-motion de ~33KB a ~17KB (excluye SVG path animations y layout animations).
- Permite usar `m.div`, `m.section`, etc. en toda la app sin re-importar features.
- **Si añades animaciones SVG path o layout animations**, fallarán silenciosamente — necesitarías cambiar `domAnimation` por `domMax`, pero eso engorda el bundle. Evítalo si puedes.

## Cached queries (`src/lib/cached-queries.ts`)

Wrappers con `React.cache()` para deduplicar lecturas dentro de un mismo render server:

- `getDailySalesCached(restaurantId, startDate, endDate)`
- `getOperatingExpensesCached(restaurantId, startDate, endDate)`
- `getFiscalMetricsCached(restaurantId, startDate, endDate)`

**Cuándo usar:**
- En **server components** cuando los mismos datos los necesitan varios componentes hijos en el mismo árbol.

**Cuándo NO usar:**
- En client components.
- Si los datos cambian intra-render (no aplicable habitualmente).
- Si el rango de fechas es distinto cada vez (la caché es por args).

## Logger (`src/lib/logger.ts`)

Pino estructurado. Niveles: trace, debug, info, warn, error, fatal.

- `logger` — singleton global.
- `createActionLogger(actionName)` — logger con contexto (`requestId`, `action`).
- `dbLogger`, `apiLogger`, `jobLogger` — loggers especializados.
- `PerformanceLogger` — mide `elapsedMs`, permite `step()` tracking, captura errores con contexto.

Características:
- **En dev**: pretty-print con colores (vía `pino-pretty`).
- **En prod**: JSON estructurado para ingesta en log aggregators.
- **Redacción automática** de headers `authorization` y cookies.
- Timestamps en ISO 8601.

**Regla:** no uses `console.log` en código nuevo. Usa el logger. `console.error` está OK en catch blocks legacy pero migrar a `logger.error` cuando toques esos sitios.

## `after()` / `with-after.ts` — operaciones no bloqueantes

`src/lib/after.ts`:

- `after(callback)`: registra un callback para ejecutarse después de devolver la respuesta HTTP.
- `executeAfterCallbacks()`: dispara todos los registrados en paralelo. Atrapa errores sin relanzar.

`src/lib/with-after.ts`:

- `withServerAfterAction(handler)`: decorador para server actions. Ejecuta los `after()` callbacks tras devolver la respuesta.

**Casos de uso típicos:**
- Analytics / tracking de eventos.
- Cache warming.
- Logs no críticos.
- Recalculos asíncronos que no afectan a la respuesta inmediata.

**Regla:** todo lo que **NO** debe bloquear el render del cliente debe ir en `after()`. Para operaciones críticas (escribir invoice items, deducir stock) NO uses `after()`.

## Design tokens (`src/lib/design-tokens.ts`)

Sistema basado en grid 8pt:

- **Spacing:** 4, 8, 12, 16, 24, 32, 40, 48, 64 px.
- **Font size:** xs (12) → 5xl (48). Cada tamaño con su `line-height`.
- **Colors:** verde primario `#22c55e`, estados (success, warning, danger, info), neutros.
- **Border radius:** `none`, `sm`, `md`, `lg`, `xl`, `2xl`, `full` (9999).
- **Shadow:** sm → xl.
- **Transition:** fast (150ms), normal (200ms), slow (300ms).
- **Z-index:** 0, 10, 20, 30, 40, 50.

Helpers: `getSpacing()`, `getFontSize()`, `getColor('primary.500')`.

`src/lib/financial-theme.ts` — paleta para gráficos financieros y categorías de gasto (separada).

## Tour scenarios (`src/lib/tour-scenarios.ts`)

3 tours interactivos con driver.js:

| Tour | Recorrido |
|------|-----------|
| `price-burger` | Escandallo → costes → yield → margen → PVP. |
| `log-purchase` | Stock → factura → conciliación. |
| `analyze-sales` | Rango → ventas → prime cost → break-even. |

Cada tour: `{ id, title, description, module, difficulty, duration, steps: DriveStep[] }`.

Se inician desde el botón "Guía Interactiva" del AppLayout (`GuideSelector` → `TourGuide`).

## Export utils (`src/lib/export-utils.ts`)

Carga dinámica (lazy import) para no inflar bundle inicial:

- `exportExpensesToCSV()` — CSV con BOM UTF-8 para que Excel no rompa acentos.
- `exportPnLToPDF()` — P&L profesional con header coloreado, metric cards, tablas.
- `exportPnLToExcel()` — workbook con resumen.
- `exportMetricToPDF()` — KPI detallado con tabla de datos diarios.

Dependencias cargadas dinámicamente: `jspdf`, `jspdf-autotable`, `xlsx`, `file-saver`.

## Import utils (`src/lib/import-utils.ts`)

Parser CSV flexible (separador `,` o `;`), mapeo de unidades, validación.

- `parseCSV()` — detecta separador, maneja quoted strings.
- `validateIngredientsData()` — valida nombre, unidad, merma %, precio.
- `parseAllergens()` — convierte strings (separadas por coma) a IDs de la lista canónica.

Mapeo automático: `g` → `kg`, `ml` → `l`, `uds` → `u`, `botella` → `u`.

## Constants (`src/lib/constants.ts`)

`ALLERGENS` — array canónico de 14 alérgenos (gluten, crustáceos, huevos, pescado, cacahuetes, soja, lácteos, frutos secos, apio, mostaza, sésamo, sulfitos, altramuces, moluscos) con `id`, `label`, `emoji`.

## AppLayout (`src/components/layout/AppLayout.tsx`)

Layout principal:

- **Props:** `children`, `user?`, `activeAddons?`, `restaurantId?`, `restaurantName`.
- **Estado:** `collapsed` (sidebar), `isMobile` (<768px), `scenarioId` (tour activo).
- **Comportamiento:**
  - Sidebar 288px expandido / 96px colapsado.
  - Mobile (<768px): sidebar oculto, drawer disponible.
  - Tablet (768-1024px): auto-colapsa.
  - Rutas exentas (sin sidebar): `/login`, `/auth`, `/admin/*`.
- **Tours:** botón "Guía Interactiva" → `GuideSelector` → `TourGuide`.
- **Styling:** flex layout, transiciones smooth, fondo gradiente gastronómico.

`activeAddons` se pasa al `Sidebar` para filtrar grupos (ver [T03](./T03-autenticacion.md)).

## Supabase clients

| Archivo | Cuándo usar |
|---------|-------------|
| `src/lib/supabaseClient.ts` | Componentes `'use client'` — operaciones del navegador (login, signup, realtime). |
| `src/lib/supabaseServer.ts` | Server components y server actions — cliente con cookies del request. |

**Regla:** en server actions y page server components siempre `import { createClient } from '@/lib/supabaseServer'`. Nunca el client en server.

## Reglas duras

1. No reimplementes debounce o media query: usa los hooks.
2. No reimplementes formateo de moneda: usa `formatCurrency()` de `fiscal-utils.ts`.
3. No reimplementes export a PDF/Excel/CSV: ya hay utilidades cargadas dinámicamente.
4. No uses `console.*` en código nuevo. Usa `logger`.
5. Si una operación no afecta el render visible al cliente, métela en `after()`.
6. Si añades un design token nuevo, métele en `design-tokens.ts` para mantener coherencia.
