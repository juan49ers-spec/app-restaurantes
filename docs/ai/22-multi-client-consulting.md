# 22 — Multi-client consulting

**Ruta:** `/consultant` (evolución multi-cliente)
**Archivos clave:** `src/app/actions/consultant.ts`, `src/app/actions/admin.ts`, `src/app/actions/admin-queries.ts`, `src/app/actions/utils.ts`, `src/lib/consultant/access.ts`, `src/components/consultant/ClientPortfolioPanel.tsx`, `src/components/admin/ConsultantAccessManager.tsx`, `supabase/migrations/20260528114500_consultant_restaurants.sql`, `supabase/migrations/20260528133000_admin_manage_consultant_restaurants.sql`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md), [T06](./T06-server-actions-comunes.md), [17](./17-admin.md), [21](./21-consultant-workspace.md)

## 1. Propósito y rol en el negocio

Permitir que un consultor gestione una cartera de restaurantes sin convertir todavía la app en un producto self-service para restaurantes. El modelo actual de un usuario propietario con un restaurante sigue funcionando; la cartera añade relaciones explícitas consultor-restaurante para escenarios donde el consultor prepara informes de varios clientes.

## 2. Viaje del usuario

1. El consultor entra en `/consultant`.
2. Si tiene más de un restaurante accesible, ve la cartera de clientes.
3. Selecciona un restaurante cliente.
4. El servidor guarda el restaurante activo en una cookie `httpOnly`.
5. Las acciones existentes siguen usando `getUserRestaurant()` y trabajan contra el restaurante activo seleccionado.
6. El consultor prepara datos, informes, portal y seguimiento igual que antes, pero para el cliente elegido.

### Admin

1. El super-admin entra en `/admin/consultants`.
2. Selecciona usuario consultor, restaurante, rol y estado.
3. Guarda la relación con `upsertConsultantRestaurantAccess()`.
4. Puede pausar, reactivar o revocar relaciones existentes.

## 3. Flujo técnico de datos

- `consultant_restaurants` guarda relaciones entre `auth.users.id` y `restaurants.id`.
- `getConsultantPortfolio()` carga restaurantes propios (`restaurants.owner_id`) y relaciones activas (`consultant_restaurants.status='ACTIVE'`).
- `selectConsultantClient({ restaurantId })` valida UUID, comprueba server-side que el usuario es propietario o tiene relación activa, y escribe `active_consultant_restaurant_id` en cookie `httpOnly`.
- `getUserRestaurant()` prioriza, en este orden:
  1. impersonación admin existente;
  2. cookie `active_consultant_restaurant_id` si existe relación activa;
  3. restaurante propio por `owner_id`;
  4. fallback legacy `user_metadata.restaurant_id`.
- `ClientPortfolioPanel` renderiza la cartera y llama a la action de selección. No envía ni decide permisos; solo solicita abrir un restaurante.
- `/admin/consultants` carga `getConsultantAccessAdminData()` y renderiza `ConsultantAccessManager`.
- `upsertConsultantRestaurantAccess(input)` y `updateConsultantRestaurantAccessStatus(input)` requieren `requireAdmin()`, validan con Zod y escriben en `consultant_restaurants`.

## 4. Reglas de negocio y restricciones

- `restaurant_id` no se acepta como dato confiable en acciones operativas.
- Seleccionar cliente no da acceso por sí mismo: la action verifica propiedad o relación activa antes de escribir la cookie.
- Una relación `PAUSED` o `REVOKED` no permite seleccionar el restaurante.
- El modelo n=1 sigue siendo válido. Si el usuario solo tiene un restaurante, el panel de cartera no se muestra.
- No se crean usuarios de cliente final ni portal self-service de carga de datos en esta fase.
- La tabla nueva tiene RLS y `GRANT SELECT` explícito para compatibilidad con la Data API moderna de Supabase.
- La escritura de relaciones queda limitada por política RLS de super-admin (`public.is_super_admin()`, respaldada por `public.super_admins`), además del `requireAdmin()` de las actions.

## 5. Dependencias e implicaciones cruzadas

- **Consultant Workspace:** muestra la cartera y usa el cliente activo.
- **Auth:** `getUserRestaurant()` ahora entiende la cookie de cliente activo para relaciones de consultoría.
- **RLS:** `consultant_restaurants` permite lectura al consultor vinculado y al owner del restaurante.
- **Admin:** `/admin/consultants` es el único punto UI para crear o cambiar relaciones.
- **Admin impersonation:** sigue teniendo prioridad sobre la cookie de cliente activo.
- **Futuro:** onboarding multi-cliente, billing por cliente y roles avanzados deben apoyarse en esta relación, no en `user_metadata`.

## 6. Casos límite y errores conocidos

- Si la migración no está aplicada, la app sigue funcionando para propietarios porque `getUserRestaurant()` cae al modelo `owner_id`.
- Si la cookie apunta a un restaurante ya revocado, se ignora y se vuelve al restaurante propio/fallback.
- Si un usuario solo tiene relaciones de consultor y ningún restaurante propio, necesita seleccionar un cliente válido para que las pantallas operativas funcionen completamente.
- Si hay un cliente duplicado como owner y como consultant link, el rol `OWNER` gana al fusionar cartera.
- Si la política de super-admin o la allowlist `public.super_admins` no están aplicadas en Supabase real, la UI admin cargará pero las mutaciones pueden fallar por RLS.

## 7. Al añadir/modificar una función aquí

1. Leer [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md) y [T06](./T06-server-actions-comunes.md).
2. No usar `user_metadata` para autorizar relaciones de consultoría.
3. No añadir `restaurant_id` a props cliente como autoridad.
4. Añadir tests de aislamiento cuando una action lea o cambie el cliente activo.
5. Si se añaden permisos de escritura a `consultant_restaurants`, crear políticas RLS separadas y tests explícitos.
