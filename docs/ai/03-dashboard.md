# 03 — Dashboard (raíz `/`)

**Ruta:** `/`
**Archivos clave:** `src/app/page.tsx`, `src/components/dashboard/UnifiedDashboard.tsx`, `src/components/dashboard/ExecutiveDashboard.tsx`
**Transversales relacionados:** [T03](./T03-autenticacion.md), [T04](./T04-financial-math.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito y rol en el negocio

Centro de comando del restaurante. Primera vista al entrar (para usuarios no-admin). Consolida ventas, gastos, métricas fiscales y diagnóstico estratégico del mes en curso. Permite ver "cómo va el restaurante" sin clicar en submódulos.

## 2. Viaje del usuario

1. Usuario logueado abre `/`.
2. Middleware decide:
   - Si es admin → redirect a `/admin`.
   - Si no tiene restaurante → redirect a `/onboarding`.
3. La página server fetchea en paralelo: ventas diarias, gastos operativos y métricas fiscales del mes actual (o del rango `?from=...&to=...`).
4. Ve `UnifiedDashboard` que combina:
   - **Vista estratégica** (`ExecutiveDashboard`): diagnóstico financiero, pulse, eficiencia del personal.
   - **Hub financiero** (`CFOOverview` y similares): KPIs (revenue total, gastos, profit neto, prime cost, labor cost, COGS).
5. Puede cambiar el rango de fechas con `DashboardDatePicker` (top-right). Eso actualiza la URL con `?from=&to=` y recarga el server component.
6. Cada KPI suele tener drill-down o link al módulo correspondiente (`/financial-control` con la fecha aplicada).

## 3. Flujo técnico de datos

**Lectura (paralela en server, `Promise.all`):**

```ts
getDailySalesRange(restaurant.id, fromDate, toDate)
getOperatingExpenses(restaurant.id, fromDate, toDate)
getFiscalMetrics(restaurant.id, fromDate, toDate)
```

Cálculos en el page:
- `totalRevenue = Σ revenue_total`.
- `totalExpenses = Σ amount` (puede ser negativo).
- `netProfit = totalRevenue - totalExpenses`.
- `laborCost = Σ amount` de gastos en `EXPENSE_GROUPS.PERSONAL`.
- `costOfGoods = Σ amount` de gastos en `EXPENSE_GROUPS.COGS`.
- `primeCost = laborCost + costOfGoods`.

**Componentes hijo:**
- `UnifiedDashboard` (client): orquesta vistas y picker de fechas.
- `ExecutiveDashboard` (server): hace su propio fetch de diagnóstico, pulse, eficiencia staff.
- `CFOOverview` (client): KPIs principales con tooltips.

**Escritura:** ninguna desde esta página. Es solo lectura.

## 4. Reglas de negocio y restricciones

- **Solo no-admins llegan aquí.** Admins son redirigidos a `/admin` (hardcoded en `page.tsx:23-28` y en middleware).
- **Default de fechas:** mes calendario actual (`startOfMonth(now)` a `endOfMonth(now)`).
- **Sin restaurante → onboarding.** No se renderiza nada antes.
- Revenue se prioriza desde `daily_sales.revenue_total`. Si está vacío, se reconstruye desde IVA breakdown o canales (ver lógica en `actions/financial-control.ts`).
- **`operating_expenses.amount` puede ser negativo** (correcciones de inventario). Los cálculos lo asumen.

## 5. Dependencias e implicaciones cruzadas

- **Tablas que toca (lectura):** `daily_sales`, `operating_expenses`, `monthly_targets`, `monthly_results`, varios para diagnóstico.
- **Otras páginas afectadas si esto cambia:**
  - `/financial-control` — comparte fuentes y conceptos; cambios de cálculo deben reflejarse en ambas.
  - `/admin` — los admins NO ven este dashboard, pero los KPIs de admin tienen sus propios cálculos similares.
- **Transversales:**
  - [T04](./T04-financial-math.md) — toda fórmula de prime cost, márgenes, ratios viene de allí.
  - [T06](./T06-server-actions-comunes.md) — actions `getDailySalesRange`, `getOperatingExpenses`, `getFiscalMetrics`.

## 6. Casos límite y errores conocidos

- **Mes sin ventas:** KPIs salen en 0. Permite navegar a otros meses con el datepicker.
- **Gastos categorizados como `OTROS`:** se incluyen en `totalExpenses` pero no en `prime cost` (no son ni labor ni COGS).
- **Gastos negativos:** restan al total. Si solo hay correcciones negativas, `netProfit > totalRevenue` (engañoso pero válido).
- **Sin presupuesto mensual:** algunos widgets muestran "Configurar" y abren modal en `/financial-control`.
- **Primer día del mes:** algunos drill-downs (BillingDrillDownModal) desactivan comparativas (`isFirstDay`).
- **Rangos cruzando meses:** los cálculos suman todo dentro del rango; las métricas fiscales (IVA) se prorratean por mes natural.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer [T04](./T04-financial-math.md) si vas a cambiar cualquier cálculo.
- Confirmar qué KPI nuevo aporta info que no esté ya. Evita duplicar.

**Archivos que suelen cambiar a la vez:**
- `src/components/dashboard/UnifiedDashboard.tsx` — layout.
- `src/components/dashboard/ExecutiveDashboard.tsx` — vista estratégica.
- `src/components/dashboard/CFOOverview.tsx` — bloque CFO.
- `src/app/actions/financial-control.ts` — si añades nueva métrica que requiere fetch.
- `src/app/actions/financial-diagnosis.ts` — diagnóstico.

**Si añades un KPI nuevo:**
1. Definir la fórmula en `src/lib/financial-math.ts` o `financial-utils.ts`.
2. Exponer una action de lectura (o reusar `getDailySalesRange` si los datos crudos ya están).
3. Pasarla a `UnifiedDashboard` como prop.
4. Renderizar el card; añadir tooltip explicativo.
5. Confirmar que el cálculo funciona también desde `/financial-control` si aparece allí.

**Qué probar manualmente:**
- Carga con datos completos (mes con ventas y gastos) → todos los KPIs > 0.
- Mes sin datos → KPIs en 0, sin crashes.
- Cambiar fecha con datepicker → URL cambia, datos refrescados.
- Cuenta admin → debe redirigir a `/admin`, NO ver este dashboard.
- Cuenta nueva sin restaurante → debe redirigir a `/onboarding`.
- Verificar que el sidebar siempre muestra CORE.
- Drill-down de un KPI → llevar a `/financial-control` con la fecha correcta en la URL.

**Cambios delicados:**
- Cambiar el default de fechas (mes actual) puede romper bookmarks y bookmarks compartidos.
- Cambiar la fórmula de un KPI sin actualizar la documentación visible en tooltips genera desconfianza.
