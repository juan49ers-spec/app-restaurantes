# 15 — Operational (Salud operativa)

**Ruta:** `/operational`
**Archivos clave:** `src/app/operational/page.tsx`, `src/app/actions/operational.ts`, `src/components/operational/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T04](./T04-financial-math.md)

## 1. Propósito y rol en el negocio

Dashboard de "salud operativa". Detecta problemas que afectan al control de costes: ingredientes sin precio actualizado, recetas con margen bajo, merma alta, categorización incompleta. Genera lista de tareas pendientes priorizadas para que el gerente las resuelva.

## 2. Viaje del usuario

1. Entra a `/operational`. Ve 4 KPIs cabecera:
   - Total ingredientes.
   - Total recetas.
   - Food cost % promedio.
   - Merma % promedio.
2. **Panel izquierdo: Alertas operativas** (máx 5):
   - Cada alerta con severidad (`HIGH`/`MEDIUM`/`LOW`), descripción, botón "Ir a" → lleva a la entidad afectada (`/ingredients`, `/recipes/[id]/edit`).
3. **Panel derecho: Tareas pendientes:**
   - "Añadir precio al ingrediente X", "Revisar margen de receta Y", "Categorizar ingrediente Z", "Subir foto", "Revisar alergenos".
   - Prioridad (HIGH/MEDIUM/LOW) con badge.

## 3. Flujo técnico de datos

**Server actions** (`actions/operational.ts`):

- `getOperationalAlerts()` — escanea:
  - Ingredientes con `last_updated_at > 7 días` → severity MEDIUM.
  - Recetas con `(selling_price - current_cost) / selling_price < target_margin_pct` → severity HIGH si margen < 50%, MEDIUM si no.
  - Ingredientes con `standard_waste_pct > 0.2` → severity MEDIUM (>0.3 → HIGH).
  - Ingredientes sin categoría → severity LOW.
- `getOperationalKPIs()`:
  - `totalIngredients`, `ingredientsWithoutPrice`.
  - `avgWastePercentage` — promedio de `standard_waste_pct` de ingredientes activos.
  - `totalRecipes`, `recipesBelowTargetMargin`.
  - `avgFoodCostPercentage` — promedio de `current_cost / selling_price` para recetas con precio > 0.
- `getPendingTasks()` — combina las alertas con tareas adicionales (subir foto, alergenos, etc.).

**Página `force-dynamic`:** cada acceso refetcha (sin caché). No hay polling — para refrescar, recargar.

## 4. Reglas de negocio y restricciones

- **Umbrales de alerta:**
  - Precio desactualizado: > 7 días.
  - Food cost target: 30% (avg típico hostelería).
  - Merma warning: > 20%, crítica > 30%.
  - Margen target: 70% (recipes.target_margin_pct si está definido, si no se usa default).
- **Severidad:** HIGH > MEDIUM > LOW. Solo se muestran las top 5.
- **Tareas:** ordenadas por priority y luego por antigüedad.
- **No mutaciones desde esta página** — todo es lectura/redirect.
- Visible en sidebar (sin filtro por addons explícito, revisar).

## 5. Dependencias e implicaciones cruzadas

- **Tablas (solo lectura):** `master_ingredients`, `recipes`, `recipe_ingredients`, `daily_sales` (para algunos cálculos), `inventory_stock`.
- **Otras páginas afectadas:** ninguna escribe aquí, pero las alertas llevan a:
  - `/ingredients` — para actualizar precio.
  - `/recipes/[id]/edit` — para revisar margen.
- **Transversales:**
  - [T04](./T04-financial-math.md) — fórmulas de food cost, margen.
  - [T02](./T02-base-de-datos.md) — campos `last_updated_at`, `target_margin_pct`, `standard_waste_pct`.

## 6. Casos límite y errores conocidos

- **Restaurante sin ingredientes/recetas:** todos los KPIs en 0, "¡Todo en orden!" en alertas.
- **`force-dynamic` sin polling:** si el usuario soluciona un problema y vuelve, debe recargar manualmente.
- **`avgFoodCostPercentage` indefinido:** si ninguna receta tiene `selling_price > 0`, sale 0 o NaN. Verificar manejo.
- **Recetas con `target_margin_pct` no definido:** se usa un default. Si el default no es realista, muchas recetas aparecerán como "bajo margen".
- **Ingredientes inactivos:** se excluyen del scanner. Si se reactivan, vuelven a aparecer.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Confirmar los umbrales en `operational.ts`. Algunos son hardcoded.
- Mirar [T04](./T04-financial-math.md) si vas a cambiar fórmulas.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/operational.ts`.
- `src/components/operational/OperationalDashboardClient.tsx`.

**Qué probar manualmente:**
- Restaurante con datos limpios → "Todo en orden".
- Crear ingrediente sin actualizar precio en 8 días → ver alerta MEDIUM.
- Crear receta con margen < 50% → ver alerta HIGH.
- Subir merma de un ingrediente a 35% → ver alerta crítica.
- Click "Ir a" → debe llevar a la entidad correcta.
- Verificar que tras resolver una alerta, recargar la página la quita.

**Si añades una alerta nueva (ej. "stock crítico"):**
1. Añadir scan en `getOperationalAlerts`.
2. Definir umbral configurable (idealmente en `business_rules`).
3. UI: icono + acción "Ir a".
4. Documentar aquí.

**Cambios delicados:**
- Cambiar el límite "top 5" alertas: si bajas, esconde info; si subes, satura UI.
- Cambiar el umbral de "precio desactualizado" (7 días): impacto alto en cantidad de alertas.
- Eliminar `force-dynamic`: añade caché → puede mostrar info obsoleta. Si lo haces, asegurar `revalidatePath('/operational')` desde mutaciones de ingredientes/recetas.
