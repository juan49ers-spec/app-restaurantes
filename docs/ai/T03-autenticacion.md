# T03 — Autenticación, roles e impersonación

> Transversal. Todo flujo de página depende de quién es el usuario y a qué restaurante pertenece.

## Mecanismo de auth

- **Proveedor:** Supabase Auth.
- **Método único:** email + password (`supabase.auth.signInWithPassword`). No hay OAuth ni magic links implementados, aunque hay un botón "¿Olvidaste tu contraseña?" sin handler.
- **Registro:** `supabase.auth.signUp` desde el mismo `/login`. Sin verificación de email habilitada por defecto.
- **Sesión:** cookies gestionadas por `@supabase/ssr`. El proxy de Next refresca cookies en cada request.

## Decisión de rol

- **No hay tabla `user_roles`.** El rol admin se decide por email contra `ADMIN_EMAILS`.
- **Lista de admins app:** se centraliza en `src/lib/admin-emails.ts`, que lee `process.env.ADMIN_EMAILS` y usa fallback seguro si la variable no existe.
- **Lista de admins SQL:** `public.super_admins` alimenta `public.is_super_admin()` para políticas RLS.
- **Implicación:** añadir/quitar un admin = actualizar `ADMIN_EMAILS` en el entorno de despliegue y `public.super_admins` en Supabase. No duplicar listas en páginas, proxy ni actions.

## Proxy (`src/proxy.ts`)

Responsabilidades:

1. Inyectar cliente Supabase server con cookies del request.
2. Antes de llamar a Supabase, revisa si hay cookie `sb-*auth-token*`.
3. Si no hay cookie y la ruta es pública (`/login`, `/auth`, `/api/health`, `/api/debug`) → deja pasar sin tocar Supabase.
4. Si no hay cookie y la ruta es privada → redirige a `/login` sin llamada de red.
5. Si hay cookie, ejecuta `supabase.auth.getUser()` → user actual.
6. Si **no hay user** y la ruta no es `/login`, `/auth`, `/api/health` o `/api/debug` → redirige a `/login`.
4. Si **hay user y va a `/login`** → redirige a `/admin` (si admin) o `/` (si no).
5. Si **hay user admin y va a `/`** → redirige a `/admin`.

Matcher excluye estáticos (`_next/static`, `_next/image`, `favicon.ico`, imágenes públicas).

## Root layout (`src/app/layout.tsx`)

En cada render:

1. Lee cookies. Si no hay cookie `sb-*auth-token*`, no crea cliente Supabase ni llama `getUser()`.
2. Si hay cookie, `createClient()` server → `supabase.auth.getUser()`.
3. Si hay user, importa dinámicamente `getCurrentRestaurant()` y obtiene:
   - `activeAddons` (array de strings)
   - `restaurantId`
   - `restaurantName`
4. Lee cookies para detectar impersonación: `impersonated_restaurant_name`.
5. Solo carga broadcasts activos vía `getActiveBroadcasts()` si hay user.
6. Renderiza `<AppLayout>` con esos datos.

## Resolución del `restaurant_id` en server actions

Centralizada en `src/app/actions/utils.ts::getUserRestaurant()` con orden de prioridad:

1. **Si es admin con impersonación activa** (cookie `impersonated_restaurant_id` + `isAdminEmail(user.email)`): usa ese `restaurant_id`.
2. **Si hay cliente de consultoría activo** (cookie `active_consultant_restaurant_id`): solo se usa si existe una relación `consultant_restaurants` activa para `auth.uid()`.
3. Restaurante donde `owner_id = user.id`.
4. Fallback: `user.user_metadata.restaurant_id` solo si existe y es string.
5. Si nada → retorna `null` (la action debe responder con error/redirect).

Hay también `getCurrentRestaurant()` en `src/app/actions/user.ts` que retorna el objeto restaurante completo y usa `React.cache()` para deduplicar lecturas dentro del mismo render.

**Regla dura:** el cliente **jamás** envía `restaurant_id`. Cualquier action que lo acepte como parámetro del cliente es vulnerable a IDOR — corregirlo.

## Cartera de consultoría

La Fase 17 introduce `consultant_restaurants` para que un usuario consultor pueda trabajar con varios restaurantes sin ser owner de todos. La selección se hace desde `/consultant` con `selectConsultantClient({ restaurantId })`, pero esa action valida server-side que el usuario es propietario o tiene una relación activa antes de escribir la cookie `active_consultant_restaurant_id`.

La cookie no concede permisos por sí sola: `getUserRestaurant()` consulta la tabla antes de aceptarla. Si la relación se revoca, se pausa o deja de existir, la cookie se elimina y el flujo cae al restaurante propio o al fallback legacy.

## Onboarding (`/onboarding`)

- Se accede cuando el usuario está autenticado pero no tiene restaurante (`getCurrentRestaurant()` retorna null).
- Algunos puntos del código usan `requireRestaurant()` (en `src/lib/auth-helpers.ts`) que hace el redirect.
- El formulario pide un único campo: nombre del restaurante.
- Inserta en `restaurants` con `owner_id = user.id`. Active addons quedan vacíos / módulos en defaults.
- Después navega con `window.location.href = '/financial-control'` (navegación dura) para forzar re-ejecución del proxy y refresco del layout.

