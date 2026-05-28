# 12 — Suppliers (Proveedores)

**Ruta:** `/suppliers` (+ `/suppliers/[id]`)
**Archivos clave:** `src/app/suppliers/page.tsx`, `src/app/suppliers/[id]/page.tsx`, `src/app/actions/suppliers.ts`, `src/app/actions/supplierItems.ts`, `src/app/actions/supplier-mapping.ts`, `src/app/actions/supplier-scorecard.ts`, `src/components/suppliers/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito y rol en el negocio

CRM de proveedores. Mantiene datos fiscales/contacto, productos que se le compran, mapeo a ingredientes maestros, y un scorecard de confiabilidad basado en histórico de precios y entregas.

## 2. Viaje del usuario

1. Entra a `/suppliers`. Ve `SupplierTable` con búsqueda.
2. **Crear** → `SupplierForm` con: nombre, CIF, email, teléfono, condiciones de pago.
3. **Click en una fila** → `/suppliers/[id]`:
   - Datos del proveedor (editables).
   - **Scorecard:** `SupplierScorecard` con `reliability_score`, `trend_direction`, total órdenes, varianza promedio de precio.
   - **Productos del proveedor:** `SupplierItemsTable`. Cada fila: `name_on_invoice`, `sku_on_invoice`, `last_price`, `pack_size`, mapeo a `master_ingredient`.
   - **Comparación** con otros proveedores (`SupplierComparisonModal`).
4. **Editar producto inline** o desde modal.
5. **Borrar proveedor** → DELETE (hard delete, cascade a `supplier_items` y `supplier_aliases` si la DB lo permite).

## 3. Flujo técnico de datos

**Lectura:**
- `getSuppliers()` — lista básica.
- `getSupplier(id)` — detalle.
- `getSupplierItems(supplierId)` — productos con JOIN a `master_ingredients`.
- `SupplierItemsTable` acepta el shape real del JOIN de Supabase (`master_ingredients` como objeto, array o null) sin casts `as any`, normalizando el nombre mapeado en UI.
- `getSupplierScorecard(supplierId)` — calcula scorecard agregando `price_history` y datos de facturas.
- `getAllSupplierScores()` — ranking global.

**Escritura:**
- `createSupplier(payload)` — validado con Zod.
- `updateSupplier(id, payload)`.
- `deleteSupplier(id)` — hard delete.
- `createSupplierItem(payload)`.
- `updateSupplierItem(id, payload)` — incluye cambiar el mapping a un master_ingredient distinto.
- `deleteSupplierItem(id)`.
- `mapSupplierItemToIngredient(itemId, ingredientId)` — atajo.

## 4. Reglas de negocio y restricciones

- **Validación Zod:** `name` obligatorio. Email opcional pero formato si está. Teléfono opcional.
- **Supplier items** mapean **many-to-one** a `master_ingredients`. Un mismo ingrediente puede tener N supplier_items (varios proveedores lo venden).
- **Aprendizaje automático de mapping:** al confirmar una factura (ver [05](./05-invoices.md)), se inserta/actualiza un `supplier_alias` (alias_name → master_ingredient_id) con `confidence_score`.
- **Pack size:** entero. Conversión de pack a unidades de venta (ej. caja de 12 botellas = `pack_size=12`).
- **Scorecard:**
  - `reliability_score = 100 - (avgVariance * 40)` donde `avgVariance` es la varianza de precios histórica.
  - `trend_direction`: "improving" si últimos 3 meses > primeros 3 meses + 5pts, "declining" si < -5pts, "stable" en el resto.
- **Borrado en cascada:** borrar supplier elimina `supplier_items` y `supplier_aliases` si la DB tiene FK con `ON DELETE CASCADE`. Verificar en migraciones.
- Visible en sidebar solo si `active_addons.includes('proveedores')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `suppliers`, `supplier_items`, `supplier_aliases`, `master_ingredients` (lectura), `invoices` y `price_history` (para scorecard).
- **Otras páginas afectadas:**
  - `/invoices` — `supplier_id` se usa al review.
  - `/purchasing/analytics` — agrega gasto y volatilidad por supplier.
  - `/financial-control` — gastos de PROVEEDORES_COMIDA/BEBIDA se vinculan vía invoice → supplier.
  - `/ingredients` — `supplier_items.master_ingredient_id` es la conexión.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — esquema, scorecard.
  - [T06](./T06-server-actions-comunes.md) — patrón de actions.

## 6. Casos límite y errores conocidos

- **Borrar supplier con facturas asociadas:** las facturas quedan con `supplier_id` huérfano si la FK no tiene cascada definida. Verificar migración.
- **Producto sin mapping a ingrediente:** aparece en "Unmapped Items" en `/purchasing/analytics`.
- **Confidence score < 1:** posible cuando OCR sugiere mapping con baja certeza (no fully implementado en UI).
- **Scorecard sin datos:** si el proveedor no tiene facturas, el scorecard sale en defaults (100, "stable").
- **Email/teléfono inválido:** Zod los hace opcionales con `.or(z.literal(''))`. Strings vacíos se aceptan.
- **Pack size 0 o vacío:** rompe el cálculo de `unit_price` en review de facturas (división por cero). Validar > 0 en formulario.
- **Múltiples supplier_items con mismo `name_on_invoice` y mismo supplier:** posible (no constraint único). Puede dificultar el mapping automático.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer la sección de aprendizaje de aliases en [05 — Invoices](./05-invoices.md).
- Confirmar el algoritmo del scorecard.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/suppliers.ts`, `supplierItems.ts`, `supplier-mapping.ts`, `supplier-scorecard.ts`.
- `src/components/suppliers/SupplierTable.tsx`, `SupplierDetailsModal.tsx`, `SupplierItemsTable.tsx`, `SupplierScorecard.tsx`, `SupplierComparisonModal.tsx`.
- `src/types/schema.ts` — `SupplierSchema`, `SupplierAliasSchema`.

**Qué probar manualmente:**
- Crear proveedor → aparece en lista.
- Editar datos → persiste.
- Añadir supplier_item con mapping a ingrediente → ver en `/ingredients` que tiene proveedor asociado.
- Subir factura del proveedor → ver que el scorecard se actualiza tras varias facturas.
- Cambiar mapping de un item → próximas facturas deberían usar el nuevo.
- Borrar proveedor → verificar cascada en `supplier_items` y `supplier_aliases`.
- Borrar proveedor con facturas asociadas → ver comportamiento (debería avisar o bloquear).

**Si cambias la fórmula del scorecard:**
1. Actualizar `supplier-scorecard.ts`.
2. Migración si añades campos persistidos.
3. Recalcular para todos los suppliers existentes (script one-off).
4. Documentar el nuevo cálculo en este archivo.

**Si añades soft delete a suppliers:**
1. Añadir `is_active` y `archived_at` en `suppliers`.
2. Actualizar `getSuppliers` para filtrar.
3. Decidir qué pasa con `supplier_items` y `supplier_aliases` (también soft delete?).
4. Migración + Zod schema.
