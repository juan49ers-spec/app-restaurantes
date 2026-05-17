# 06 — Escandallos

**Ruta:** `/escandallos`
**Archivos clave:** `src/app/escandallos/page.tsx`, `src/app/escandallos/client.tsx`
**Transversales relacionados:** [T01](./T01-arquitectura.md)

## 1. Propósito y rol en el negocio

Página-hub que agrupa en un solo lugar dos áreas íntimamente relacionadas: **Recetas** (fichas técnicas) e **Ingredientes maestros**. En español, "escandallo" significa el desglose de costes de una receta — por eso esta página es el punto de entrada cuando el usuario piensa en "controlar costes de cocina".

No es una entidad nueva: es UX puro (alias consolidado). Cambios hechos aquí afectan los mismos datos que `/recipes` y `/ingredients`.

## 2. Viaje del usuario

1. Entra a `/escandallos`.
2. Ve un selector de tabs:
   - **Recetas** (default).
   - **Ingredientes**.
3. Tab "Recetas" → renderiza la experiencia de [07 — Recipes](./07-recipes.md).
4. Tab "Ingredientes" → renderiza la experiencia de [08 — Ingredients](./08-ingredients.md).
5. Toda la funcionalidad CRUD es la misma que las páginas individuales.

## 3. Flujo técnico de datos

- **Componente cliente:** `EscandallosClient` — solo orquesta el tab switch.
- Renderiza `RecipesClientPage` (de `/recipes`) o `IngredientsClientPage` (de `/ingredients`) según el tab.
- Las server actions consumidas son las mismas:
  - `getRecipes()`, `getRecipeDetails()`, `saveRecipe()`, `deleteRecipe()`.
  - `getIngredients()`, `createIngredient()`, `updateIngredientPrice()`, etc.

## 4. Reglas de negocio y restricciones

- Sin validación cruzada nueva. Las reglas son las de [07 — Recipes](./07-recipes.md) y [08 — Ingredients](./08-ingredients.md).
- El tab activo se mantiene en estado local (sin URL param actualmente — al refrescar vuelve al default).
- Visible en sidebar solo si `active_addons.includes('operativa')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** las mismas que [07](./07-recipes.md) y [08](./08-ingredients.md) (`recipes`, `recipe_ingredients`, `master_ingredients`, `price_history`).
- **Otras páginas afectadas:** cualquier cambio aquí se ve también en `/recipes` y `/ingredients`.
- **Transversales:** [T01](./T01-arquitectura.md) — esta página es el ejemplo canónico de "hub UI con tabs internos sin URL propia".

## 6. Casos límite y errores conocidos

- **Tab no es deep-linkeable.** Recargar la página vuelve al default. Si se quiere persistir, añadir `?tab=recipes|ingredients` al URL.
- **Duplicación visual del menú:** los items "Escandallos" y "Recetas"/"Ingredientes" pueden coexistir en sidebar/menú si no se sincroniza la navegación.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Esta página rara vez se toca por sí misma. Si la función pertenece a recetas, modificar en [07 — Recipes](./07-recipes.md). Si a ingredientes, en [08 — Ingredients](./08-ingredients.md).
- Sólo tocar `escandallos/client.tsx` si añades un tercer tab o cambias el comportamiento del selector.

**Archivos que suelen cambiar a la vez:**
- `src/components/recipes/RecipesClientPage.tsx` (re-usado aquí).
- `src/components/ingredients/IngredientsClientPage.tsx` (re-usado aquí).

**Qué probar manualmente:**
- Tab "Recetas" muestra la misma tabla que `/recipes`.
- Tab "Ingredientes" muestra la misma tabla que `/ingredients`.
- Crear una receta desde `/escandallos` la deja visible en `/recipes`.
- Si añades un tab nuevo (ej. "Sub-recetas"), pruébalo en ambas rutas si reusas componente.

**Si añades persistencia de tab por URL:**
1. Cambiar `EscandallosClient` para leer `searchParams.tab` (server component si la página es server).
2. Cambiar tabs internos a `<Link>` que actualicen `?tab=`.
3. Probar que recargar mantiene el tab activo.
4. Considerar si afecta el deep-linking desde otras páginas (`/dashboard` → "Ir a escandallos > Ingredientes").
