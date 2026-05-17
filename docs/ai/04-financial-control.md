# 04 — Financial Control

**Ruta:** `/financial-control`
**Archivos clave:** `src/app/financial-control/page.tsx`, `src/app/financial-control/client.tsx`, `src/app/actions/financial-control.ts`, `src/app/actions/resultados.ts`, `src/app/actions/impuestos.ts`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T04](./T04-financial-math.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito y rol en el negocio

Centro operativo financiero del día a día. Aquí el restaurador registra ventas diarias, gestiona gastos, define presupuestos, monitoriza impuestos y revisa resultados mensuales. Es la página de trabajo diaria del finance manager o dueño.

## 2. Viaje del usuario

1. Entra a `/financial-control` (opcionalmente con `?date=YYYY-MM-DD&view=facturacion`).
2. Layout con 4 pestañas (lazy-loaded con Suspense):
   - **FACTURACIÓN** (default): `DailySalesForm` (izq) + `MonthlyPerformanceWidget` (der).
   - **GASTOS**: `ExpensesDashboard` (KPIs, donut, tabla histórica, formulario modal).
   - **IMPUESTOS**: `ImpuestosDashboard` (IVA, IRPF, próximos vencimientos).
   - **RESULTADOS**: `ResultadosDashboard` (P&L, ratios, tendencias).
3. Menú flotante de tabs se puede bloquear/desbloquear para navegar sin perder cambios (Lock toggle).
4. **Registrar ventas del día:**
   - Selecciona fecha (default hoy).
   - Rellena: revenue_total o breakdown por base/IVA, breakdown por canal (dine-in/takeout/delivery), covers, labor hours.
   - Guarda → `upsertDailySales`.
5. **Registrar gasto:**
   - Modal "Nuevo Gasto" con categoría (15 valores), fecha, monto, método de pago, recurrencia, opcionalmente datos fiscales (base imponible, IVA, IRPF).
   - Guarda → `upsertOperatingExpense`.
6. **Configurar presupuesto mensual:** modal `MonthlyTargetForm`. Se abre automáticamente si es mes actual y no hay target.
7. **Drill-downs:** click en KPIs → `BillingDrillDownModal` o navegación a otra vista.

## 3. Flujo técnico de datos

**Lectura (en `page.tsx` server, en paralelo):**

```ts
getDailySales(restaurantId, date)
getOperatingExpenses(restaurantId, monthFrom, monthTo)
getBillingDashboardData(restaurantId, date)
getExpenseDashboardData(restaurantId, monthFrom, monthTo)
getResultsDashboardData(restaurantId, monthFrom, monthTo)
getMonthlyTarget(restaurantId, monthYear)
```

**Escritura:**
- `upsertDailySales(payload)` — INSERT/UPDATE en `daily_sales` con clave (restaurant_id, date).
- `upsertOperatingExpense(payload)` — UPSERT en `operating_expenses`. Soporta `idempotency_key`.
- `deleteOperatingExpense(id)`.
- `upsertMonthlyTarget(payload)` — `monthly_targets`.
- `closeMonthlyResults(monthYear)` — congela el mes en `monthly_results` con `is_closed=true, closed_by, closed_at`.

**Componente cliente principal:** `FinancialControlClient` (en `client.tsx`). Mantiene tab activo, modales, fecha local. Tabs se cargan con `Suspense + lazy`.

## 4. Reglas de negocio y restricciones

- **Día sin ventas:** se puede guardar `daily_sales` con `revenue_total=0` (cierre del día sin facturación).
- **`day_status`:** `OPEN` → `CLOSED` (cerrado por el usuario) → `LOCKED` (cerrado por cierre mensual, ya no editable).
- **Gastos negativos:** permitidos. Útiles para correcciones de inventario.
- **Categorías de gasto:** enum estricto de 15 valores agrupados en 4 (`PERSONAL`, `COGS`, `OPERATIONS`, `FINANCIAL`). Ver `EXPENSE_GROUPS` en `src/types/schema.ts`.
- **Modo profesional de factura:** flag `is_professional_invoice` activa campos fiscales (base, IVA, retención IRPF).
- **Presupuesto mensual:** solo uno por (restaurant_id, month_year). Si abre el mes actual y no existe, se sugiere crearlo.
- **Cierre mensual:** una vez `is_closed=true`, edits a ese mes deberían bloquearse. (Confirmar enforcement en UI — la lógica está en `resultados.ts`.)
- **IVA:** la app asume tipos españoles (10% para hostelería, 21% bebidas alcohólicas/etc.).

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `daily_sales`, `operating_expenses`, `monthly_targets`, `monthly_results` (lectura/escritura). Trigger `fn_audit_log_trigger` registra cambios en `audit_logs`.
- **Otras páginas afectadas:**
  - `/` — KPIs del dashboard salen de las mismas tablas.
  - `/invoices` — cuando se completa una factura, se inyectan gastos en `operating_expenses` automáticamente (categoría PROVEEDORES_COMIDA o PROVEEDORES_BEBIDA según tag).
  - `/staff/schedule` — `labor_cost` de `daily_sales` puede contrastarse con `shifts.estimated_cost`.
  - `/admin/audit` — todo cambio se ve allí.
- **Transversales:**
  - [T04](./T04-financial-math.md) — fórmulas de prime cost, ratios, márgenes, fiscal.
  - [T02](./T02-base-de-datos.md) — esquema, triggers, idempotencia.
  - [T06](./T06-server-actions-comunes.md) — patrón de actions.

## 6. Casos límite y errores conocidos

- **Día con `revenue_total` y breakdown desincronizados:** la action elige el máximo entre `revenue_total`, suma de bases IVA y suma de canales. Posibilidad de inconsistencia visible si el usuario rellena ambos sin sumar bien.
- **Gasto recurrente:** marcar `recurrence` no genera futuras filas automáticamente — es solo un metadato. Si quieres recurrencia real, hay que añadir un job/cron (no existe).
- **Duplicados por reintento:** mitigados con `idempotency_key` único. Si el cliente no lo envía, son posibles duplicados.
- **Trigger de auditoría:** cualquier UPDATE/DELETE deja huella en `audit_logs`. No se puede "deshacer silenciosamente".
- **Mes cerrado:** si pretendes editar `daily_sales` o `operating_expenses` de un mes en `is_closed=true`, la UI debería bloquearlo. Si no lo bloquea, es bug.
- **Tab por defecto:** abre FACTURACIÓN. Si quieres deep-link a otro tab, usa `?view=gastos|impuestos|resultados`.
- **`labor_cost` en `daily_sales` vs gastos PERSONAL:** son fuentes distintas. Para no double-contar, el dashboard usa una u otra — confirmar en `getResultsDashboardData`.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer [T04](./T04-financial-math.md) si tocas cálculos.
- Leer [T02](./T02-base-de-datos.md) si tocas esquema (añadir categoría, IVA nuevo, etc.).
- Mirar `client.tsx` para entender el orquestador y los modales.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/financial-control.ts` — actions de ventas y gastos.
- `src/app/actions/resultados.ts` — resultados mensuales y cierre.
- `src/app/actions/impuestos.ts` — métricas fiscales.
- `src/components/financial-control/*` — formularios y dashboards (30+ componentes).
- `src/types/schema.ts` — Zod schemas si añades campos.
- `src/lib/financial-math.ts` o `financial-utils.ts` — fórmulas.
- `migrations/*` — si añades columna.

**Qué probar manualmente:**
- Guardar venta del día con todos los campos → verificar en `/`.
- Guardar venta con `revenue_total=0` → debería permitirlo.
- Crear gasto en cada uno de los 15 categorías → ver que se agrupa correctamente.
- Crear gasto negativo → debe restar al total.
- Crear gasto profesional con IVA + IRPF → verificar `taxable_amount`, `tax_amount`, `withholding_amount` correctos.
- Crear presupuesto mensual → ver que el progreso vs objetivo se calcula bien.
- Eliminar un gasto → ver que se refleja en KPIs.
- Cambiar mes en datepicker → datos se refrescan.
- Cerrar un mes → confirmar que aparece `is_closed=true` en `monthly_results` y que UI bloquea ediciones (si lo hace).

**Si añades una nueva categoría de gasto:**
1. Añadirla al enum `OperatingExpenseCategorySchema` en `src/types/schema.ts`.
2. Añadirla a `EXPENSE_GROUPS`, `EXPENSE_CATEGORY_LABELS`, `EXPENSE_CATEGORY_ICONS`.
3. Si pertenece a PERSONAL o COGS, los KPIs de prime cost la incluirán automáticamente.
4. Migración SQL: extender el `CHECK` constraint si lo hay.
5. Actualizar [T02](./T02-base-de-datos.md).

**Si añades un tipo de IVA o IRPF:**
1. `OperatingExpenseSchema` ya tiene `tax_rate` libre. No requiere migración salvo si añades campos nuevos.
2. Actualiza `fiscal-utils.ts` si afecta a cálculo de trimestres.
3. Actualiza `ImpuestosDashboard` para que muestre el nuevo tramo.
