# T02 — Base de datos (Supabase / PostgreSQL)

> Transversal. Cualquier mutación que añadas debe respetar `restaurant_id`, RLS y triggers de auditoría.

## Generalidades

- **Engine:** Supabase (PostgreSQL).
- **Multi-tenant a nivel fila:** casi toda tabla operativa tiene `restaurant_id UUID` y políticas RLS que limitan acceso al `owner_id = auth.uid()`.
- **Migraciones:** `migrations/` (al lado de la raíz) + `supabase/migrations/`. Hay varios "force fix" y consolidados (`MIGRACION_COMPLETA_SQL.sql`, `schema-only.sql`).
- **Tipos generados:** `src/types/supabase.ts`. Esquemas Zod: `src/types/schema.ts`.

## Tablas — núcleo multi-tenant

| Tabla | Columnas clave | Propósito |
|-------|----------------|-----------|
| `restaurants` | `id`, `name`, `owner_id`, `modules` (JSON), `active_addons` (text[]), `ocr_credits`, `consultant_name`, `consultant_email`, `consultant_logo_url` | Entidad raíz. Cada usuario regular tiene exactamente un restaurante. Los campos `consultant_*` alimentan la marca del área cliente. |
| `master_ingredients` | `id`, `restaurant_id`, `name`, `base_unit` (`kg`/`l`/`u`), `current_avg_price`, `standard_waste_pct`, `is_active`, `archived_at`, `allergens` (text[]) | Catálogo maestro. Soft delete (no se borra, se marca `is_active=false`). |
| `recipes` | `id`, `restaurant_id`, `name`, `selling_price`, `current_cost`, `target_margin_pct`, `hourly_rate`, `prep_time_minutes`, `yields`, `allergens` | Recetas (escandallos). `current_cost` se recalcula vía trigger cuando cambian precios de ingredientes. |
| `recipe_ingredients` | `recipe_id`, `master_ingredient_id` o `sub_recipe_id`, `quantity_gross`, `quantity_net`, `yield_factor`, `cost_at_time` | Soporta sub-recetas (una receta puede usar otra como ingrediente). |
| `suppliers` | `id`, `restaurant_id`, `name`, `tax_id`, `payment_terms`, `reliability_score`, `trend_direction`, `contract_renewal_date` | Proveedor + scorecard. |
| `supplier_items` | `id`, `restaurant_id`, `supplier_id`, `name_on_invoice`, `sku_on_invoice`, `last_price`, `pack_size`, `master_ingredient_id` | Catálogo "qué le compro a quién" + conversión de pack. |
| `supplier_aliases` | `restaurant_id`, `alias_name`, `supplier_id`, `master_ingredient_id`, `confidence_score`, `quantity_per_unit` | Aprendizaje de OCR: mapea texto de factura → proveedor/ingrediente. |
| `invoices` | `id`, `restaurant_id`, `supplier_id`, `file_url`, `status`, `invoice_number`, `total_amount`, `date`, `scanned_data` (JSONB), `idempotency_key` | Estados: `uploading` → `processing` → `review_required` → `completed` (o `error`). |
| `invoice_items` | `invoice_id`, `description`, `quantity`, `unit_price`, `total_price`, `tax_rate`, `tax_amount` | Líneas de la factura. Cascada en delete. |

## Tablas — finanzas y operación

