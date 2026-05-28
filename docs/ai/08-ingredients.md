# 08 — Ingredients (Ingredientes maestros)

**Ruta:** `/ingredients`
**Archivos clave:** `src/app/ingredients/page.tsx`, `src/app/actions/ingredients.ts`, `src/components/ingredients/`, `src/lib/import-utils.ts`, `src/lib/constants.ts`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T04](./T04-financial-math.md)

## 1. Propósito y rol en el negocio

Catálogo maestro de ingredientes del restaurante. Es la tabla madre de la operativa de cocina: precios actualizados, mermas estándar, alérgenos. Cambios aquí se propagan automáticamente al coste de todas las recetas que los usan (vía trigger).

## 2. Viaje del usuario

1. Entra a `/ingredients`. Ve `IngredientSummaryCards` (KPIs: total ingredientes, precio medio, proveedores vinculados) y tabla.
2. Búsqueda por nombre/categoría (debounced).
3. **Crear** → "Nuevo Ingrediente" → `IngredientDialog` con campos: nombre, unidad (kg/l/u), categoría, merma %, precio, alérgenos.
4. **Editar precio inline** → input directo en la fila (`updateIngredientPrice`).
5. **Editar merma** → similar (`updateIngredientWaste`).
6. **Ver uso** → busca todas las recetas donde aparece (`checkIngredientUsage`).
7. **Borrar** → `DeleteIngredientAlert`:
   - Si está en uso por recetas activas → muestra recetas afectadas, advierte.
   - Confirma → soft delete (`is_active=false`, `archived_at=NOW`).
8. **Importar CSV** → `BulkImportDialog`:
   - Subir CSV. Detecta separador (`,` o `;`).
   - Mapeo automático de unidades: `g`→`kg`, `ml`→`l`, `uds`→`u`.
   - Validación: nombre, unidad, merma %, precio.
   - UPSERT masivo (`importIngredientsBulk`): crea o actualiza por (restaurant_id, name).

## 3. Flujo técnico de datos

**Lectura:**
- `getIngredients()` — solo `is_active=true`.
- `checkIngredientUsage(id)` — busca en `recipe_ingredients`.
- `getIngredientPriceHistory(id)` — últimas 10 entradas de `price_history`.

**Escritura:**
- `createIngredient(payload)`.
- `updateIngredient(id, payload)` — full update.
- `IngredientDialog` trata las respuestas legacy de create/update sin `@ts-expect-error`; si la action no trae `error`, muestra un fallback genérico.
- `updateIngredientPrice(id, price)` — solo precio. Si cambio > 1%, inserta en `price_history`.
- `updateIngredientWaste(id, waste_pct)` — solo merma.
- `deleteIngredient(id)` — soft delete.
- `importIngredientsBulk(rows)` — UPSERT masivo. Retorna `{ created, updated, reactivated }`.

**Validación CSV** (`import-utils.ts::validateIngredientsData`): nombre obligatorio, unidad en `{kg, l, u}`, merma 0-100 (se divide por 100 al guardar), precio ≥ 0.

## 4. Reglas de negocio y restricciones

