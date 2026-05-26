# T06 — Server actions: convenciones y patrón

> Transversal. Todas las mutaciones del producto pasan por aquí. Saltarse este patrón abre vulnerabilidades de multi-tenancy.

## Dónde viven

Todas en `src/app/actions/`, una carpeta plana (sin subcarpetas) con archivos por dominio:

| Archivo | Dominio |
|---------|---------|
| `safe-action.ts` | Wrapper estándar (validación + auth + error handling). |
| `validation.ts` | Validación de items en facturas (`confirmValidation`, `skipValidation`, `createAndMapIngredient`). |
| `utils.ts` | `getUserRestaurant()` — resolución central del `restaurant_id`. |
| `user.ts` | `getCurrentRestaurant()` (con `React.cache`). |
| `admin.ts`, `admin-queries.ts`, `admin-billing.ts` | Operaciones del super-admin. |
| `impersonate.ts` | Start/stop impersonación. |
| `broadcasts.ts` | Anuncios globales (super-admin). |
| `dashboard.ts` | Datos agregados para dashboards. |
| `financial-control.ts` | Ventas diarias, gastos, presupuestos, métricas fiscales, dashboard de gastos. |
| `financial-diagnosis.ts` | Diagnóstico financiero del ExecutiveDashboard. |
| `financial-engine.ts` | Motor de cálculo y proyecciones. |
| `recipes.ts`, `saveRecipe.ts` | CRUD de recetas (saveRecipe es RPC atómico aparte). |
| `ingredients.ts` | Master ingredients (crear, precio, merma, soft delete, import). |
| `menu-engineering.ts` | Reportes BCG. |
| `invoices.ts`, `review-invoice.ts`, `auto-dispute.ts` | OCR, review y disputa. |
| `stock-actions.ts` | Inventario, ventas diarias por receta, entradas manuales. |
| `suppliers.ts`, `supplierItems.ts`, `supplier-mapping.ts`, `supplier-scorecard.ts` | CRM y scorecard de proveedores. |
| `purchase-analytics.ts`, `smart-ordering.ts`, `price-alerts.ts` | Analytics de compras. |
| `staff.ts`, `staff-actions.ts`, `staff-optimization.ts` | Equipo, turnos, optimización. |
| `operational.ts` | KPIs operativos. |
| `alerts.ts` | Sistema de notificaciones y reglas. |
| `waste-actions.ts` | Logging de mermas. |
| `impuestos.ts` | IVA / IRPF trimestres. |
| `resultados.ts` | Cierre y resultados mensuales. |
| `benchmarking.ts` | Benchmark de mercado. |
| `policy-actions.ts` | Políticas internas. |
| `contracts.ts` | Contratos con proveedores. |
| `billing.ts`, `billing-config.ts` | Billing usuario. |
| `seed-financial-data.ts`, `seed-sales.ts`, `seed-sales-robust.ts`, `seed-shifts-robust.ts`, `seed-professional-report-demo.ts` | Datos de prueba/demo. |
| `inventory.ts` | Sesiones de conteo físico, guardado de conteos, informe de consumo. |
| `ai-insights.ts` | Persistencia de informes narrativos IA por módulo y período. |
| `professional-reporting.ts` | Lectura multi-fuente, versionado y exportacion imprimible de informes profesionales. |

## Patrón estándar de una action

```ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'
import { getUserRestaurant } from './utils'

const InputSchema = z.object({
  date: z.string(),
  amount: z.number(),
})

export async function upsertOperatingExpense(
  input: z.infer<typeof InputSchema>
) {
  const restaurant = await getUserRestaurant()
  if (!restaurant) return { success: false, error: 'No restaurant' }

  const parsed = InputSchema.parse(input)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operating_expenses')
    .upsert({ ...parsed, restaurant_id: restaurant.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/financial-control')
  revalidatePath('/', 'layout')
  return { success: true, data }
}
```

Pasos:

1. **`'use server'`** al inicio del archivo.
2. **Schema Zod** define el input esperado.
3. **`getUserRestaurant()`** resuelve el `restaurant_id` server-side. **Nunca aceptar `restaurant_id` desde el cliente.**
4. **`parse()`** lanza si el input no encaja con el schema (manejarlo o dejar que se propague).
5. **`createClient()`** server (cookies del request).
6. **Operación Supabase**. Si retorna `error`, devolver `{ success: false, error: error.message }`.
7. **`revalidatePath()`** para invalidar caché de Next.js. Generalmente la ruta de la página y `'/', 'layout'` para refrescar sidebar/balances en el layout.
8. **Retornar `{ success: true, data }`** (contrato `ActionResponse<T>`).

## `safe-action.ts`

Wrapper que encadena los pasos 3, 4 y 7 automáticamente. Define:

- `executeSafeAction({ schema, action })` — versión utilitaria. Hace validación + auth + try/catch.
- `safeAction(schema, handler)` — factory que devuelve la action con `restaurant_id` inyectado en el contexto del handler.

Contrato de respuesta:

```ts
type ActionResponse<T> = {
  success: boolean
  data?: T
  error?: string
}
```

**Cuándo usarlo:** mutaciones simples sin lógica especial. Para flujos complejos con varios pasos, mejor escribir la action a mano siguiendo el patrón pero sin el wrapper.

## Convenciones de naming

