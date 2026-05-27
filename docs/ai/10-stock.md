# 10 — Stock (Control de Inventario)

**Ruta:** `/stock`
**Archivos clave:** `src/app/stock/page.tsx`, `src/app/actions/stock-actions.ts`, `src/components/stock/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito y rol en el negocio

Inventario operativo en tiempo real. Cuántas unidades tengo de cada ingrediente, cuáles están por debajo del mínimo, y cuánto vale mi stock total. Se sincroniza automáticamente: facturas suben stock, ventas y desperdicios bajan stock.

## 2. Viaje del usuario

1. Entra a `/stock`. Ve KPIs: total ingredientes, bajo mínimo, sin stock, valor total inventario.
2. **Tab "Inventario":**
   - Tabla buscable con: nombre, unidad, current_qty (editable inline), min_qty (editable inline), valor (qty × precio).
   - Alertas visuales: rojo si `current_qty < min_qty`, amarillo si `current_qty === 0`.
   - Botón "Inicializar Stock" — crea filas faltantes en `inventory_stock` para ingredientes que aún no la tienen.
   - Botón "Entrada Manual" → `ManualStockEntryDialog` para añadir stock no vinculado a una factura.
3. **Tab "Ventas del Día":**
   - `RecipeSalesCsvImportPanel`: importa ventas por receta desde CSV para alimentar informes y Menu Engineering sin descontar stock.
   - `DailyRecipeSalesForm`: selecciona fecha, añade recetas con cantidades vendidas.
   - Botón "Preview de Impacto" → `previewStockImpact`: muestra qué ingredientes consumiría sin guardar.
   - Botón "Procesar" → `processRecipeSales`: RPC atómico que explota recetas en consumo, deduce stock, registra movimientos.

## 3. Flujo técnico de datos

**Lectura:**
- `getInventoryStock(restaurantId)` — JOIN `inventory_stock` ↔ `master_ingredients` con precio y unidad.
- `getDailyRecipeSales(restaurantId, date)` — ventas guardadas para una fecha.
- `getRecipesForSales(restaurantId)` — dropdown de recetas.
- `getIngredientConsumption(recipeId, qty)` — explota receta recursivamente (hasta 5 niveles) en ingredientes maestros.
- `previewStockImpact(restaurantId, date, sales[])` — calcula sin escribir.
- `validateRecipeSalesCsvImport({ csvText })` — preflight server-side para CSV de ventas por receta. Revalida parser, resuelve `restaurant_id`, cruza `recipe_id`/`recipe_name` contra `recipes` del restaurante y detecta duplicados existentes en `daily_recipe_sales`.

**Escritura:**
- `importRecipeSalesCsv({ csvText })` — importa filas en `daily_recipe_sales` con `restaurant_id` server-side. No llama al RPC de stock y no descuenta inventario; está pensado para carga histórica/consultoría, informes y Menu Engineering.
- `upsertStock(ingredientId, current_qty, min_qty)` — edición inline.
- `processRecipeSales(restaurantId, date, sales[])` — RPC atómico `process_daily_sales_atomic`. Atómicamente:
  - Para cada receta vendida, explota a ingredientes (con sub-recetas y waste).
  - Resta de `inventory_stock.current_qty` (no permite negativos).
  - Inserta `stock_movements` tipo `SALE` (cantidad negativa).
  - Inserta/actualiza `daily_recipe_sales`.
- `addManualStockMovement(payload)` — entrada manual con razón/notas. Crea `stock_movements` tipo `ADJUSTMENT` o `PURCHASE` y `increment_inventory_stock`.
- `initializeAllStock(restaurantId)` — bulk INSERT en `inventory_stock` con `current_qty=0` para ingredientes sin fila.

## 4. Reglas de negocio y restricciones

- **Stock es la fuente de verdad.** Se modifica desde 3 puntos:
  1. **Facturas confirmadas** → `+PURCHASE` desde `review-invoice.ts`.
  2. **Ventas diarias procesadas** → `-SALE` desde `processRecipeSales`.
  3. **Desperdicios** → `-WASTE` desde `addWasteEntry`.
  4. (Ajustes manuales como `+ADJUSTMENT` o `-ADJUSTMENT`.)
- **No-negativos:** `increment_inventory_stock` usa `GREATEST(0, current_qty + delta)` (o equivalente). Stock nunca queda < 0.
- **`min_qty`:** umbral configurable por ingrediente. Si `current_qty < min_qty` → alerta rojo en dashboard.
- **RPC atómico:** `process_daily_sales_atomic` garantiza que TODAS las deducciones se aplican o NINGUNA. Si una falla (ingrediente faltante, etc.), rollback completo.
- **CSV histórico sin stock:** `importRecipeSalesCsv()` escribe `daily_recipe_sales` pero no crea `stock_movements` ni toca `inventory_stock`. Sirve para preparar informes históricos sin alterar el stock actual. Para descontar stock operativo, usar `processRecipeSales()`.
- **Explosión de receta:** hasta 5 niveles de sub-recetas. Más profundo → corte silencioso (riesgo de subestimar consumo).
- **Yield factor:** se respeta — `quantity_net = quantity_gross * yield_factor` al consumir.
- **Fallback de RPC:** si `increment_inventory_stock` falla, hay un path de update manual en `stock-actions.ts` (líneas ~425-448).
- Visible en sidebar solo si `active_addons.includes('operativa')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `inventory_stock`, `stock_movements`, `master_ingredients` (lectura), `recipes` + `recipe_ingredients` (lectura), `daily_recipe_sales` (escritura).
- **Otras páginas afectadas:**
  - `/invoices` (review) — confirmar factura sube stock.
  - `/desperdicios` — registrar merma baja stock.
  - `/recipes` — define qué se consume al vender una receta.
  - `/purchasing/analytics` — datos de consumo alimentan urgencies en `SmartOrderWidget`.
  - `/ingredients` — `current_avg_price` se usa para calcular valor del inventario.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — esquema y RPCs.
  - [T06](./T06-server-actions-comunes.md) — patrón de RPC atómico.

