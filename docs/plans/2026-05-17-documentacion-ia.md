# Documentación AI-first del proyecto — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Crear `docs/ai/` con 1 archivo por ruta + archivos transversales `T…` + README índice + visión general, siguiendo la plantilla operativa para IA aprobada en el design doc.

**Architecture:** Pura documentación. No se modifica código fuente ni docs existentes. La fuente de verdad es el código en `src/`, el esquema en `supabase/`/`migrations/`, y el contenido de `docs/` existente como input verificable.

**Tech Stack:** Markdown. Sin tooling.

**Design doc:** `docs/plans/2026-05-17-documentacion-ia-design.md`

---

## Fase 0 — Exploración

### Task 0.1: Inventario de rutas top-level
**Files:** lectura de `src/app/`
- Listar todos los directorios bajo `src/app/` que son rutas (excluyendo `actions`, `api` si solo es backend interno, archivos sueltos).
- Para cada uno, anotar si tiene `page.tsx` y subrutas.
- Salida: lista definitiva de archivos `01-…` a `NN-…` a generar, numerada.

### Task 0.2: Mapa de componentes y servicios
**Files:** `src/components/`, `src/services/`, `src/lib/`, `src/hooks/`
- Inventario rápido de qué hay en cada subcarpeta.
- Identificar piezas compartidas: financial-math, hooks transversales, providers.

### Task 0.3: Esquema de base de datos
**Files:** `supabase/`, `migrations/`
- Leer migraciones para identificar tablas, columnas clave, relaciones, RLS.
- Esto alimenta `T02-base-de-datos.md`.

### Task 0.4: Auth y middleware
**Files:** `src/middleware.ts`, cualquier ruta `/login`, `src/app/onboarding/`
- Entender el flujo de autenticación, sesiones, roles.
- Alimenta `T03-autenticacion.md` y la página de login/onboarding.

### Task 0.5: Server actions
**Files:** `src/app/actions/`
- Listado de actions principales agrupados por dominio.
- Patrón común: validación zod, manejo de errores, llamada Supabase.
- Alimenta `T06-server-actions-comunes.md`.

### Task 0.6: Lectura de docs existentes (input)
**Files:** `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/HOOKS.md`, `docs/SERVICES.md`, `CLAUDE.md`, `README.md`
- Leer todo. Anotar qué hechos coinciden con el código y cuáles parecen desactualizados.
- No modificar nada en `docs/`.

**Commit tras Fase 0:** no aún (sin archivos nuevos).

---

## Fase 1 — Archivos transversales (`T…`)

Se hacen primero porque las páginas los referencian.

### Task 1.1: `T01-arquitectura.md`
- Stack, Next.js App Router, server vs client components, estructura `src/`, convenciones.

### Task 1.2: `T02-base-de-datos.md`
- Tablas principales, relaciones, RLS, decisiones de modelado, índices clave.

### Task 1.3: `T03-autenticacion.md`
- Flujo login → middleware → roles. Qué páginas requieren qué permisos. Sesiones y onboarding.

### Task 1.4: `T04-financial-math.md`
- Cálculos de margen, food cost, BCG, redondeos, precisión decimal. Contrato y gotchas.

### Task 1.5: `T05-hooks-y-providers.md`
- Hooks compartidos (`src/hooks/`) y providers globales (`src/components/providers/`).

### Task 1.6: `T06-server-actions-comunes.md`
- Patrón estándar: validación zod, manejo de errores, paths revalidados, convenciones de naming.

**Commit tras Fase 1:** `docs(ai): añadir documentación transversal (T01-T06)`

---

## Fase 2 — Archivos de página

Un archivo por cada ruta identificada en Task 0.1. Siguiendo la plantilla de 7 secciones.

Cada archivo:
1. **Leer el código** de la ruta y componentes relevantes.
2. **Cruzar con** las T-transversales aplicables.
3. **Verificar** con docs existentes (si dicen algo y no contradice al código).
4. **Escribir** el archivo con las 7 secciones.

Rutas candidatas (orden alfabético, numeración final tras Task 0.1):
- admin, desperdicios, escandallos, financial-control, ingredients, invoices, login, menu-engineering, notifications, onboarding, operational, purchasing, recipes, staff, stock, suppliers.

**Commits durante Fase 2:** uno cada 4-5 archivos para no acumular mucho sin checkpoint.

---

## Fase 3 — Vista general e índice

### Task 3.1: `00-vision-general.md`
- Qué es la app, módulos, glosario de negocio (food cost, BCG, escandallo, etc.), diagrama mental de cómo se conectan los módulos.

### Task 3.2: `README.md` (índice)
- Tabla con: número, nombre, ruta, qué resuelve.
- Sección de "cómo usar esta documentación" dirigida explícitamente al agente de IA.
- Tabla aparte de archivos transversales `T…`.

**Commit final:** `docs(ai): añadir índice y visión general`

---

## Convenciones para todos los archivos

- Idioma: español.
- Tono: directo, técnico, sin marketing.
- Rutas absolutas relativas al repo en backticks (`src/app/financial-control/page.tsx`).
- Las referencias entre archivos usan enlaces relativos (`[T02](./T02-base-de-datos.md)`).
- No incluir código completo, sí firmas y nombres de funciones cuando ayuden a localizar.
- Si algo no se puede determinar del código, marcarlo como `[POR CONFIRMAR]` y seguir.

## Done definition

- `docs/ai/README.md` existe y lista todos los archivos.
- Existe `00-vision-general.md`.
- Existe un archivo numerado por cada ruta top-level encontrada en Task 0.1.
- Existen `T01` a `T06` (o los que apliquen).
- Cada archivo de página tiene las 7 secciones de la plantilla.
- Ningún archivo de `docs/` existente fue modificado.
- Commits siguen el estilo del repo.
