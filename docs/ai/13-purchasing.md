# 13 — Purchasing (Analytics de compras)

**Ruta:** `/purchasing/analytics`
**Archivos clave:** `src/app/purchasing/analytics/page.tsx`, `src/app/actions/purchase-analytics.ts`, `src/app/actions/smart-ordering.ts`, `src/app/actions/price-alerts.ts`, `src/components/purchasing/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md)

## 1. Propósito y rol en el negocio

Centro analítico de compras. Cruza histórico de facturas, precios y consumo para responder: "¿Cuánto estoy gastando por categoría?", "¿Qué proveedor es más caro?", "¿Qué debería pedir esta semana?", "¿Qué ingredientes han subido de precio?". También sugiere pedidos inteligentes y aviva alertas de spikes.

## 2. Viaje del usuario

1. Entra a `/purchasing/analytics`. Ve 4 KPIs cabecera:
   - Gasto total (últimos 6 meses).
   - Gasto medio mensual.
   - Ahorro potencial estimado.
   - Items sin mapear.
2. Tabs:
   - **Resumen:** grid con gasto por categoría, top proveedores, volatilidad de precios. Widgets: `SmartOrderWidget`, `MarketBenchmark`, `PriceAlertConfig`, `ContractTracker`.
   - **Comparador de precios:** `PriceComparisonTable` — para cada ingrediente, lista todos los proveedores con su `last_price`, marca cuál es el mejor, varianza %.
   - **Mapeo de productos:** form para asociar `unmapped invoice_items` a `master_ingredients`.
3. **`SmartOrderWidget`** muestra cardstack de proveedores con sugerencias:
   - Urgencia (`critical`/`high`/`medium`/`low`) según `weekly_avg` y patrón de consumo.
   - Cantidad sugerida = `ceil(weekly_avg * 1.2)`.
   - Botón "Llamar proveedor" usa `suppliers.contact_phone`.

## 3. Flujo técnico de datos

**Lectura (puramente):**
- `getPurchaseAnalytics()` — agrega `invoices` últimos 6 meses, devuelve `{ summary, spendByCategory, topSuppliers, priceVolatility }`.
- `getPriceComparisons()` — para cada ingrediente, lista suppliers + precios + `is_best_price` + `variance_pct`.
- `getUnmappedItems()` — `invoice_items` sin `master_ingredient_id`.
- `getSmartOrderSuggestions()` — agrupa por supplier, calcula urgencia y qty sugerida.
- `getSupplierItemMappings()` — `supplier_aliases` con `master_ingredient_id`.
- `getMarketBenchmark()` — precios de mercado (placeholder/parcial).
- `getPriceAlerts()` — alertas activas de spike.
- `getContractStatus()` — contratos (parcial).

**Escritura:**
- `mapSupplierItemToIngredient(itemId, ingredientId)` — actualiza el mapping.
- `configurePriceAlert(payload)` — define umbrales.

## 4. Reglas de negocio y restricciones

- **Gasto total** = suma de `invoices.total_amount` (status `completed`) últimos 6 meses.
- **Media mensual** = total / 6.
- **Ahorro potencial:** por ingrediente, `worst_price - best_price` entre suppliers que lo venden.
- **Price spike alert:** si precio sube >10% vs último, crea alert con impacto estimado = `(new - old) * (qty_weekly * 4)`.
- **Urgencias de smart ordering:**
  - **Critical:** pico de consumo en 2 días Y `weekly_avg > 5`.
  - **High:** `weekly_avg > 10`.
  - **Medium:** `weekly_avg > 5`.
  - **Low:** resto.
- **Quantity suggestion** = `Math.ceil(weekly_avg * 1.2)` (buffer 20%).
- **Sin supplier asignado:** items van a "Sin proveedor asignado" en SmartOrder.
- **`weekly_avg`:** calculado desde `price_history.quantity` cuando disponible, sino estimación 0.
- Visible en sidebar solo si `active_addons.includes('proveedores')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas (lectura):** `invoices`, `invoice_items`, `price_history`, `suppliers`, `supplier_items`, `supplier_aliases`, `master_ingredients`. Mutaciones solo sobre mapping (`supplier_aliases`, `supplier_items`).
- **Otras páginas afectadas:**
  - `/invoices` — datos fuente.
  - `/suppliers/[id]` — mapping y scorecard.
  - `/ingredients` — los ingredientes mapeados aparecen con supplier.
  - `/notifications` — alertas de spike.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — esquema.

## 6. Casos límite y errores conocidos

- **Pocos datos históricos:** los cálculos son ruido si no hay 6 meses de facturas. La UI no lo señaliza.
- **Items sin precio o sin qty:** se ignoran en cálculos pero pueden distorsionar promedios.
- **Smart order sin sales registrados:** estimaciones de consumo serán muy pobres. Pedirá poco o nada.
- **Múltiples supplier_items con misma descripción:** mapping ambiguo, puede agrupar gasto en categoría equivocada.
- **`weekday-day patterns`** se calculan con `getDay()` simple — no detecta patrones más complejos (fines de semana largos, festivos).
- **Ahorro potencial puede ser engañoso** si el "mejor precio" es de un proveedor poco fiable o con stock irregular.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Confirmar qué datos vienen de `invoices.total_amount` vs `invoice_items.unit_price * quantity`. No siempre cuadran (descuentos, etc.).
- Mirar el cálculo de urgencias en `smart-ordering.ts`.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/purchase-analytics.ts`, `smart-ordering.ts`, `price-alerts.ts`.
- `src/components/purchasing/*` — todos.
- `src/types/alerts.ts` — si añades tipos de alerta.

**Qué probar manualmente:**
- Subir varias facturas con distintos proveedores y precios → verificar:
  - Gasto total (6 meses) incluye solo `completed`.
  - Comparador muestra todos los proveedores por ingrediente.
  - Smart Order sugiere cantidades coherentes.
- Mapear un unmapped item → ver que desaparece de la lista.
- Configurar una price alert al 5% → ver que dispara con cambios pequeños.
- Borrar una factura → analytics deberían reflejar el cambio (revalidatePath).

**Si añades una métrica nueva (ej. "lead time"):**
1. Necesitas `received_at` o equivalente en `invoices` (no existe). Migración.
2. Actualizar `getPurchaseAnalytics`.
3. Añadir widget en UI.

**Cambios delicados:**
- Cambiar la fórmula de "ahorro potencial": afecta a recomendación de proveedores.
- Cambiar umbral del spike (10%): afecta a volumen de alertas.
- Cambiar `weekly_avg * 1.2` (buffer): si pones poco, faltará stock; si pones mucho, sobrarán pedidos.