- **Soft delete obligatorio.** Nunca `DELETE` directo. `is_active=false` + `archived_at`. Preserva histórico de recetas que lo usaron.
- **No se puede "borrar" si está en uso por recetas activas:** la UI muestra lista y exige confirmación explícita.
- **Merma se guarda como decimal `0..1`** (no como porcentaje 0..100). El form UI muestra %, convierte al guardar.
- **Precio:** mutable directamente. Cambio >1% → registra en `price_history` (`entity_type='INGREDIENT'`).
- **Trigger `update_recipe_costs_trigger`:** al actualizar `current_avg_price`, recalcula `current_cost` de todas las recetas que usan ese ingrediente.
- **Unidades canónicas:** `kg`, `l`, `u`. Sin litros para sólidos ni kilos para líquidos.
- **Constraint único:** `(restaurant_id, name)` — no puede haber dos ingredientes con el mismo nombre en un restaurante.
- **Alérgenos:** array de IDs canónicos (ver `ALLERGENS` en `src/lib/constants.ts`, 14 alérgenos UE).
- **Import:** si ingrediente con mismo nombre existe (incluso `is_active=false`), se reactiva con UPSERT.
- Visible en sidebar solo si `active_addons.includes('operativa')`. Se accede también vía tab en `/escandallos`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `master_ingredients` (lectura/escritura), `price_history` (insert), `recipe_ingredients` (lectura para uso), `inventory_stock` (vinculado), `supplier_items` (vinculado).
- **Otras páginas afectadas:**
  - `/recipes` — `current_cost` recalculado vía trigger.
  - `/escandallos` — misma data.
  - `/stock` — `inventory_stock` rows usan `ingredient_id`.
  - `/suppliers/[id]` — `supplier_items.master_ingredient_id`.
  - `/invoices` — review crea ingredientes nuevos si no existen.
  - `/desperdicios` — usa ingredientes para registrar pérdidas.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — soft delete, trigger, índices.
  - [T04](./T04-financial-math.md) — formato de `standard_waste_pct` y `current_avg_price`.

## 6. Casos límite y errores conocidos

- **Cambio de unidad** (de `kg` a `u`): rompe el cálculo de coste en recetas existentes (las cantidades se interpretan distinto). Sin validación explícita — la UI permite el cambio. Operación de riesgo.
- **Reactivación tras soft delete:** un CSV con un nombre que ya existía pero está inactivo lo reactivará (`is_active=true`). El histórico de uso queda intacto.
- **Múltiples cambios de precio rápidos:** cada uno inserta en `price_history` si >1%. Puede haber spam si se edita rápido.
- **Ingrediente sin proveedor:** no es bloqueante, solo significa que en compras analytics aparecerá en "Sin proveedor asignado".
- **Allergens vacíos:** se permiten. Significa "no declarados", no "no contiene".
- **Edge case CSV:** valores con comas dentro de quoted strings funcionan; sin quotes rompe el parsing.
- **Constraint único:** intento de crear "Cebolla" cuando ya existe → falla con error de DB. UI debe atrapar y mostrar mensaje claro.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Confirmar formato de `standard_waste_pct` (decimal 0..1, no porcentaje).
- Leer el trigger `update_recipe_costs_trigger` en `migrations/`.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/ingredients.ts` — todas las actions.
- `src/components/ingredients/IngredientsTable.tsx`, `IngredientDialog.tsx`, `AllergenSelector.tsx`, `BulkImportDialog.tsx`.
- `src/lib/import-utils.ts` — parser CSV.
- `src/lib/constants.ts` — lista canónica de alérgenos.
- `src/types/schema.ts` — `MasterIngredientSchema`.

**Qué probar manualmente:**
- Crear ingrediente "Tomate" 0.5€/kg, merma 10%, alérgenos vacíos → aparece en tabla.
- Editar precio a 0.6€/kg → ver `price_history` con cambio. Ir a `/recipes` → ver coste actualizado.
- Editar merma → ver `quantity_net` cambiar en recetas.
- Borrar ingrediente usado en receta → ver alerta con recetas afectadas; confirmar → ingrediente desaparece de la tabla pero la receta sigue.
- Importar CSV con 100 filas → verificar contadores `created`/`updated`/`reactivated`.
- Cambiar unidad de un ingrediente con uso activo → testear que las recetas siguen mostrando algo coherente (advertir).
- Crear ingrediente con nombre duplicado → debe fallar.

**Si añades un campo nuevo a `master_ingredients`:**
1. Migración SQL.
2. Actualizar `MasterIngredientSchema` (Zod).
3. Regenerar `src/types/supabase.ts`.
4. Actualizar `IngredientDialog` form.
5. Actualizar CSV parser si quieres importarlo.
6. Actualizar [T02](./T02-base-de-datos.md).

**Cambios delicados:**
- Eliminar el soft delete: rompe historicidad. No hacer salvo con migración explícita.
- Cambiar la lista canónica de alérgenos: requires re-mapping de los datos existentes (los IDs deben mantenerse).
- Cambiar el umbral 1% para insert en `price_history`: afecta volumen de filas en BD.
