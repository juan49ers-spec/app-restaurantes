# 18 — Inventory (Conteo de Inventario Físico)

**Ruta:** `/operations/inventory` (+ `/operations/inventory/count/[sessionId]`)
**Archivos clave:** `src/app/actions/inventory.ts`, `src/app/operational/page.tsx` (link de acceso)
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T06](./T06-server-actions-comunes.md), [10-stock](./10-stock.md)

## 1. Propósito y rol en el negocio

Sistema de conteo físico de inventario. El usuario recorre la cocina con el móvil, registra las cantidades reales de cada ingrediente, y al cerrar la sesión el sistema genera un informe de consumo real: `consumido = stock_inicial + compras - stock_final`. Esto permite detectar mermas no registradas, robos y desviaciones entre el stock teórico y el real.

## 2. Viaje del usuario

1. Entra a `/operations/inventory`. Ve el historial de sesiones de conteo anteriores.
2. Click "Nueva sesión" → `startInventorySession()` crea una sesión en estado `draft`.
3. Navega a `/operations/inventory/count/[sessionId]`. Ve todos los `master_ingredients` activos con cantidad inicial a 0.
4. Va ingrediente por ingrediente introduciendo la cantidad real contada.
5. Cada cambio llama `saveInventoryCount()` con upsert en tiempo real (conflict target: `session_id + ingredient_id`).
6. Al terminar, click "Completar" → `completeInventorySession()` marca la sesión como `completed` con timestamp.
7. Puede seleccionar dos sesiones y generar un informe de consumo con `calculateConsumptionReport()`.

## 3. Flujo técnico de datos

**Crear sesión (`startInventorySession`):**

1. Resuelve `restaurant_id` vía `getUserRestaurant()`.
2. Comprueba si existe una sesión `draft` abierta → si sí, la devuelve (no crea duplicada).
3. INSERT en `inventory_sessions` con `status='draft'`.
4. `revalidatePath('/operations/inventory')`.

**Registrar conteo (`saveInventoryCount`):**

1. UPSERT en `inventory_counts` (conflict: `session_id, ingredient_id`).
2. Guarda `quantity`, `unit_price_snapshot`, `category` opcional.

**Completar sesión (`completeInventorySession`):**

1. UPDATE `inventory_sessions` set `status='completed'`, `completed_at=now()`.
2. Revalida ambas rutas: `/operations/inventory` y `/operations/inventory/count/[sessionId]`.

**Generar informe (`calculateConsumptionReport`):**

1. Recibe `startSessionId` y `endSessionId`.
2. Obtiene conteos de ambas sesiones.
3. Obtiene movimientos de stock entre ambas fechas (`stock_movements` tipo `PURCHASE` o `ENTRADA`).
4. Para cada ingrediente: `consumido = inicio + comprado - final`.
5. `consumed_value = consumed_qty * unit_price_snapshot`.
6. Devuelve array ordenado por valor consumido descendente.

## 4. Reglas de negocio y restricciones

- Solo puede haber **una sesión `draft` a la vez** por restaurante.
- Los conteos se guardan con **upsert** — si el usuario vuelve a un ingrediente, sobreescribe.
- `unit_price_snapshot` captura el precio medio del ingrediente en el momento del conteo (inmutable).
- El informe de consumo necesita exactamente 2 sesiones cerradas.

## 5. Dependencias e implicaciones cruzadas

| Módulo | Relación |
|--------|----------|
| [10-Stock](./10-stock.md) | Comparte `master_ingredients` y `stock_movements`. El inventario físico complementa el stock teórico. |
| [11-Desperdicios](./11-desperdicios.md) | La diferencia `consumo_real - consumo_teórico` puede indicar merma no registrada. |
| [08-Ingredients](./08-ingredients.md) | `master_ingredients` es la fuente de verdad de ingredientes activos. |
| [T02-Base de datos](./T02-base-de-datos.md) | Tablas: `inventory_sessions`, `inventory_counts`, `stock_movements`. |

## 6. Casos límite y errores conocidos

- Si no hay ingredientes activos, la lista de conteo aparece vacía.
- Si el usuario no cierra la sesión y empieza otra, se devuelve la existente (protección contra duplicados).
- El informe de consumo no tiene en cuenta desperdicios registrados — es un cálculo bruto.
- No hay validación de que `startSession.completed_at < endSession.completed_at`.

## 7. Al añadir/modificar una función aquí

- **Leer:** este archivo + [10-stock](./10-stock.md) + [T02](./T02-base-de-datos.md).
- **Tocar:** `src/app/actions/inventory.ts`. Si se cambia la UI, buscar en `src/app/operational/` o `src/app/operations/`.
- **Probar:** crear sesión → contar 3 ingredientes → completar → crear otra → completar → generar informe → verificar que `consumido = inicio + compras - final`.
- **Revalidar:** `/operations/inventory` y `/operations/inventory/count/[sessionId]`.
