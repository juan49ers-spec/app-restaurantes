# Supabase migrations

## Naming convention

All new migrations must use the Supabase timestamp convention:

```text
YYYYMMDDHHmmss_descripcion.sql
```

Example:

```text
20260529103000_create_alert_notifications.sql
```

Do not rename migrations that have already been applied to Supabase. Supabase
tracks migrations by filename, so renaming a historical migration can break
environment synchronization even when the SQL content is unchanged.

## Legacy migration names kept intentionally

The following files do not follow the current naming convention. They are kept
because they are historical migrations that may already be tracked by Supabase
en existing environments.

| File | Represents | Why it is preserved |
| --- | --- | --- |
| `CORRECCION_supplier_id.sql` | Adjusts `supplier_items.supplier_id` from UUID to text for supplier codes such as `SUPP-001`. | Historical corrective migration; renaming could desynchronize applied migration history. |
| `DIAGNOSTICO_recipe_ingredients.sql` | Diagnostic query for inspecting the `recipe_ingredients` schema. | Historical troubleshooting artifact retained for migration traceability. |
| `PASO1_tablas.sql` | Initial creation of ingredient, supplier item, recipe, and recipe ingredient tables. | Historical setup migration; kept under its original tracked name. |
| `PASO1_tablas_CORREGIDA.sql` | Recreates `supplier_items` with `supplier_id` as text. | Historical correction path; kept for compatibility with environments that recorded it. |
| `PASO2_funciones.sql` | Creates recipe cost calculation functions and triggers. | Historical function/trigger migration; name is preserved to avoid migration history drift. |
| `PASO3_seed_data.sql` | Inserts early demo seed data for ingredients, supplier items, recipes, and recipe ingredients. | Historical seed migration; kept as-is for reproducibility of older environments. |
| `SOLUCION_DEFINITIVA_recipe_ingredients.sql` | Recreates `recipe_ingredients` with the master ingredient schema and foreign keys. | Historical schema repair; original filename may be tracked in Supabase. |
| `SOLUCION_recrear_recipe_ingredients.sql` | Alternative repair script for recreating `recipe_ingredients` with required columns. | Historical repair migration; retained to avoid renaming an applied file. |

## Rules for future migrations

- Use a timestamped filename.
- Make migrations additive whenever possible.
- Do not edit migrations already applied to shared or production environments.
- Do not include real production data or secrets.
- Prefer idempotent statements such as `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, and `CREATE INDEX IF NOT EXISTS` when appropriate.
- Update `docs/ai/T02-base-de-datos.md` when a schema change affects the data model, RLS, or operational behavior.
