# Prompt para Codex — Fase 20: Pulido técnico post-auditoría

## Contexto del proyecto

App SaaS de finanzas para restaurantes (Next.js 15 / Supabase / TypeScript).
492 tests verdes, build limpio, 0 console.* en actions, logger Pino estructurado.
Esta fase es limpieza técnica pura — **no se añade funcionalidad nueva.**

## Objetivo

Resolver deuda técnica menor acumulada en 5 ejes. El criterio es: cada cambio debe ser verificable con `npm run build` + `npm test` sin romper nada.

---

## Eje 1: Eliminar `as any` y `@ts-expect-error` evitables

### 1A: `src/components/financial-control/ExpenseDonutChart.tsx` línea 79

```typescript
// ACTUAL
const label = (EXPENSE_TAGS as any)[selectedCategory]?.[tagKey] || tagKey

// CORRECTO: EXPENSE_TAGS tiene tipo Record con keys literales. Tipar el acceso:
type ExpenseTagCategory = keyof typeof EXPENSE_TAGS
const tags = selectedCategory in EXPENSE_TAGS
  ? EXPENSE_TAGS[selectedCategory as ExpenseTagCategory]
  : undefined
const label = tags?.includes(tagKey as never) ? tagKey : tagKey
```

Revisar `src/types/schema.ts` líneas 365-368 para ver la forma exacta de `EXPENSE_TAGS` y escribir un type guard que evite el `as any`.

### 1B: `src/app/suppliers/[id]/page.tsx` línea 48

```typescript
// ACTUAL
initialItems={items as any}
```

El problema es que `getSupplierItems()` devuelve un tipo de Supabase que no coincide exactamente con la interfaz `SupplierItem` de `SupplierItemsTable`. Solución: crear un mapper explícito o ajustar la interfaz `SupplierItem` del componente para que acepte el tipo real de Supabase. **No inventar datos — leer el tipo de retorno de `getSupplierItems()` y alinearlo.**

### 1C: `src/app/actions/dashboard.ts` línea 156

```typescript
// ACTUAL
// @ts-expect-error - Join type
```

Este es un join de Supabase donde el tipo inferido no coincide. Solución: crear un tipo explícito para el resultado del join o usar `.returns<TipoEsperado>()`.

### 1D: `src/components/ingredients/IngredientDialog.tsx` línea 114

```typescript
// ACTUAL
// @ts-expect-error - legacy prop
```

Investigar qué prop está causando el error y resolverlo: o el prop ya no existe (eliminar) o necesita tipado correcto.

### ⚠️ NO TOCAR los 3 `zodResolver() as any`

Los `as any` en `MonthlyTargetForm.tsx`, `ExpensesFormModal.tsx` y `ExpensesManager.tsx` son un workaround documentado de incompatibilidad `react-hook-form` + `@hookform/resolvers` + Zod v4. Dejarlos como están con su comentario `eslint-disable`.

---

## Eje 2: Dividir componentes > 800 líneas

### 2A: `EngineeringMatrix.tsx` (944 líneas)

Este es el componente más grande del proyecto. Dividir en:

| Archivo nuevo | Contenido |
|---|---|
| `EngineeringMatrix.tsx` | Orquestador: layout principal, state management, data loading. Máx ~300 líneas. |
| `EngineeringMatrixChart.tsx` | Visualización del gráfico BCG/matriz. |
| `EngineeringMatrixTable.tsx` | Tabla de datos de ítems con sorting/filtering. |
| `EngineeringMatrixFilters.tsx` | Controles de filtro y periodo (si existen como bloque cohesivo). |

**Antes de dividir**, leer el archivo completo y identificar bloques cohesivos. No dividir por número de líneas — dividir por responsabilidad.

### 2B: `ResultadosDashboard.tsx` (913 líneas)

Dividir en:

