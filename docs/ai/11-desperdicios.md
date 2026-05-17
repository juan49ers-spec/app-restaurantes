# 11 — Desperdicios (Mermas)

**Ruta:** `/desperdicios`
**Archivos clave:** `src/app/desperdicios/page.tsx`, `src/app/actions/waste-actions.ts`, `src/components/waste/WasteLogger.tsx`
**Transversales relacionados:** [T02](./T02-base-de-datos.md)

## 1. Propósito y rol en el negocio

Registrar pérdidas de ingredientes (caducados, dañados, sobrantes, mermas de preparación). Cada registro deduce stock automáticamente y deja audit trail con coste. Permite ver el impacto económico de las mermas a lo largo del tiempo.

## 2. Viaje del usuario

1. Entra a `/desperdicios`. Ve `WasteLogger`:
   - Formulario arriba: fecha (default hoy), ingrediente (dropdown), cantidad, razón, notas.
   - KPIs inline: total entries hoy, coste perdido hoy, coste total histórico.
   - Tabla abajo con los últimos registros, color-coded por razón.
2. **Registrar merma:**
   - Selecciona ingrediente, escribe cantidad (positiva), elige razón (`CADUCADO`, `DAÑADO`, `SOBRANTE`, `PREPARACION`, `OTRO`), añade notas opcionales.
   - Submit → `addWasteEntry`.
3. **Eliminar entrada** → `deleteWasteEntry`. Revierte stock_movement y restaura `inventory_stock`.

## 3. Flujo técnico de datos

**Lectura:**
- `getWasteLogs(dateFrom?, dateTo?)` — JOIN con `master_ingredients` para mostrar nombre/unidad/precio.
- `getWasteSummary(dateFrom?, dateTo?)` — agregados por ingrediente: total qty, total cost, número de entries.
- `getIngredientsForWaste()` — dropdown de ingredientes activos.

**Escritura (`addWasteEntry`):**
1. INSERT en `waste_logs` con `quantity` positivo y razón.
2. INSERT en `stock_movements` tipo `WASTE` con cantidad negativa.
3. `increment_inventory_stock(-quantity)` para reducir el stock (con `Math.max(0, ...)`).
4. Cálculo de coste: `quantity * current_avg_price` (snapshot al momento del registro).

**Eliminar (`deleteWasteEntry`):**
1. Lee el `waste_log` para obtener quantity.
2. DELETE de `waste_logs`.
3. INSERT de `stock_movement` correctivo (`ADJUSTMENT` positivo).
4. `increment_inventory_stock(+quantity)` para restaurar.

## 4. Reglas de negocio y restricciones

- **`quantity` siempre positiva** en `waste_logs` (representa cantidad perdida). El signo negativo aparece en `stock_movements`.
- **Razones** son enum estricto: `CADUCADO`, `DAÑADO`, `SOBRANTE`, `PREPARACION`, `OTRO`. Cada una con color distinto en UI.
- **Coste** se calcula al momento del registro usando `master_ingredients.current_avg_price`. Si el precio cambia después, el coste registrado **no** se actualiza (snapshot).
- **Reversión:** al borrar, se aplica un `ADJUSTMENT` positivo (no un `DELETE` del movimiento original) para preservar el audit trail.
- **Stock no-negativo:** se respeta. Si registras más merma que el stock disponible, se queda en 0 (no negativo).
- **Sin bulk delete** desde UI — solo borrado fila a fila.
- Visible en sidebar solo si `active_addons.includes('operativa')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `waste_logs`, `stock_movements`, `inventory_stock`, `master_ingredients` (lectura).
- **Otras páginas afectadas:**
  - `/stock` — `current_qty` se actualiza inmediatamente.
  - `/operational` — `avgWastePercentage` lo lee.
  - `/ingredients` — usa `current_avg_price` para calcular coste.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — esquema `WasteLogSchema`, `WasteReasonSchema`.

## 6. Casos límite y errores conocidos

- **Ingrediente sin precio:** la merma se registra pero el coste = 0 (no útil para reportes).
- **Ingrediente borrado (soft delete):** sigue apareciendo en el dropdown si está activo. Si se desactiva después, `waste_logs` mantiene referencia huérfana visualmente.
- **Restaurar tras borrado:** el `ADJUSTMENT` correctivo deja huella; el audit trail muestra "WASTE" + "ADJUSTMENT" en lugar de eliminarse limpiamente.
- **Cantidad mayor que stock:** no bloquea. El stock baja a 0 y la merma queda registrada con la cantidad pedida (engañoso si quieres reconciliar).
- **Múltiples mermas mismo día/ingrediente:** se crean filas separadas. No se consolidan.
- **Sin filtro por fecha en UI:** muestra historial completo o el rango por defecto. Para análisis por mes hay que pedir agregados (`getWasteSummary`).

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer `addWasteEntry` y `deleteWasteEntry` enteros.
- Confirmar el flujo de `increment_inventory_stock` y los stock_movements.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/waste-actions.ts` — todas las actions.
- `src/components/waste/WasteLogger.tsx` — UI.
- `src/app/actions/stock-actions.ts` — si cambias cómo se decrementa.
- `src/types/schema.ts` — `WasteLogSchema`, `WasteReasonSchema`.

**Qué probar manualmente:**
- Registrar merma → ver stock_movement WASTE creado y `current_qty` reducido.
- Registrar merma de ingrediente con stock < quantity → ver stock en 0, no negativo.
- Borrar merma → ver ADJUSTMENT positivo creado y stock restaurado.
- Filtrar por rango de fechas → ver subset correcto.
- Ver KPIs: total entries hoy, coste perdido hoy.

**Si añades una razón nueva:**
1. Extender `WasteReasonSchema` en `src/types/schema.ts`.
2. Migración: extender el `CHECK` constraint si lo hay.
3. Añadir color/icono en `WasteLogger.tsx`.
4. Actualizar [T02](./T02-base-de-datos.md).

**Si añades bulk delete o bulk import:**
1. Validar que cada delete revierte stock correctamente.
2. Considerar atomicidad (todo o nada).
3. Tener cuidado con performance si son cientos de filas.

**Cambios delicados:**
- Cambiar la deducción a no-deducir-stock (solo log): cambia el modelo de negocio. La merma dejaría de ser una salida real.
- Cambiar a "permitir cantidad negativa para correcciones" — usar `ADJUSTMENT` en su lugar.