## 6. Casos límite y errores conocidos

- **Vender una receta con ingrediente faltante:** el RPC debe fallar y revertir. Comportamiento concreto depende del RPC — verificar.
- **Vender más de lo que hay:** dependiendo del RPC: o devuelve error, o pone stock en 0 y registra movement con cantidad menor (no-negativos). Verificar.
- **Inicializar stock 2 veces:** la función debe ser idempotente (no duplica filas).
- **Receta con sub-receta circular** (A usa B y B usa A): bucle infinito en explosión. No hay detección actual.
- **Cambiar `quantity_sold` en una venta ya procesada:** no se revierte automáticamente. Hay que registrar un movimiento de ajuste manual.
- **Importar CSV de un día ya registrado:** se bloquea si ya existe `(restaurant_id, date, recipe_id)` para evitar sobrescrituras accidentales. El usuario debe corregir el CSV o revisar el día manualmente.
- **Borrar movimiento de stock:** no implementado en UI; tendría que ajustarse `current_qty` manualmente al borrar.
- **Stock no inicializado:** si un ingrediente no tiene fila en `inventory_stock`, el dashboard no lo muestra. "Inicializar Stock" lo crea.
- **Eliminar ingrediente con stock:** soft delete del ingrediente deja la fila `inventory_stock` huérfana visualmente (no se ve).

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer el RPC `process_daily_sales_atomic` en `migrations/`. Es el corazón de la deducción.
- Confirmar el flujo `review-invoice` para no duplicar lógica de incremento.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/stock-actions.ts` — todo lo de stock.
- `src/app/actions/review-invoice.ts` — incremento desde facturas.
- `src/app/actions/waste-actions.ts` — decremento desde mermas.
- `src/components/stock/StockDashboard.tsx`, `DailyRecipeSalesForm.tsx`, `ManualStockEntryDialog.tsx`.
- `migrations/*` — si tocas el RPC.

**Qué probar manualmente:**
- Inicializar stock en restaurante limpio → ver filas creadas en `inventory_stock` con `current_qty=0`.
- Subir factura → confirmar → ver stock aumentar.
- Procesar ventas de un día → ver stock disminuir y `stock_movements` tipo SALE.
- Registrar merma → ver stock disminuir y `stock_movements` tipo WASTE.
- Editar `current_qty` inline → cambio persiste.
- Bajar `current_qty` a 0 → alerta "sin stock".
- Bajar `current_qty` debajo de `min_qty` → alerta rojo.
- Procesar ventas con receta que tiene sub-receta → ver que consume ingredientes correctos.

**Si añades soporte para nuevo tipo de movimiento (`RETURN`, `TRANSFER`):**
1. Extender enum `StockMovementType` en schema + migración.
2. Añadir lógica en `stock-actions.ts`.
3. Actualizar [T02](./T02-base-de-datos.md).
4. UI de tabla de movimientos (si la añades).

**Cambios delicados:**
- Cambiar la lógica de no-negativos: permitir stock negativo cambia el modelo de negocio (significaría "deuda de stock").
- Cambiar el max-depth de sub-recetas (5): impacto en rendimiento y precisión.
- Cambiar el RPC requiere migración + redeploy coordinado.