| Archivo nuevo | Contenido |
|---|---|
| `ResultadosDashboard.tsx` | Orquestador con tabs/layout. Máx ~300 líneas. |
| `ResultadosSummaryCards.tsx` | KPIs y cards de resumen. |
| `ResultadosCharts.tsx` | Gráficos del dashboard. |
| `ResultadosTable.tsx` | Tabla de detalle (si existe). |

### Reglas para dividir componentes

1. **Cada archivo resultante < 500 líneas**, idealmente < 400.
2. **Props tipadas explícitamente** — nada de `any` en las interfaces de comunicación entre componentes.
3. **El componente padre pasa datos, los hijos renderizan.** No al revés.
4. **Los imports existentes del componente original deben seguir funcionando.** Si otros archivos importan `EngineeringMatrix`, exportar desde el mismo path.
5. **No cambiar comportamiento visual ni lógico.**
6. Componentes entre 600-800 (InvoiceReviewForm 673, FinancialSimulator 647, DesarrolloNegocio 558, ShiftBoard 548, BillingManager 544) **no dividir en esta fase** — solo documentar como candidatos futuros.

---

## Eje 3: Extraer capa de queries de `portal.ts` (503 líneas)

`src/lib/portal.ts` mezcla queries a Supabase con lógica de negocio. Separar en:

| Archivo | Contenido |
|---|---|
| `src/lib/portal.ts` | Funciones públicas que orquestan: llaman a queries, aplican lógica, devuelven resultado. |
| `src/lib/portal-queries.ts` | Funciones internas que ejecutan queries a Supabase: `fetchPublishedReportsForRestaurant()`, `fetchReportDetailForRestaurant()`, `fetchMeetingRequestsForRestaurant()`, etc. |

**Patrón:**

```typescript
// portal-queries.ts
export async function fetchPublishedReports(restaurantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('professional_report_drafts')
    .select(...)
    .eq('restaurant_id', restaurantId)
    // ...
  return { data, error }
}

// portal.ts
import { fetchPublishedReports } from './portal-queries'

export async function getPublishedReportsForRestaurant(restaurantId: string) {
  const { data, error } = await fetchPublishedReports(restaurantId)
  if (error || !data) return { success: false, error: '...' }
  // ... lógica de negocio, mapping, enrichment
  return { success: true, data: mapped }
}
```

**Objetivo:** `portal.ts` baja de 503 a ~250, `portal-queries.ts` tiene ~250. Ninguno supera 400.

---

## Eje 4: Helper de respuesta para actions

En `consultant.ts` (y otros archivos) el patrón `return { success: false, error: '...' }` se repite docenas de veces. Crear un helper:

```typescript
// src/app/actions/action-result.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function fail(error: string): ActionResult<never> {
  return { success: false, error }
}
```

**Después**, refactorizar `consultant.ts` para usar `ok(data)` y `fail('mensaje')` en lugar de los objetos literales. Esto:
- Reduce verbosidad.
- Garantiza consistencia del tipo de retorno.
- Facilita búsqueda de errores.

**Aplicar solo en `consultant.ts` como piloto.** No refactorizar todos los actions files — eso es para una fase futura.

---

## Eje 5: Limpiar `eslint-disable` innecesarios

De los 13 `eslint-disable` en src/:

