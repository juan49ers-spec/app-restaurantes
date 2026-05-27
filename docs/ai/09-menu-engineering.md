# 09 — Menu Engineering (Ingeniería de Menú)

**Ruta:** `/menu-engineering` (+ `/menu-engineering/new`, `/menu-engineering/[id]`)
**Archivos clave:** `src/app/menu-engineering/page.tsx`, `src/app/menu-engineering/[id]/page.tsx`, `src/app/menu-engineering/new/page.tsx`, `src/app/actions/menu-engineering.ts`, `src/lib/menu-engineering.ts`, `src/components/menu-engineering/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T04](./T04-financial-math.md)

## 1. Propósito y rol en el negocio

Analizar la rentabilidad y popularidad de los platos del menú para tomar decisiones estratégicas: qué mantener, qué subir de precio, qué reformular y qué eliminar. Clasifica cada plato en una matriz 2×2 (BCG) según popularidad y margen de contribución: **STAR**, **PLOWHORSE**, **PUZZLE**, **DOG**.

## 2. Viaje del usuario

1. Entra a `/menu-engineering`. Ve lista de reportes (DRAFT y ANALYZED).
2. **Crear** → `/menu-engineering/new`. Indica nombre y opcionalmente rango de fechas.
   - Si das fechas: el sistema lee `daily_recipe_sales` y precarga cantidades vendidas por receta.
   - `daily_recipe_sales` puede venir del flujo operativo de `/stock` o de la importación CSV histórica de ventas por receta.
   - Si no: tienes que rellenar las cantidades a mano.
   - Snapshots: para cada receta activa, guarda `cost_per_unit` y `price_per_unit` del momento.
3. Navega a `/menu-engineering/[id]`. Ve `SalesInputGrid` con las recetas y sus cantidades editables.
4. **Calcular Matriz** → `calculateMatrix(reportId)`:
   - Calcula `avgQuantity` (aritmético) y `avgMargin` (margen de contribución unitario ponderado por unidades vendidas).
   - Clasifica cada item: STAR / PLOWHORSE / PUZZLE / DOG.
   - Status del reporte pasa a `ANALYZED`.
5. Ve resultado:
   - `EngineeringMatrix` — scatter plot 2×2 (lazy-loaded).
   - `StrategyCards` — recomendaciones por cuadrante.
   - `InsightStrip` — insights generados.
   - `AIChefLab` (lazy) — chat con sugerencias IA.
6. **Simulación en vivo:** puede cambiar precios/cantidades sin guardar para ver cómo cambia la clasificación (`MenuEngineeringContext`).
7. **Borrar** → `deleteReport`.

## 3. Flujo técnico de datos

**Server actions** (`actions/menu-engineering.ts`):

- `createMenuReport({ name, dateFrom?, dateTo? })` — crea `menu_reports` en DRAFT y rellena `menu_report_items` con snapshots de todas las recetas activas. Si hay fechas, popula `quantity_sold` desde `daily_recipe_sales`.
- `getMenuReports()` — lista solo reportes del restaurante activo resuelto en servidor.
- `getMenuReport(id)` — detalle con items, filtrado por restaurante activo.
- `updateReportItem(id, { quantity_sold })` — edita cantidad en grid tras comprobar que el item pertenece a un reporte del restaurante activo.
- `calculateMatrix(reportId)` — comprueba propiedad del reporte, clasifica e inserta resultados en `menu_report_items.classification` + `avg_popularity` y `avg_margin`.
- `deleteReport(id)` — borra solo si `menu_reports.restaurant_id` coincide con el restaurante activo.

**Cálculo (vive en `src/lib/menu-engineering.ts`):**

```
Para cada item: contribution_margin = price_per_unit - cost_per_unit
                total_sales         = price_per_unit * quantity_sold
                total_cost          = cost_per_unit * quantity_sold
                total_profit        = contribution_margin * quantity_sold
                popularity_pct      = quantity_sold / Σ quantity_sold

Promedios del reporte:
  avgQuantity = Σ quantity_sold / N items
  avgPopularityPct = 1 / N items       (equivale a avgQuantity / totalSold)
  avgMargin   = Σ (margin * qty) / Σ qty   (ponderado por volumen)

Clasificación:
  popularity_pct >= avgPopularityPct && margin >= avgMargin → STAR
  popularity_pct >= avgPopularityPct && margin <  avgMargin → PLOWHORSE
  popularity_pct <  avgPopularityPct && margin >= avgMargin → PUZZLE
  popularity_pct <  avgPopularityPct && margin <  avgMargin → DOG