- **Lecturas:** `get*`, `fetch*`. Ej: `getDailySales`, `getRecipes`, `getSupplierItems`.
- **Escrituras:** `upsert*`, `create*`, `update*`, `delete*`. Ej: `upsertDailySales`, `createSupplier`, `updateInvoice`, `deleteRecipe`.
- **Agregaciones complejas:** sufijo `Data`. Ej: `getExpenseDashboardData`, `getResultsDashboardData`.
- **Informes profesionales:** `getProfessionalReportDraft(period)` carga datos del restaurante activo, incluido el snapshot BCG `ANALYZED` si existe para el periodo, y delega el cálculo a `src/lib/reporting/`.
- **Versiones de informes:** `saveProfessionalReportDraft({ period, narrativeOverrides, status })` regenera el informe en servidor y crea un snapshot nuevo en `professional_report_drafts`.
- **Historial/exportacion:** `getProfessionalReportDraftHistory(period)`, `getSavedProfessionalReportDraft(id)` y `markProfessionalReportDraftExported(id)` siempre filtran por restaurante activo.
- **Seed demo reporting:** `seedProfessionalReportDemoData()` resuelve el restaurante en servidor y solo debe usarse como herramienta QA/dev; no acepta `restaurant_id`.
- **Toggles:** `toggle*`. Ej: `toggleRestaurantModule`, `toggleEmployeeStatus`.
- **Acciones del super-admin:** prefijo `admin` en el archivo (`admin-billing.ts`) y nombres como `changeRestaurantPlan`, `adjustCredits`, `registerPayment`.

## Resolución del `restaurant_id`

`getUserRestaurant()` en `src/app/actions/utils.ts`:

1. `auth.getUser()` → user.
2. Si es admin con cookie de impersonación → ese restaurante.
3. `restaurants.owner_id = user.id`.
4. Fallback `user.user_metadata.restaurant_id`.
5. Null si nada.

**Regla:** ninguna action acepta `restaurant_id` como argumento del cliente. Siempre se resuelve aquí. Las acciones de admin que necesitan apuntar a otro restaurante (`updateUserRestaurant`, `toggleRestaurantModule`, etc.) reciben el `restaurant_id` como argumento **explícito** pero **solo se llaman desde rutas protegidas con `requireAdmin()`**.

## Manejo de errores

- **Validación Zod** → si quieres mensaje limpio al cliente, atrapa `ZodError` y mapea a `error: 'Validation failed: <field>'`.
- **Errores Supabase** → devolver `error.message`. No exponer `error.details` al cliente (puede revelar PII).
- **Errores inesperados** → `try/catch` general, loguear con `logger.error({ err, action: 'X' })`, devolver `{ success: false, error: 'Internal error' }`.
- **Idempotencia** → si la action puede recibirse 2 veces (uploads, formularios), usar `idempotency_key` (tablas `invoices`, `operating_expenses` ya tienen la columna).

## Revalidación

Llamar `revalidatePath()` con la ruta afectada después de cualquier mutación que cambie datos visibles. Patrones comunes:

- Mutaciones en finanzas: `revalidatePath('/financial-control')`, `revalidatePath('/')`.
- Mutaciones en recetas/ingredientes: `revalidatePath('/recipes')`, `revalidatePath('/ingredients')`, `revalidatePath('/escandallos')`.
- Mutaciones de admin: `revalidatePath('/admin/...')` + `revalidatePath('/', 'layout')` para refrescar el sidebar de los usuarios afectados.

**Truco:** `revalidatePath('/', 'layout')` invalida el layout root, refrescando navegación, banner y addons activos.

## Operaciones atómicas (RPC)

Algunas mutaciones requieren atomicidad multi-fila:

| RPC | Llamada desde | Qué hace |
|-----|---------------|----------|
| `upsert_recipe_with_ingredients` | `saveRecipe()` | Upsert de receta + reemplaza filas de `recipe_ingredients`. |
| `process_daily_sales_atomic` | `processRecipeSales()` | Explota recetas vendidas, deduce stock, registra `stock_movements`. |
| `increment_inventory_stock` | varios | Suma/resta stock con check de no-negativos. |
| `admin_list_users`, `admin_update_user_restaurant`, `admin_delete_restaurant_cascade`, `admin_get_system_health` | acciones admin | Operaciones que requieren bypass de RLS y consistencia. |

**Regla:** si una mutación toca >1 fila y la inconsistencia parcial sería un bug, usa RPC.

## Operaciones no bloqueantes

Para tareas accesorias (analytics, cache warming, logging extra), envolver con `withServerAfterAction` (ver [T05](./T05-hooks-y-providers.md)). Ejemplo: tras `processInvoice`, dispara recomputo de scorecard de proveedor en `after()`.

## Reglas duras

1. **Nunca** aceptar `restaurant_id` desde el cliente en una action operativa.
2. **Siempre** validar input con Zod.
3. **Siempre** retornar `{ success, data?, error? }`. El cliente no debe hacer try/catch contra excepciones de server actions.
4. **Siempre** `revalidatePath()` tras escritura, al menos la ruta de la página afectada.
5. Mutaciones admin: `requireAdmin()` o `requireSuperAdmin()` al inicio.
6. Si vas a tocar varias filas con dependencia, usa RPC (atómico). No encadenes `await`s individuales.
7. Logs con `logger`, no con `console`.
8. `'use server'` siempre al tope del archivo (no por función).

## Cosas no obvias

- Algunos archivos tienen funciones helper internas no exportadas (`groupExpensesByCategory`, `calculateCategoryRatios`). No las expongas a menos que las necesites desde otro dominio.
- `saveRecipe.ts` está en archivo aparte porque su RPC es complejo y conviene aislarlo.
- `seed-*.ts` solo se usan en endpoints de seed como `/api/seed-ops` o `/api/seed-reporting-demo` (solo dev / staging). No deben llamarse desde UI normal.
- `safe-action.ts` no se usa universalmente — coexiste con actions escritas a mano siguiendo el mismo patrón pero sin el wrapper. No fuerces migración masiva si no es necesario.
- Cuidado al revalidar `/`: revalida el dashboard, no el layout. Para invalidar el layout (y la navegación) usa `revalidatePath('/', 'layout')`.
