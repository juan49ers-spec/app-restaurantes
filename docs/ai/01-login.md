# 01 — Login

**Ruta:** `/login`
**Archivos clave:** `src/app/login/page.tsx`, `src/lib/supabaseClient.ts`, `src/middleware.ts`
**Transversales relacionados:** [T03](./T03-autenticacion.md)

## 1. Propósito y rol en el negocio

Punto único de entrada al producto. Autentica al usuario contra Supabase y permite también crear una cuenta nueva. Es la única ruta de interfaz accesible sin sesión (junto con `/auth/*`; `/api/health` es el único endpoint público de sistema).

## 2. Viaje del usuario

1. Usuario abre la URL (o el middleware lo redirige aquí porque no tiene sesión).
2. Ve un layout split: branding a la izquierda (visible solo en `lg+`), formulario a la derecha.
3. Formulario con dos campos: email y password (con toggle mostrar/ocultar).
4. Botón **"Iniciar Sesión"** → llama `supabase.auth.signInWithPassword({ email, password })`.
5. Si éxito: toast "Login exitoso" + `router.refresh()`. El middleware redirige:
   - Si email ∈ `ADMIN_EMAILS` → `/admin`.
   - Si no → `/` (que a su vez redirige a `/onboarding` si el usuario no tiene restaurante).
6. Alternativa: botón **"Crear nueva cuenta"** → `supabase.auth.signUp({ email, password })`. Toast informativo; no hay redirección automática (el usuario debe iniciar sesión después).
7. Existe un link "¿Olvidaste tu contraseña?" **sin handler implementado**.

## 3. Flujo técnico de datos

- **Componente** `'use client'` con estado local (`email`, `password`, `loading`, `showPassword`).
- **No usa server actions.** Llama directamente a `supabaseClient` (browser).
- **Lectura/escritura:** Supabase Auth (tabla `auth.users` gestionada por Supabase).
- **Redirección post-login:** delegada al middleware en el siguiente request.

## 4. Reglas de negocio y restricciones

- Ruta pública. No hay protección en middleware (matcher la excluye explícitamente).
- Si el usuario YA tiene sesión y entra a `/login`, el middleware redirige a `/admin` (si admin) o `/` (si no). No puede quedarse en `/login` autenticado.
- No hay verificación de email habilitada por defecto: signup → cuenta usable inmediatamente.
- Decisión de rol es hardcodeada por email (ver [T03](./T03-autenticacion.md)).

## 5. Dependencias e implicaciones cruzadas

- **Tablas que toca:** `auth.users` (vía Supabase Auth).
- **Otras rutas afectadas si esto cambia:**
  - `/onboarding` (paso siguiente para usuarios nuevos sin restaurante).
  - `/admin/*` (acceso depende del email validado).
  - `middleware.ts` (decide a dónde redirige).
- **Transversales:** [T03](./T03-autenticacion.md) define la lógica de rol y el sistema de protección de rutas.

## 6. Casos límite y errores conocidos

- **Email no registrado:** Supabase devuelve error genérico `Invalid login credentials` (no distingue user-not-found de wrong-password — esto es feature, no bug).
- **Signup con email ya registrado:** error capturado en catch, toast con `.message`.
- **Email con espacios al inicio/fin:** se compara con `.trim().toLowerCase()` en el middleware, pero el formulario no normaliza antes de enviar — para emails admin, asegúrate de meterlos así en `ADMIN_EMAILS`.
- **Botón "Olvidaste tu contraseña?"** está en UI pero no hace nada al pulsar (potencial confusión para el usuario).
- **Mobile (`<lg`):** el panel de branding se oculta, solo se ve el formulario.
- **Loading state:** mientras se procesa, el botón se deshabilita con texto distinto.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer [T03](./T03-autenticacion.md) entero. La lógica de redirección está en el middleware, no aquí.

**Archivos que suelen cambiar a la vez:**
- `src/middleware.ts` — si cambia la lógica de redirección post-login.
- `src/app/page.tsx` y `src/app/admin/layout.tsx` — si cambia el chequeo de admin.
- `src/app/actions/admin-queries.ts` — si cambia `ADMIN_EMAILS`, actualizar también aquí.

**Qué probar manualmente:**
- Login válido con usuario normal → redirige a `/` → si sin restaurante, a `/onboarding`.
- Login válido con admin (juan49ers@gmail.com / admin@controlhub.com) → redirige a `/admin`.
- Login con credenciales malas → error mostrado, no redirige.
- Signup con email nuevo → toast informativo. Luego hacer login y comprobar el flujo.
- Intentar entrar a `/login` con sesión → debe redirigir según rol.
- Mobile y desktop (panel branding desaparece).

**Si añades un proveedor de auth nuevo (OAuth, magic link):**
- Actualizar middleware si la URL de callback debe ser pública.
- Considerar el flujo de creación de restaurante si el usuario llega con cuenta nueva sin onboarding.
- Verificar que el rol sigue decidiéndose por email (o cambiar el sistema a roles dinámicos).

**Si implementas "olvidaste contraseña":**
- Usar `supabase.auth.resetPasswordForEmail()`.
- Necesitarás una ruta `/auth/reset-password` añadida a las excepciones del middleware.