```

**Contrato unificado desde Fase 7:** `src/lib/menu-engineering.ts` expone `calculateMenuEngineeringAnalysis()` como motor puro. La action `calculateMatrix` y el simulador cliente reutilizan esta misma regla. `avg_popularity` se guarda como decimal (`1 / N`, por ejemplo `0.25` en un menu de 4 items) porque la UI trabaja el eje X en porcentaje. `MenuEngineeringCalculator.getStats().avgMargin` debe coincidir con el mismo margen ponderado de la matriz, no con una media aritmetica de porcentajes.

## 4. Reglas de negocio y restricciones

- **Snapshots inmutables:** `cost_per_unit` y `price_per_unit` se congelan al crear el reporte. Si después cambias el precio en `/recipes`, el reporte NO se actualiza — refleja el momento del análisis. Útil para auditoría.
- **Uso en informes profesionales:** `/reports` puede consumir un reporte `ANALYZED` como snapshot BCG si su rango `date_from/date_to` queda contenido en el periodo del informe. Reporting no recalcula BCG por su cuenta.
- **No se puede calcular si `totalSold = 0`:** los promedios serían indefinidos. La action debe rehusarlo (validar).
- **Clasificación es relativa al propio reporte:** un plato puede ser STAR en un análisis y PLOWHORSE en otro solo por cambiar el mix de items considerados.
- **Una sola fórmula BCG:** libreria, server action y simulador cliente usan `calculateMenuEngineeringAnalysis()`.
- **Persistencia de items calculados:** `calculateMatrix` actualiza los items con un `upsert` masivo por `id`, incluyendo las columnas obligatorias del snapshot, y valida el error de escritura antes de marcar el reporte como `ANALYZED`.
- **Seguridad multi-tenant:** las actions de lectura/escritura filtran por `restaurant_id` resuelto en servidor. `menu_reports` y `menu_report_items` tienen RLS reproducible desde `20260526083000_secure_menu_engineering_rls.sql`.
- **`avg_popularity` y `avg_margin`** se persisten en `menu_reports` al calcular. Si re-calculas, se sobreescriben.
- Visible en sidebar solo si `active_addons.includes('operativa')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `menu_reports`, `menu_report_items`, `recipes` (lectura snapshot), `daily_recipe_sales` (lectura opcional).
- **Otras páginas afectadas:**
  - `/recipes` — cambios de coste/precio NO afectan reportes ya creados (snapshots).
  - `/stock` — `daily_recipe_sales` se rellena allí cuando el usuario registra ventas por receta o importa CSV histórico. La importación CSV no descuenta stock; solo alimenta análisis.
  - `/financial-control` — `total_sales` del reporte debería cuadrar con `revenue_total` del mismo rango (no se cruza automáticamente).
  - `/reports` — consume snapshots `ANALYZED` para la seccion `menu_engineering`, sin recalcular ni aceptar datos de cliente.
- **Transversales:**
  - [T04](./T04-financial-math.md) — fórmula completa de clasificación.
  - [T02](./T02-base-de-datos.md) — esquema `MenuReportItemSchema`.

## 6. Casos límite y errores conocidos

- **Receta sin precio:** `price_per_unit=0` → `contribution_margin` negativo o cero. La libreria conserva el dato sin producir `NaN`, pero analiticamente conviene corregir ficha/precio antes de entregar conclusiones.
- **Margen negativo:** `cost_per_unit > price_per_unit` se clasifica de forma relativa como cualquier otro item; puede ser PLOWHORSE si es popular pero destruye margen.
- **Reporte con un solo item:** los promedios son ese mismo item → queda en la frontera y se clasifica como STAR por igualdad de umbrales. Sin sentido analítico.
- **Cantidades cero pero no todas cero:** items con qty=0 contarán como "no vendidos" y casi siempre acabarán en DOG.
- **Recetas activas vs inactivas:** el reporte se crea desde recetas activas. Si una se desactiva después, sigue en el reporte (snapshot).
- **Daily recipe sales sin datos:** la pre-carga retorna 0 para esas recetas.
- **Simulación en vivo no persiste:** si el usuario simula y se va sin guardar, el reporte queda con cantidades originales.
- **Concurrencia dentro del mismo restaurante:** dos usuarios calculando la misma matriz al mismo tiempo pueden sobreescribirse mutuamente.
- **Umbral visual:** la pantalla muestra `avg_popularity * 100`; internamente se conserva como decimal para evitar conversiones dobles.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer la sección de Menu Engineering en [T04](./T04-financial-math.md).
- Entender la diferencia entre umbral fijo y promedio relativo. Cambiar a umbrales fijos sería una decisión de producto.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/menu-engineering.ts` — actions.
- `src/lib/menu-engineering.ts` — cálculo (con tests en `.test.ts`).
- `src/components/menu-engineering/EngineeringMatrix.tsx`, `SalesInputGrid.tsx`, `StrategyCards.tsx`, `InsightStrip.tsx`, `AIChefLab.tsx`.
- `src/types/schema.ts` — `MenuReportSchema`, `MenuReportItemSchema`.

**Qué probar manualmente:**
- Crear reporte sin fechas → cantidades en 0, error al calcular.
- Crear reporte con rango de fechas que tenga ventas → pre-carga cantidades.
- Editar cantidad manualmente → ver actualización.
- Calcular matriz con datos → verificar clasificación visual en `EngineeringMatrix`.
- Recalcular después de cambiar cantidades → ver re-clasificación.
- Simular subir precio de un PUZZLE → ver si pasa a STAR.
- Borrar reporte → ver que se quitan tanto cabecera como items.

**Si añades un nuevo cuadrante o cambias la fórmula:**
1. Actualizar `calculateMenuEngineeringAnalysis()` y dejar `MenuEngineeringCalculator.analyze`, `calculateMatrix` y `MenuEngineeringContext` consumiendo esa función.
2. Actualizar el enum en `MenuReportItemSchema.classification`.
3. Migración SQL si cambias enum DB.
4. Actualizar tests en `menu-engineering.test.ts`.
5. Actualizar `StrategyCards` con recomendaciones para el nuevo cuadrante.
6. Actualizar [T04](./T04-financial-math.md).

**Si añades soporte para múltiples sub-menús (familias):**
1. Filtro en `createMenuReport` por categoría.
2. Considerar UI para ver matrices anidadas.
3. Reglas de cálculo pueden complicarse — los promedios deberían ser por familia, no globales.
