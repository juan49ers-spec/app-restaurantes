# T09 — Capa de Servicios (`src/lib/services/`)

**Archivos clave:** `src/lib/services/BusinessRulesService.ts`, `FinancialAlertsService.ts`, `InvoiceAtomicService.ts`, `InvoiceIngestionService.ts`
**Transversales relacionados:** [T07](./T07-ocr-pipeline.md), [05-Invoices](./05-invoices.md), [04-Financial Control](./04-financial-control.md)

## 1. Propósito

Capa de lógica de negocio reutilizable que vive entre las Server Actions y la base de datos. Encapsula reglas complejas que no pertenecen a una sola página: umbrales de negocio versionados, detección de anomalías financieras, persistencia transaccional de facturas y matching inteligente de ingredientes.

## 2. BusinessRulesService

Motor de reglas de negocio versionadas con vigencia temporal.

**Tipos de regla (`RuleType`):**

| Tipo | Descripción | Ejemplo de valor |
|------|-------------|-----------------|
| `cogs_target` | Objetivo de coste de materia prima (% sobre ventas) | `target_percentage: 30` |
| `labor_target` | Objetivo de coste de personal (% sobre ventas) | `target_percentage: 35` |
| `margin_target` | Margen neto objetivo por receta | `target_percentage: 65` |
| `waste_threshold` | Umbral de alerta de merma (% incremento) | `warning_threshold: 50` |

**Cada regla tiene:**
- `version` (autoincremental) — permite auditoría.
- `valid_from` / `valid_until` — vigencia temporal. Permite "time-travel": consultar qué regla estaba activa en un mes pasado.
- `is_active` — soft delete.

**Métodos:**

| Método | Descripción |
|--------|-------------|
| `getActiveRule(restaurantId, ruleType, date?)` | RPC `get_active_business_rule` — busca regla vigente en la fecha dada (default: hoy). |
| `createRule(restaurantId, rule)` | Auto-incrementa versión, inserta nueva regla. |
| `getAllRules(restaurantId)` | Todas las reglas ordenadas por tipo y fecha. |
| `deactivateRule(ruleId)` | Soft delete (`is_active = false`). |

**Singleton:** `businessRulesService` (importar directamente).

## 3. FinancialAlertsService

Detección proactiva de anomalías. Se apoya en `BusinessRulesService` para obtener umbrales.

**Checks disponibles:**

| Check | Qué mira | Cuándo alerta |
|-------|----------|---------------|
| `checkRecipeMargins(restaurantId)` | Margen de cada receta vs `margin_target` | Margen por debajo del objetivo → `margin_deviation` |
| `checkExpenseAnomalies(restaurantId)` | Gastos de últimos 7 días vs `daily_sales` | Día con gasto food/beverage sin ventas → `expense_anomaly` |
| `checkWasteSpikes(restaurantId)` | Media de merma últimos 7 días vs media anterior | Incremento > `waste_threshold` (default 50%) → `waste_spike` |

**`runAllChecks(restaurantId)`** — ejecuta los tres en paralelo.

**Severidad de alertas:** `info`, `warning`, `critical`.

**Métodos de gestión:**
- `createAlert(input)` → INSERT en `financial_alerts`.
- `getUnreadAlerts(restaurantId)` → alertas sin leer, ordenadas por fecha.
- `markAsRead(alertId)` / `markAsResolved(alertId)`.

**Singleton:** `financialAlertsService`.

## 4. InvoiceAtomicService

Persistencia transaccional de facturas. Ver [T07 § 6](./T07-ocr-pipeline.md#6-servicio-atómico-invoiceatomicservicets).

**Funciones:**
- `saveInvoiceWithItems(data)` → RPC `upsert_invoice_with_items`.
- `generateIdempotencyKey(data)` → base64 determinista.
- `saveInvoiceWithIdempotency(data)` → combina ambas.

## 5. InvoiceIngestionService

Matching inteligente de ingredientes con fuzzy search. Ver [T07 § 5](./T07-ocr-pipeline.md#5-servicio-de-ingesta-invoiceingestionservicets).

**Función principal:** `processInvoicePayload(invoiceId, supplierId, lineItems)`.

## 6. Tablas involucradas

| Servicio | Tablas |
|----------|--------|
| BusinessRules | `business_rules` |
| FinancialAlerts | `recipes`, `operating_expenses`, `daily_sales`, `waste_logs`, `financial_alerts` |
| InvoiceAtomic | `invoices`, `invoice_items` (vía RPC) |
| InvoiceIngestion | `invoices`, `supplier_items`, `master_ingredients`, `ingestion_buffer`, `price_history`, `alerts` |

## 7. Al modificar un servicio

- **Si se cambia un umbral por defecto:** actualizarlo aquí y en el seed/onboarding que cree las reglas iniciales.
- **Si se añade un nuevo tipo de regla:** añadirlo al union type `RuleType` y documentar aquí.
- **Si se añade un nuevo check financiero:** añadirlo en `FinancialAlertsService`, registrarlo en `runAllChecks()`, y documentar aquí.
- **Los servicios son singletons** — no instanciar con `new`, importar la variable exportada.
