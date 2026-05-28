# 07 — Recipes (Recetas / Fichas técnicas)

**Ruta:** `/recipes` (+ `/recipes/[id]/edit`, `/recipes/new/edit`)
**Archivos clave:** `src/app/recipes/page.tsx`, `src/app/recipes/[id]/edit/page.tsx`, `src/app/actions/recipes.ts`, `src/app/actions/saveRecipe.ts`, `src/components/recipes/`, `src/hooks/useRecipeCalculator.ts`, `src/lib/recipe-utils.ts`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T04](./T04-financial-math.md), [T05](./T05-hooks-y-providers.md)

## 1. Propósito y rol en el negocio

Las fichas técnicas (escandallos) de los platos del menú. Documentan la fórmula exacta: ingredientes con cantidades, tiempo de preparación, rendimiento, alérgenos, coste de producción y precio de venta. Son la fuente para Menu Engineering y para deducir stock cuando se registran ventas diarias.

## 2. Viaje del usuario

1. Entra a `/recipes`. Ve `ResumeSummaryCards` (KPIs: total recetas, margen promedio, coste promedio) y tabla.
2. Búsqueda por nombre (debounced).
3. Puede importar cabeceras de recetas desde CSV seleccionando un archivo `.csv` o pegando el contenido, con preview, descarga de plantilla, descarga de incidencias y comprobación de duplicados antes de escribir.
4. Click "Nueva Receta" → `/recipes/new/edit`. Click en fila → `/recipes/[id]/edit`.
5. **Editor full-screen** (`RecipeEditorClient`):
   - Tabs:
     - **Receta**: nombre, precio venta, margen objetivo, tiempo prep, rendimiento (yields).
     - **Sensibilidad de precio**: curva coste vs precio.
     - **Escalador de producción**: multiplicador (2x, 10x) para ver ingredientes y costes escalados.
     - **Historial**: timeline de cambios de coste de la receta.
   - Panel izquierdo: `IngredientSelector` — busca/agrega ingredientes o sub-recetas.
   - Panel derecho: `RecipeBuilder` — lista de ingredientes con qty_gross y qty_net, coste por ingrediente, coste total.
   - Gráfico `CostBreakdownChart` (pie/bar) por ingrediente.
5. **Guardar** → `saveRecipe` (RPC atómico).
6. **Imprimir** → `RecipePrintView` (ficha imprimible) o `KitchenTicket` (ticket de cocina).
7. **Eliminar** → `DeleteRecipeAlert` (confirmación, advierte de uso en sub-recetas).

## 3. Flujo técnico de datos

**Lectura:**
- `getRecipes()` — todas las recetas con margen calculado: `(selling_price - current_cost) / selling_price * 100`.
- `getRecipeForEdit(id)` — receta + sus `recipe_ingredients` con join a `master_ingredients` o `recipes` (sub-recetas).
- `getRecipeDetails(id)` — read-only.
- `getRecipePriceHistory(id)` — `price_history` filtrado por `entity_type='RECIPE'`.

**Escritura:**
- `saveRecipe(payload)` — llama RPC `upsert_recipe_with_ingredients` (atómico). Si falla, no se guarda nada.
- `deleteRecipe(id)` — borra recipe + `recipe_ingredients` (cascade).
- `validateRecipesCsvImport({ csvText })` — revalida CSV en servidor, resuelve `restaurant_id` y comprueba nombres ya existentes.
- `importRecipesCsv({ csvText })` — importa cabeceras de receta en `recipes` con `restaurant_id` server-side tras repetir validación y preflight. No crea `recipe_ingredients`, no crea ingredientes maestros y no toca stock.

**Importación CSV de cabeceras:**

- `RecipesCsvImportPanel` vive en `RecipesClientPage`.
- El panel reutiliza `CsvFileInput` para cargar archivos `.csv`; editar el textarea o cambiar de archivo reinicia mensajes y preflight para que la importación siempre corresponda al contenido comprobado.
- `parseRecipesCsvPreview()` es un motor puro en `src/lib/importing/recipes-csv.ts`: normaliza cabeceras, soporta decimales españoles, valida `name`, `selling_price`, `current_cost`, `target_margin_pct`, `prep_time_minutes`, `yields` y `hourly_rate`, detecta duplicados internos por nombre normalizado y resume precio/coste medio.
- El panel ofrece plantilla descargable e incidencias CSV descargables mediante `ImportIssuesDownloadButton`.
- La selección de archivo usa `CsvFileInput`, que bloquea archivos no `.csv` y CSVs demasiado grandes antes de leerlos en cliente.

**Hook clave:** `useRecipeCalculator` (ver [T05](./T05-hooks-y-providers.md)) — orquesta el estado del editor: ingredientes, escalado, métricas derivadas (`totalCost`, `laborCost`, `primeCost`, `calculatedMargin`, `suggestedPrice`).

## 4. Reglas de negocio y restricciones

