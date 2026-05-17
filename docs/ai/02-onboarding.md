# 02 — Onboarding

**Ruta:** `/onboarding`
**Archivos clave:** `src/app/onboarding/page.tsx`, `src/app/onboarding/loading.tsx`, `src/lib/auth-helpers.ts`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md)

## 1. Propósito y rol en el negocio

Primer paso post-registro. Convierte una cuenta de Supabase recién creada en un restaurante operativo dentro de la app. Sin restaurante, ninguna otra página de negocio funciona.

## 2. Viaje del usuario

1. Usuario hace signup en `/login` y luego inicia sesión.
2. Al ir a `/` (o cualquier ruta operativa), el código detecta que no tiene restaurante (`getCurrentRestaurant()` retorna `null`) y redirige a `/onboarding`.
3. Ve una card de bienvenida: "Bienvenido a Control Hub 👨‍🍳".
4. Un único campo: **"Nombre de tu Restaurante"** (placeholder: "Ej: La Trattoria de Juan").
5. Botón **"Crear Espacio de Trabajo"**.
6. Al enviar:
   - `supabase.from('restaurants').insert({ name, owner_id: user.id })`.
   - Toast "¡Restaurante creado!".
   - `router.refresh()` para limpiar caché de server.
   - Pausa de ~1 segundo.
   - `window.location.href = '/financial-control'` — **navegación dura** (no `router.push`).
7. Una vez en `/financial-control`, el middleware ya ve restaurante asociado y deja pasar.

## 3. Flujo técnico de datos

- **Componente** `'use client'`. No usa server actions.
- **Escritura:** un `INSERT` directo en `restaurants` con `{ name, owner_id: user.id }`. `modules` y `active_addons` quedan en defaults (módulos en `basic` para `financial_control`, el resto en `none` o equivalente).
- **No pide módulos/plan:** la elección de plan se hace después desde admin o auto-activación.
- **Navegación dura** (`window.location.href`): fuerza re-evaluación del middleware. Es deliberada — sin esto, el layout server seguiría con la sesión sin restaurante.

## 4. Reglas de negocio y restricciones

- Solo accesible si hay user autenticado (en la práctica, accesible si llegas con sesión; no hay un guard explícito).
- Campo `name` es `required` (no se puede enviar vacío).
- Un usuario puede tener técnicamente varios restaurantes (la tabla no fuerza un único `owner_id`), pero **la UI asume uno solo** y `getCurrentRestaurant()` hace `LIMIT 1`.
- No hay verificación de duplicados de nombre.
- No pide:
  - Datos fiscales (CIF, dirección).
  - Plan/módulos.
  - Logo.
  - Datos del dueño.

## 5. Dependencias e implicaciones cruzadas

- **Tablas que toca:** `restaurants` (INSERT).
- **Otras páginas afectadas si esto cambia:**
  - `/` — espera tener restaurante para no redirigir.
  - Sidebar — necesita `restaurantId` y `activeAddons` del layout.
  - Cualquier action que llame `getUserRestaurant()`.
- **Transversales:**
  - [T03](./T03-autenticacion.md) describe `getCurrentRestaurant()` y el guard `requireRestaurant()`.
  - [T02](./T02-base-de-datos.md) — esquema de `restaurants` (campos `modules`, `active_addons`, `ocr_credits`, etc.).

## 6. Casos límite y errores conocidos

- **Doble click en el botón:** sin debounce explícito; el botón se deshabilita con `loading` pero ya hay un hueco antes del set state. Posible insertar 2 restaurantes en milisegundos.
- **Error en INSERT:** mensaje genérico vía `.message`. No diferencia errores de RLS de errores de red.
- **Hard navigation:** si el usuario tiene React DevTools abiertos, perderá estado. Es lo esperado.
- **Toast duplicado:** el código tiene 2 llamadas al toast de éxito (revisar `page.tsx`).
- **Si el usuario ya tiene restaurante** y aún así entra a `/onboarding`: no hay guard. Crearía un segundo restaurante (huérfano funcionalmente — `getCurrentRestaurant` solo lee el primero).

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer [T03](./T03-autenticacion.md) — sobre todo la sección del onboarding.
- Confirmar qué campos debe tener el restaurante recién creado (`modules`, `active_addons` defaults).

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/user.ts` — `getCurrentRestaurant()` debe seguir devolviendo este restaurante.
- `src/app/layout.tsx` — si añades campos nuevos que el sidebar necesita.
- `src/app/admin/*` — admin verá el nuevo restaurante en la lista.
- `src/types/schema.ts` — `RestaurantSchema` si añades campos.

**Si quieres añadir pasos al onboarding:**
1. Convertir a multi-step (e.g. stepper con `react-hook-form`).
2. Mantener el campo `name` como obligatorio en el primer paso para crear la fila ASAP y desbloquear el resto.
3. Si pides plan/módulos, sincronizar `modules` y `active_addons` desde el inicio (mismo patrón que `toggleRestaurantModule` en `admin.ts`).
4. Si pides datos fiscales, **añadir migración** (`tax_id`, `address`, etc. no existen aún en `restaurants`).

**Qué probar manualmente:**
- Signup → login → llegada a `/onboarding`.
- Crear restaurante → llegada a `/financial-control` con sidebar mostrando solo CORE.
- Probar que el sidebar no muestra OPERATIVA/ESTRUCTURA/PROVEEDORES por defecto.
- Refrescar la página tras crear restaurante → debe ir directo a `/`, no a `/onboarding`.

**Bug pendiente conocido:**
- Doble llamada al toast de éxito en `page.tsx`. Limpiar al tocar el archivo.
