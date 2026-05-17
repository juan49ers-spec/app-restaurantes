# 17 — Admin (Panel super-administrador)

**Rutas:** `/admin`, `/admin/restaurants`, `/admin/users`, `/admin/billing`, `/admin/audit`, `/admin/invoice-validation`
**Archivos clave:** `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, subrutas en `src/app/admin/*`, `src/app/actions/admin.ts`, `src/app/actions/admin-queries.ts`, `src/app/actions/admin-billing.ts`, `src/app/actions/impersonate.ts`, `src/app/actions/broadcasts.ts`, `src/components/admin/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito y rol en el negocio

Panel exclusivo para super-administradores de la plataforma (Anthropic-style, no para clientes). Gestiona los restaurantes (clientes), los usuarios, la facturación (planes y créditos OCR), la auditoría del sistema y la validación cruzada de facturas. Único punto desde donde se puede impersonar a un cliente para soporte.

## 2. Viaje del usuario

### `/admin` (dashboard)

1. Admin entra. `AdminLayout` verifica `user.email ∈ ADMIN_EMAILS`. Si no, `redirect('/')`.
2. Layout envuelve en `<AdminShell>` (sidebar + nav).
3. Page carga `getAdminDashboardData()`:
   - Total restaurantes activos, ventas/gastos del mes, 50 audit logs recientes.
   - Health check del sistema (usuarios activos/inactivos, días sin usar).
   - Broadcasts activos.
4. Renderiza `AdminDashboardClient` con KPIs y gráficos.

### `/admin/restaurants`
- `RestaurantList`: tabla de todos los restaurantes con datos: name, owner email, modules activos, sales/expenses del mes, employee count.
- Acciones: editar módulos (`toggleRestaurantModule`), impersonar (`startImpersonation`), eliminar (`deleteRestaurant` cascade).

### `/admin/users`
- `UserManagement`: lista usuarios registrados.
- Acciones: asignar a restaurante (`updateUserRestaurant`), ver rol (admin/regular).

### `/admin/billing`
- `BillingManager` + `BillingModulesConfig`.
- Subpaneles:
  - **Por restaurante:** cambiar plan (`changeRestaurantPlan`), ajustar créditos OCR (`adjustCredits`), registrar pago (`registerPayment`), ver historial (`getBillingHistory`).
  - **Catálogo de módulos:** editar precios y features de `billing_modules`.

### `/admin/audit`
- `AuditLogViewer`: paginada (`getAuditLogs`). Filtros: tabla, acción (INSERT/UPDATE/DELETE), restaurant_id, changed_by, fecha.

### `/admin/invoice-validation`
- `ValidationInboxComponent`: items extraídos de OCR en `ingestion_buffer` pendientes de validar (cross-restaurant). Permite confirmar mapeo a ingredientes y reglas de auto-extracción.

## 3. Flujo técnico de datos

**Lectura (con `requireAdmin()`):**
- `getAdminDashboardData()`, `getAllRestaurants()`, `getAdminUsers()` (RPC `admin_list_users`), `getAuditLogs(page, pageSize)`, `getBillingOverview()`, `getRestaurantsBillingList()`, `getBillingHistory(restaurantId)`.

**Mutaciones (con `requireAdmin()` o `requireSuperAdmin()`):**
- `toggleRestaurantModule(restaurantId, moduleName, level)` — actualiza `modules` y sincroniza `active_addons`.
- `updateUserRestaurant(userId, restaurantId)` — RPC `admin_update_user_restaurant`.
- `deleteRestaurant(restaurantId)` — RPC `admin_delete_restaurant_cascade` (borra todo el árbol).
- `changeRestaurantPlan(restaurantId, addons[])` — actualiza `active_addons`, calcula precio nuevo, inserta evento `PLAN_CHANGE` en `billing_events`.
- `adjustCredits(restaurantId, amount, reason)` — suma/resta `ocr_credits` (min 0). Inserta `CREDIT_ADJUSTMENT`.
- `registerPayment(restaurantId, amount, concept)` — inserta `PAYMENT`.
- `startImpersonation(restaurantId, restaurantName)` — cookies `httpOnly`.
- `stopImpersonation()` — borra cookies.
- `createBroadcast(payload)` — anuncio global (`requireSuperAdmin`).
- `endBroadcast(id)`.

**Componentes:**
- `AdminShell` — sidebar admin con NAV_ITEMS hardcoded.
- `AdminDashboardClient`, `RestaurantList`, `UserManagement`, `BillingManager`, `BillingModulesConfig`, `AuditLogViewer`, `ValidationInboxComponent`.

## 4. Reglas de negocio y restricciones

- **Acceso:** check de email contra `ADMIN_EMAILS` en `AdminLayout`. Si email no está, redirect inmediato.
- **`requireAdmin()` en TODAS las queries y mutations:** doble cinturón (layout + action).
- **`requireSuperAdmin()`** para mutaciones de billing — debe quedar más restrictivo que admin general (en la práctica son los mismos emails actualmente, pero el helper existe para diferenciar a futuro).
- **`active_addons` se sincroniza con `modules`** cada vez que se actualiza el plan. Si los desincronizas, los filtros del sidebar de usuarios fallan.
- **`ocr_credits` no puede ser negativo** — `adjustCredits` usa `Math.max(0, ...)`.
- **Billing events** auditan TODOS los cambios de plan/créditos/pagos. No se borran.
- **Impersonación:** `auth.uid()` sigue siendo el del admin. Los `audit_logs.changed_by` apuntan al admin. Buena trazabilidad.
- **Borrar restaurante (`admin_delete_restaurant_cascade`):** operación destructiva. Elimina todo el árbol (ingredients, recipes, invoices, employees, etc.). No reversible.
- **Broadcasts:** sin `restaurant_id`. Globales. Solo super-admin.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `restaurants`, `auth.users`, `audit_logs`, `billing_modules`, `billing_events`, `broadcasts`, `ingestion_buffer`, y todo el árbol de datos del restaurante cuando se elimina.
- **Otras páginas afectadas:**
  - Cualquier cambio aquí afecta a los restaurantes-cliente. `toggleRestaurantModule` cambia lo que ven en sidebar inmediatamente (vía `revalidatePath('/', 'layout')`).
  - Impersonación hace que las páginas operativas (`/`, `/financial-control`, etc.) muestren datos del restaurante impersonado.
- **Transversales:**
  - [T03](./T03-autenticacion.md) — toda la lógica de admin/permission/impersonation.
  - [T02](./T02-base-de-datos.md) — tablas y RPCs admin.
  - [T06](./T06-server-actions-comunes.md) — patrón de actions.

## 6. Casos límite y errores conocidos

- **Email admin con espacio inicial:** se compara con `.trim().toLowerCase()`. Asegúrate de que `ADMIN_EMAILS` esté en minúsculas sin espacios.
- **Eliminar restaurante con su único owner:** el owner queda huérfano (sin restaurante). En su próximo login irá a `/onboarding`.
- **Cambiar plan de un restaurante impersonado:** la cookie se mantiene, pero al refrescar la app, el sidebar puede actualizar antes que la cookie. Operacionalmente OK pero confuso.
- **Validation inbox cross-restaurant:** tiene una lógica mixta — `page.tsx` lee `ingestion_buffer` filtrando por `restaurant_id` del usuario logueado (no admin general). Confirmar si es intencional.
- **Sin lock al cambiar de plan:** si dos admins cambian plan a la vez para el mismo restaurante, last-write-wins.
- **`audit_logs` puede crecer mucho:** sin purga automática. Considerar archivado.
- **Health check `admin_get_system_health` puede ser lento** si hay muchos usuarios y restaurantes — no está paginado.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer [T03](./T03-autenticacion.md) entero.
- Confirmar si la nueva función es `admin` general o `super-admin`.
- Si toca billing, mirar `billing_events` para entender el patrón de auditoría.

**Archivos que suelen cambiar a la vez:**
- `src/app/admin/layout.tsx`, `page.tsx` y subrutas.
- `src/app/actions/admin.ts`, `admin-queries.ts`, `admin-billing.ts`, `impersonate.ts`, `broadcasts.ts`.
- `src/components/admin/*` — componentes UI del panel.
- `src/middleware.ts` — si cambia la lista de admins (3 sitios).
- `src/app/page.tsx` — idem.

**Qué probar manualmente:**
- Login como admin → llegar a `/admin`.
- Login como NO admin → intentar `/admin` → redirect a `/`.
- Cambiar módulos de un restaurante → ver que `active_addons` se actualiza y que el sidebar del usuario afectado refleja el cambio.
- Ajustar créditos OCR → ver evento en `billing_events`.
- Registrar pago → idem.
- Impersonar restaurante → ver banner amarillo abajo. Toda la app debe mostrar datos del restaurante impersonado.
- Stop impersonation → vuelta a `/admin/restaurants`, cookies borradas.
- Crear broadcast → ver banner global en todos los restaurantes hasta `active_until`.
- Eliminar restaurante → confirmar cascade (todo el árbol borrado, audit log lo refleja).
- Audit log con paginación → cargar página 2.

**Si añades un nuevo email admin:**
1. Edita `ADMIN_EMAILS` en `middleware.ts`, `app/page.tsx` y `actions/admin-queries.ts`.
2. Probar login con ese email → debe redirigir a `/admin`.
3. Considerar centralizar la lista en un sitio único (refactor pendiente).

**Si añades una nueva mutación admin:**
1. `requireAdmin()` o `requireSuperAdmin()` al inicio.
2. Si toca billing, insertar `billing_events`.
3. Si toca módulos, sincronizar `active_addons`.
4. `revalidatePath('/admin/...')` + `revalidatePath('/', 'layout')` para refrescar el usuario afectado.

**Cambios delicados:**
- Centralizar `ADMIN_EMAILS` en una tabla o env var: bueno a futuro, requiere actualizar 3+ referencias.
- Convertir borrado de restaurante en soft delete: cambia el contrato actual ("eliminar = irrecuperable").
- Cambiar `auth.uid()` durante impersonación: rompe la trazabilidad. No hacer.