## Sistema de permisos por módulo

Cada restaurante tiene:

- `modules` (JSON): `{ financial_control: 'none'|'basic'|'premium', operativa, proveedores, personal }`.
- `active_addons` (text[]): lista sincronizada con `modules`.

Filtro de sidebar (`Sidebar.tsx`):

| Grupo | Condición |
|-------|-----------|
| CORE (Control Financiero, Facturas) | Siempre visible |
| OPERATIVA (Escandallos, Menu Engineering, Stock, Desperdicios) | `active_addons.includes('operativa')` |
| ESTRUCTURA (Equipo, Turnos, Políticas) | `active_addons.includes('personal')` |
| PROVEEDORES | `active_addons.includes('proveedores')` |
| Admins | Ven todo |

**Cambio de plan:** `toggleRestaurantModule()` en `src/app/actions/admin.ts` actualiza `modules` y sincroniza `active_addons`, luego `revalidatePath('/', 'layout')`.

## Helpers de autorización

En `src/lib/auth-helpers.ts` y en `src/app/actions/`:

- `requireAuth()` — redirige a `/login` si no hay usuario.
- `requireRestaurant()` — redirige a `/onboarding` si no hay restaurante.
- `requireAdmin()` — checa email con `isAdminEmail()`. Si no, `redirect('/')` o error.
- `requireSuperAdmin()` — más restrictivo (usado en billing actions). Actualmente equivalente a `requireAdmin` salvo confirmar.

Patrón de uso en una page server:

```ts
export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const restaurant = await getCurrentRestaurant()
  if (!restaurant) redirect('/onboarding')
  // ... fetch data
}
```

## Impersonación

- **Quién:** solo super-admins.
- **Cómo se activa:** `startImpersonation(restaurantId, restaurantName)` en `src/app/actions/impersonate.ts` setea cookies `httpOnly` `impersonated_restaurant_id` + `impersonated_restaurant_name`. Redirige a `/`.
- **Efecto:** todas las llamadas a `getUserRestaurant()` retornan el restaurante impersonado, por lo que el admin ve toda la app **como si fuera** ese usuario (incluyendo facturas, stock, staff, etc.).
- **UI:** `<ImpersonationBanner>` aparece fijo abajo mientras la cookie exista.
- **Salida:** `stopImpersonation()` borra las cookies y redirige a `/admin/restaurants`.

## Rutas y sus permisos

| Ruta | Acceso |
|------|--------|
| `/login`, `/api/health`, `/api/debug` | Público |
| `/onboarding` | Usuario autenticado sin restaurante |
| `/` (dashboard) | Usuario autenticado con restaurante (admin redirige a `/admin`) |
| `/financial-control`, `/invoices`, `/escandallos`, `/recipes`, `/ingredients`, `/menu-engineering`, `/stock`, `/desperdicios`, `/operational`, `/notifications` | Auth + restaurante. Algunas se ocultan en sidebar según `active_addons` pero la URL sigue siendo accesible si la pegas directamente (revisar caso por caso). |
| `/suppliers`, `/purchasing` | Auth + restaurante + `active_addons.includes('proveedores')` (filtrado en sidebar). |
| `/staff/employees`, `/staff/schedule`, `/staff/policies` | Auth + restaurante + `active_addons.includes('personal')`. |
| `/admin/*` | `requireAdmin()` en `AdminLayout`. Si email no está en lista → `redirect('/')`. |
| `/admin/billing`, mutaciones de billing | `requireSuperAdmin()`. |

## Reglas duras

1. Cualquier mutación que toque datos de un restaurante debe resolver el `restaurant_id` server-side.
2. Cualquier ruta admin debe llamar `requireAdmin()` antes de cualquier query.
3. Si añades un nuevo email admin, actualiza `ADMIN_EMAILS` en `.env.local`/Vercel y añade el email a `public.super_admins`; no hardcodees listas nuevas.
4. Si añades un nuevo módulo de plan, debes: (a) añadirlo al enum de `modules`, (b) actualizar el filtro de sidebar, (c) actualizar `toggleRestaurantModule()` para sincronizar `active_addons`.
5. **No** confíes en el cliente para decidir si el usuario es admin. Re-validar siempre en server.
6. Si una página debe ocultarse del sidebar pero requerir acceso directo controlado, comprobar `active_addons` también en el server de la página, no solo en el sidebar.

## Cosas no obvias

- El layout root **siempre** consulta `getActiveBroadcasts()` sin caché. Cada render del layout = una consulta a `broadcasts`.
- El email se compara con `email.trim().toLowerCase()`. Asegúrate de meter los emails en `ADMIN_EMAILS` separados por coma y sin espacios innecesarios.
- La impersonación NO cambia el `auth.uid()`. Sigue siendo el admin. Los `audit_logs` van a registrar al admin como `changed_by`, pero los datos modificados van al `restaurant_id` impersonado. Útil para auditoría.
- `requireRestaurant()` está en `lib/auth-helpers.ts` pero no se usa universalmente — algunas páginas validan manualmente con `getCurrentRestaurant()` + `redirect`.
- El onboarding hace `window.location.href` (no `router.push`) a propósito: necesita re-ejecutar el proxy con la nueva sesión/cookies.