| Tabla | Columnas clave | Propósito |
|-------|----------------|-----------|
| `daily_sales` | `restaurant_id`, `date`, `revenue_total`, `base_10`, `tax_10`, `base_21`, `tax_21`, `revenue_dine_in/takeout/delivery`, `iva_collected`, `total_covers`, `labor_hours`, `cost_of_goods`, `labor_cost`, `day_status` (`OPEN`/`CLOSED`/`LOCKED`) | Consolidación diaria con breakdown multi-IVA (10% y 21% es lo habitual en hostelería ES). |
| `operating_expenses` | `restaurant_id`, `expense_date`, `category` (enum 15 valores), `amount` (puede ser negativo), `description`, `tag`, `payment_method`, `recurrence`, `is_paid`, `taxable_amount`, `tax_rate`, `tax_amount`, `withholding_rate`, `is_professional_invoice`, `idempotency_key` | Gastos con grupos PERSONAL/COGS/OPERATIONS/FINANCIAL (ver `EXPENSE_GROUPS` en `schema.ts`). |
| `monthly_targets` | `restaurant_id`, `month_year` (`YYYY-MM`), `revenue_target`, `cogs_target_pct`, `labor_target_pct` | Presupuesto mensual. |
| `monthly_results` | `restaurant_id`, `month_year`, `ingresos_netos`, `personal_total`, `materia_prima_total`, `resultado_bruto/neto`, `margen_neto`, `is_closed`, `closed_by`, `closed_at` | Cierre mensual con auditoría. |
| `inventory_stock` | `restaurant_id`, `ingredient_id` (unique), `current_qty`, `min_qty`, `last_updated` | Stock actual. Umbral de alerta. |
| `stock_movements` | `restaurant_id`, `ingredient_id`, `type` (`PURCHASE`/`SALE`/`WASTE`/`ADJUSTMENT`), `quantity`, `reference_id`, `date` | Audit trail. `quantity` positivo = entrada, negativo = salida. |
| `daily_recipe_sales` | `restaurant_id`, `date`, `recipe_id`, `quantity_sold` | Ventas diarias por receta. Alimenta Menu Engineering y deducción de stock. |
| `waste_logs` | `restaurant_id`, `ingredient_id`, `date`, `quantity` (siempre positivo), `reason` (`CADUCADO`/`DAÑADO`/`SOBRANTE`/`PREPARACION`/`OTRO`), `notes` | Pérdidas. Se loguea stock_movement WASTE en paralelo. |
| `price_history` | `restaurant_id`, `entity_id`, `entity_type` (`INGREDIENT`/`RECIPE`), `price`, `previous_price`, `change_pct` | Histórico de precios. Se inserta automáticamente cuando hay cambio >1%. |

## Tablas — equipo

| Tabla | Columnas clave | Propósito |
|-------|----------------|-----------|
| `employees` | `restaurant_id`, `first_name`, `last_name`, `role` (enum), `system_access_level`, `status`, `contract_type`, `contract_hours_weekly`, `wage_type`, `hourly_rate`, `monthly_base_salary`, `color_code` | Personal. Roles: MANAGEMENT, KITCHEN_HEAD, KITCHEN_STAFF, FLOOR_MANAGER, FLOOR_STAFF, BAR_STAFF, CLEANING, ADMIN, OTHER. |
| `shifts` | `restaurant_id`, `employee_id`, `date`, `start_time`, `end_time`, `actual_start_time`, `actual_end_time`, `break_minutes`, `shift_type`, `status`, `estimated_cost`, `actual_cost` | Turnos. `estimated_cost = horas * hourly_rate`. |
| `policies` | `restaurant_id`, `title`, `description`, `category`, `is_required`, `is_published` | Políticas internas (Higiene, RRHH, Seguridad…). |
| `staff` | legacy, duplicada con `employees`. **No usar.** | Tabla histórica. Las páginas activas usan `employees`. |

## Tablas — billing, auditoría y meta