- Una receta usa **ingredientes maestros** o **sub-recetas** (otras recetas usadas como ingrediente). Soportado nativamente en `recipe_ingredients` con FK a uno u otro.
- **Coste de receta** = Σ (quantity_gross × precio del ingrediente). El waste se aplica vía `quantity_net = quantity_gross × (1 - waste_pct)`.
- **Margen** = `(selling_price - current_cost) / selling_price * 100`. Si `selling_price=0`, no se calcula.
- **Margen crítico < 20%** → alerta visual roja.
- **Trigger automático**: si cambia `master_ingredients.current_avg_price`, `recipes.current_cost` se recalcula automáticamente para todas las recetas que usan ese ingrediente.
- **Bug conocido (sub-recetas):** el trigger NO dispara al cambiar `recipes.current_cost`. Si una sub-receta cambia, las recetas padre que la usan NO se recalculan automáticamente (ver [T04](./T04-financial-math.md) §"Gotchas").
- **No se valida** que una receta no pueda borrarse si es usada como sub-receta por otra. Puede crear referencias huérfanas — revisar `DeleteRecipeAlert` para confirmar comportamiento actual.
- **Labor cost** existe en el esquema (`hourly_rate`, `prep_time_minutes`) pero no toda la UI lo suma al coste mostrado consistentemente.
- **Allergens** se agregan en los ingredientes y se propagan automáticamente a la receta (lectura derivada).
- **Idempotency key** en `saveRecipe` previene duplicados si el cliente reintenta.
- **CSV de recetas:** importa solo cabeceras históricas/operativas (`recipes`). Es útil para preparar carta, ventas por receta y Menu Engineering cuando el consultor tiene un Excel de carta con coste/precio. No sustituye el escandallo completo con ingredientes.
- **Duplicado CSV de receta:** se bloquea si el CSV contiene nombres duplicados internamente o si ya existe una receta con el mismo nombre normalizado en el restaurante activo.
- Visible en sidebar solo si `active_addons.includes('operativa')`. La ruta `/recipes` no aparece en sidebar como entrada propia — se accede vía `/escandallos` tab.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `recipes`, `recipe_ingredients`, `master_ingredients` (lectura), `price_history`.
- **Otras páginas afectadas:**
  - `/escandallos` — la misma UX.
  - `/menu-engineering` — usa recipes como input.
  - `/stock` (Ventas del día) — cuando se registra venta de receta, se explotan ingredientes y se deduce stock.
  - `/ingredients` — cambios de precio aquí afectan coste de receta vía trigger.
- **Transversales:**
  - [T04](./T04-financial-math.md) — fórmulas de coste, margen, escalado.
  - [T02](./T02-base-de-datos.md) — esquema, trigger `update_recipe_costs_trigger`, RPC.
  - [T05](./T05-hooks-y-providers.md) — `useRecipeCalculator`.

## 6. Casos límite y errores conocidos

- **Receta sin ingredientes:** se puede guardar (no hay validación). Coste = 0.
- **CSV de recetas sin ingredientes:** las recetas importadas pueden tener `current_cost` y `selling_price`, pero no `recipe_ingredients`. Sirven para informes y ventas por receta; no sirven para explosión de stock hasta completar el escandallo.
- **Receta sin precio de venta:** margen no calculable, ratios = 0.
- **Sub-receta cambia coste:** los padres no se actualizan automáticamente. Workaround manual: tocar y guardar la receta padre.
- **Ingrediente borrado (soft delete):** sigue apareciendo en recetas que lo usaban (porque `is_active=false` no elimina la fila). Puede mostrar precio desactualizado.
- **Yield factor custom:** se considera "custom" si `|finalYield - masterYield| > 0.001`. Tolerancia para evitar falsos positivos.
- **Cálculo de coste recursivo (sub-recetas):** la explosión se hace hasta 5 niveles (en `stock-actions.ts::getIngredientConsumption`). Más niveles → corte silencioso.
- **Imprimir factura/ficha:** puede tardar si la receta tiene >50 ingredientes (renderiza HTML pesado).
- **Conflicto en RPC `upsert_recipe_with_ingredients`:** si dos usuarios guardan la misma receta a la vez, el último gana. Sin optimistic locking.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer [T04](./T04-financial-math.md) sección de Menu Engineering y de gotchas en cálculo.
- Mirar `useRecipeCalculator` para entender el state del editor.
- Mirar el RPC `upsert_recipe_with_ingredients` en `migrations/` antes de cambiar `saveRecipe`.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/recipes.ts` — lecturas.
- `src/components/recipes/RecipesCsvImportPanel.tsx` — importación CSV de cabeceras.
- `src/lib/importing/recipes-csv.ts` — parser puro de CSV de recetas.
- `src/app/actions/saveRecipe.ts` — escritura atómica.
- `src/components/recipes/RecipeEditorClient.tsx` — UI principal.
- `src/components/recipes/IngredientSelector.tsx` — picker.
- `src/components/recipes/RecipeBuilder.tsx` — tabla de ingredientes.
- `src/hooks/useRecipeCalculator.ts` — state del editor.
- `src/lib/recipe-utils.ts` — `formatRecipeIngredient`.
- `src/types/schema.ts` — `RecipeSchema`, `RecipeIngredientSchema`.
- `migrations/*` — si cambias el RPC o el esquema.

**Qué probar manualmente:**
- Crear receta con 5 ingredientes maestros → ver coste actualizado.
- Añadir sub-receta → ver que el coste se suma correctamente.
- Cambiar precio de un ingrediente desde `/ingredients` → volver a `/recipes/[id]/edit` y verificar `current_cost` actualizado.
- Borrar una receta usada como sub-receta → ver qué pasa (debería avisar; si no avisa, es bug).
- Escalar 5x → verificar todas las cantidades multiplicadas.
- Imprimir ficha → comprobar render PDF / HTML.
- Eliminar receta → confirmar que `recipe_ingredients` también se borran.

**Si cambias la fórmula de coste:**
1. Actualizar `useRecipeCalculator`.
2. Actualizar `getRecipes` (margen calculado).
3. Actualizar [T04](./T04-financial-math.md).
4. Considerar regenerar `current_cost` para todas las recetas (script SQL one-off).
5. Avisar que Menu Engineering reflejará el cambio en próximos reportes.

**Si añades soporte para más niveles de sub-receta:**
- Modificar `stock-actions.ts::getIngredientConsumption` (actualmente 5 niveles).
- Cuidado con ciclos: si A usa B y B usa A → loop infinito. Añadir detección.