| Archivo | Regla deshabilitada | Acción |
|---|---|---|
| `MonthlyTargetForm.tsx` | `@typescript-eslint/no-explicit-any` | **MANTENER** — zodResolver workaround |
| `ExpensesFormModal.tsx` (x2) | `@typescript-eslint/no-explicit-any` | **MANTENER** — zodResolver workaround |
| `ExpensesManager.tsx` | `@typescript-eslint/no-explicit-any` | **MANTENER** — zodResolver workaround |
| `ExpenseDonutChart.tsx` | `@typescript-eslint/no-explicit-any` | **ELIMINAR** tras fix del Eje 1A |
| `suppliers/[id]/page.tsx` | `@typescript-eslint/no-explicit-any` | **ELIMINAR** tras fix del Eje 1B |
| `portal/layout.tsx` | `@next/next/no-img-element` | **MANTENER** — logo del consultor, legítimo |
| `ExpenseDetailTable.tsx` | Investigar cuál | **INVESTIGAR** — si es evitable, eliminar |
| `DesarrolloNegocio.tsx` | Investigar cuál | **INVESTIGAR** — si es evitable, eliminar |
| `smart-number-input.tsx` | Investigar cuál | **INVESTIGAR** — si es evitable, eliminar |
| `BCGMatrixChart.tsx` | Investigar cuál | **INVESTIGAR** — si es evitable, eliminar |
| `InvoiceReviewForm.tsx` | Investigar cuál | **INVESTIGAR** — si es evitable, eliminar |
| `ProfessionalReportPrintDocument.tsx` | Investigar cuál | **INVESTIGAR** — si es evitable, eliminar |

Para cada "INVESTIGAR": leer el `eslint-disable`, entender por qué se puso, y resolver si es posible sin cambiar comportamiento. Si no es posible, documentar con un comentario más específico que explique por qué.

---

## Orden de ejecución

1. **Eje 4** — Crear `action-result.ts` helper (0 riesgo, mejora legibilidad).
2. **Eje 1** — Eliminar `as any` y `@ts-expect-error` (cambios quirúrgicos).
3. **Eje 3** — Extraer `portal-queries.ts` (mover código, no cambiar lógica).
4. **Eje 2** — Dividir `EngineeringMatrix` y `ResultadosDashboard` (refactor grande).
5. **Eje 5** — Limpiar `eslint-disable` (después de que los otros ejes resuelvan los problemas subyacentes).
6. **Build + tests finales.**

## Reglas técnicas obligatorias

1. **No cambiar comportamiento.** Ni visual, ni lógico, ni tipos públicos.
2. **Los 492 tests deben pasar sin modificar assertions.**
3. **Cada eje debe dejar `npm run build` limpio antes de pasar al siguiente.**
4. **No dividir componentes que no estén explícitamente listados.**
5. **No tocar los 3 zodResolver `as any`** — son workaround documentado.
6. **No añadir funcionalidad nueva.**

## Commits esperados

1. `refactor: add ActionResult helper for consistent action responses`
2. `fix: eliminate as-any and ts-expect-error suppressions`
3. `refactor: extract portal query layer from portal.ts`
4. `refactor: split oversized EngineeringMatrix and ResultadosDashboard components`
5. `fix: clean unnecessary eslint-disable comments`

## Verificación final

```bash
# Build limpio
npm run build

# Tests verdes
npm test

# Verificar que no quedan as any evitables
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v "zodResolver" | grep -v node_modules | grep -v ".test."

# Verificar que no quedan archivos > 800 líneas en componentes
find src/components -name "*.tsx" -exec wc -l {} + | sort -rn | head -5

# Verificar portal.ts bajó de tamaño
wc -l src/lib/portal.ts src/lib/portal-queries.ts

# Verificar eslint-disable reducidos
grep -rc "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v ":0$" | sort -t: -k2 -rn
```

## Archivos clave a leer antes de empezar

- `src/components/menu-engineering/EngineeringMatrix.tsx` — 944 líneas, el más grande.
- `src/components/financial-control/ResultadosDashboard.tsx` — 913 líneas.
- `src/lib/portal.ts` — 503 líneas, mezcla queries + lógica.
- `src/app/actions/consultant.ts` — 410 líneas, patrón verboso repetido.
- `src/types/schema.ts` líneas 365-368 — EXPENSE_TAGS para resolver el `as any`.
- `src/components/suppliers/SupplierItemsTable.tsx` — interfaz SupplierItem para alinear tipo.
- `src/app/actions/dashboard.ts` línea 156 — @ts-expect-error en join.
- `src/components/ingredients/IngredientDialog.tsx` línea 114 — @ts-expect-error legacy.