| Tabla | Columnas clave | Propósito |
|-------|----------------|-----------|
| `billing_modules` | `id`, `name`, `description`, `price_monthly`, `price_yearly`, `is_base`, `features` (JSONB), `is_active` | Catálogo global de módulos SaaS. **Sin `restaurant_id`** (es global). |
| `billing_events` | `restaurant_id`, `event_type` (`PLAN_CHANGE`/`PAYMENT`/`CREDIT_ADJUSTMENT`), `details` (JSON), `created_at` | Log de cambios de plan, ajustes de crédito OCR, pagos. |
| `audit_logs` | `table_name`, `record_id`, `action` (INSERT/UPDATE/DELETE), `old_data`, `new_data`, `changed_by`, `restaurant_id` | Auditoría completa. Trigger automático en `daily_sales`, `operating_expenses`, `employees`, `recipes`. |
| `business_rules` | `restaurant_id`, `rule_name`, `rule_type`, `value` (JSONB), `valid_from`, `valid_until`, `is_active`, `version` | Versioning de reglas (COGS%, labor%, márgenes target, umbrales merma). |
| `financial_alerts` | `restaurant_id`, `alert_type` (margin_deviation/expense_anomaly/waste_spike), `severity` (info/warning/critical), `title`, `metadata` (JSONB), `is_read`, `resolved_at` | Alertas automáticas. |
| `alert_rules` | `restaurant_id`, `rule_type`, `conditions` (JSONB), `channels`, `cooldown_hours`, `is_active` | Reglas que disparan notificaciones. |
| `alert_notifications` | `restaurant_id`, `rule_id` nullable, `type`, `severity`, `title`, `message`, `entity_type`, `entity_id`, `entity_name`, `metadata`, `read`, `read_at`, `created_at` | Notificaciones in-app. Las notificaciones derivadas de reglas usan `rule_id`; las de entrega (`REPORT_PUBLISHED`, `CLIENT_MEETING_REQUEST`) pueden tener `rule_id = NULL`. |
| `broadcasts` | `id`, `title`, `body`, `severity`, `active_from`, `active_until`, `created_by` | Anuncios globales del super-admin. **Sin `restaurant_id`** (sistema). |
| `scenarios` | `id`, `user_id`, `name`, `base_revenue`, `base_expenses`, `adjustments` (JSONB) | Simulaciones what-if del simulador financiero. |
| `professional_report_drafts` | `restaurant_id`, `period_from`, `period_to`, `version`, `status`, `schema_version`, `report_snapshot` (JSONB), `narrative_overrides` (JSONB), `exported_at`, `published_at`, `published_by`, `viewed_at` | Versiones guardadas de informes profesionales. Snapshot inmutable para exportacion. Desde Fase 6 puede incluir `menu_performance`; desde Fase 8 puede incluir `menu_engineering` derivado de un snapshot BCG `ANALYZED`. Desde Fase 9 solo las filas con `published_at IS NOT NULL` aparecen en el portal cliente. Desde Fase 14, `viewed_at` registra la apertura del detalle web del informe por el cliente/restaurante. |
| `portal_meeting_requests` | `restaurant_id`, `report_id`, `message`, `status`, `created_by`, `created_at` | Solicitudes de reunión desde el portal cliente. `status`: `PENDING`, `ACKNOWLEDGED`, `COMPLETED`. RLS por restaurante propietario. |
| `consultant_restaurants` | `consultant_user_id`, `restaurant_id`, `role`, `status` | Relación explícita consultor-restaurante para cartera multi-cliente. `status='ACTIVE'` permite seleccionar el restaurante en `/consultant`; `PAUSED`/`REVOKED` no dan acceso operativo. La escritura queda limitada a super-admins por política RLS adicional. |
| `super_admins` | `email`, `created_at` | Allowlist SQL de super-admins usada por `public.is_super_admin()`. Debe mantenerse alineada con `ADMIN_EMAILS` del entorno de la app. |
| `menu_reports` / `menu_report_items` | `menu_reports.restaurant_id`, snapshots de coste/precio/cantidad en items | Informes BCG de Menu Engineering. Desde `20260526083000_secure_menu_engineering_rls.sql` ambos tienen RLS: `menu_reports` filtra por restaurante propietario y `menu_report_items` hereda permisos por su reporte padre. |
| `ingestion_buffer` | items extraídos por OCR pendientes de mapear | Cola intermedia entre OCR y `invoice_items` confirmados. |

## RLS (Row Level Security)

- **Patrón base:** `USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))`.
- Tablas globales (`billing_modules`, `broadcasts`, `super_admins`, `auth.users`) tienen políticas distintas o son leídas en server con service role/funciones `SECURITY DEFINER`.
- `audit_logs` requiere rol admin para SELECT (lo consume `/admin/audit`).
- **No bypass cliente:** todas las acciones de mutación se hacen en server actions; el `restaurant_id` se inyecta server-side (ver [T03](./T03-autenticacion.md)).

## Triggers principales

| Trigger | Origen | Efecto |
|---------|--------|--------|
| `update_recipe_costs_trigger` | UPDATE `master_ingredients.current_avg_price` | Recalcula `recipes.current_cost` de todas las recetas que usan ese ingrediente. |
| `fn_audit_log_trigger` | INSERT/UPDATE/DELETE en `daily_sales`, `operating_expenses`, `employees`, `recipes` | Inserta fila en `audit_logs`. |
| `handle_updated_at` | UPDATE en `employees`, `shifts`, `policies`, `billing_modules` | Actualiza `updated_at = NOW()`. |

## Índices destacados

- `idx_daily_sales_date`, `idx_operating_expenses_date` — consultas por fecha.
- `idx_inventory_stock_restaurant`, `idx_stock_movements_restaurant_date` — operaciones de stock.
- `idx_invoices_idempotency`, `idx_operating_expenses_idempotency` — anti-duplicado.
- `idx_business_rules_restaurant_type`, `idx_financial_alerts_restaurant_unread` — alertas y reglas.
- `idx_professional_report_drafts_restaurant_period`, `idx_professional_report_drafts_restaurant_updated` — historial y exportacion de informes profesionales.
- `idx_professional_report_drafts_published` — listado del portal cliente por publicación descendente.
- `idx_professional_report_drafts_viewed` — seguimiento de informes vistos por restaurante.
- `idx_portal_meeting_requests_restaurant_created` — historial de solicitudes de reunión por restaurante.
- `idx_unique_open_portal_meeting_request` — anti-duplicado de solicitudes abiertas (`PENDING`/`ACKNOWLEDGED`) por restaurante e informe.
- `idx_consultant_restaurants_consultant`, `idx_consultant_restaurants_restaurant` — cartera multi-cliente por consultor y por restaurante.

## RPCs (funciones SQL)

Usadas como operaciones atómicas (transacciones):

- `upsert_recipe_with_ingredients(payload jsonb)` — guarda receta + reemplaza sus ingredientes atómicamente. Lo llama `saveRecipe`.
- `process_daily_sales_atomic(restaurant_id, date, sales jsonb)` — explota recetas vendidas en consumo de ingredientes y deduce stock. Lo llama `processRecipeSales`.
- `increment_inventory_stock(restaurant_id, ingredient_id, delta)` — entrada/salida con check de no-negativos.
- `admin_list_users()`, `admin_update_user_restaurant(...)`, `admin_delete_restaurant_cascade(...)`, `admin_get_system_health()` — operaciones de super-admin.
- `public.is_super_admin()` — función `SECURITY DEFINER` que cruza `auth.users.email` con `public.super_admins`. Alimenta políticas RLS admin.

## Convenciones transversales

1. **Soft delete:** `is_active` (bool) + `archived_at` en `master_ingredients`. Otras tablas usan delete duro pero con cascade controlado.
2. **Timestamps:** `created_at`, `updated_at` siempre en UTC.
3. **Idempotencia:** clave única `idempotency_key` en `invoices` y `operating_expenses` evita duplicados si una mutación se reintenta.
4. **Soft closure:** `monthly_results.is_closed/closed_at/closed_by` permite "cerrar" un mes sin borrarlo.
5. **JSONB flexible:** `invoices.scanned_data` (resultado OCR), `business_rules.value`, `alert_notifications.metadata`, `scenarios.adjustments`.
6. **Enums fuertes** en `OperatingExpenseCategory` (15 valores), `StaffRole`, `ContractType`, `InvoiceStatus`, `WasteReason`, `StockMovementType`.

## Reglas duras al modificar el esquema

1. **Nunca** consultar Supabase desde el cliente con `restaurant_id` viniendo del front. Resolverlo en server.
2. **Nunca** borrar de `master_ingredients` directamente: usar soft delete (`deleteIngredient` en `actions/ingredients.ts`).
3. **No saltarse** los triggers de auditoría: si modificas `daily_sales`/`operating_expenses`/`employees`/`recipes`, el log queda automático.
4. Cambios de esquema requieren añadir una nueva migración con timestamp en `migrations/` y/o `supabase/migrations/`. Regenerar `src/types/supabase.ts` si cambia algún tipo.
5. Al añadir una tabla operativa nueva: incluir `restaurant_id`, una política RLS, e índice por `(restaurant_id, fecha)` si se consulta por rango.

## Cosas no obvias

- `daily_sales.iva_collected` existe por compatibilidad legacy aunque el breakdown moderno usa `tax_10` + `tax_21`.
- `operating_expenses.amount` **puede ser negativo** (correcciones de inventario, devoluciones).
- `master_ingredients.standard_waste_pct` se guarda como decimal `0..1`, no como porcentaje 0..100.
- `recipes.current_cost` está cacheado en la fila. Si tocas precios de ingredientes manualmente en SQL, asegúrate de que el trigger `update_recipe_costs_trigger` esté activo o las recetas quedarán con coste viejo.
- `staff` (singular) es legacy. Toca solo `employees`.
- `broadcasts` y `billing_modules` no tienen `restaurant_id` — son globales.
