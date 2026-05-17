# 00 — Visión general

> Punto de partida. Léelo antes de saltar a cualquier archivo numerado.

## Qué es ControlHub

SaaS multi-tenant de gestión financiera y operativa para restaurantes. El producto se llama **ControlHub** (el title del layout root). El README todavía dice "Restaurant Financial Management System" — es la misma cosa, terminología en evolución.

Cubre 4 áreas de negocio:

1. **Control financiero** — ventas diarias, gastos, presupuestos, IVA/IRPF, P&L, resultados mensuales.
2. **Operativa de cocina** — escandallos (recetas con costes), ingredientes maestros, menu engineering (matriz BCG), stock, desperdicios.
3. **Estructura** — empleados, turnos, políticas internas.
4. **Proveedores** — CRM, scorecard, analytics de compras, smart ordering.

Más un **panel super-admin** para gestionar restaurantes-cliente, planes, billing y soporte (incluida impersonación).

## Modelo de negocio (cliente)

- Cada usuario regular es propietario de **un** restaurante (campo `restaurants.owner_id = auth.uid()`).
- Los super-admins (lista hardcoded de emails) administran la plataforma.
- Los **módulos de la app son pagables**: el plan del restaurante define qué áreas se ven en la sidebar (CORE siempre; OPERATIVA, ESTRUCTURA, PROVEEDORES según `active_addons`).
- Hay **créditos OCR** (1 crédito = 1 factura escaneada con GPT-4o vision).

## Mapa mental de módulos

```
                    ┌─────────────────────┐
                    │   LOGIN / SIGNUP    │  ←  middleware decide dónde redirige
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                                     │
       admin?                                  no-admin?
            │                                     │
            ▼                                     ▼
       /admin                              ¿tiene restaurante?
            │                                     │
            │                            no ──────┴── sí
            │                            │            │
            │                            ▼            ▼
            │                      /onboarding      / (dashboard)
            │                                         │
            │           ┌────────────────────────────┼────────────────────────────┐
            │           │                            │                            │
            │     CORE                          OPERATIVA                    PROVEEDORES
            │     /financial-control            /escandallos                 /suppliers
            │     /invoices                     /recipes                     /purchasing/analytics
            │                                   /ingredients
            │                                   /menu-engineering
            │                                   /stock              ESTRUCTURA
            │                                   /desperdicios       /staff/employees
            │                                                       /staff/schedule
            │                                   /operational        /staff/policies
            │                                   /notifications
            │
            └─── /admin/restaurants, /users, /billing, /audit,
                 /invoice-validation
```

## Flujo de datos canónico

```
Facturas (OCR + review)
   │
   ├─► +Stock (PURCHASE)
   ├─► +Gasto operativo (PROVEEDORES_COMIDA/BEBIDA)
   ├─► Histórico de precios
   ├─► Alertas de spike (>10%)
   └─► Aliases aprendidos

Recetas (escandallos)
   │
   ├─► Coste = Σ (qty * precio ingrediente)
   └─► Trigger: cambio precio ingrediente → recalcula coste receta

Ventas diarias (manual o por receta)
   │
   ├─► daily_sales: revenue, IVA, covers, labor_hours
   └─► daily_recipe_sales → -Stock (SALE, RPC atómico)

Desperdicios
   │
   └─► -Stock (WASTE)

Menu Engineering
   │
   └─► Snapshots de recetas + cantidades vendidas → matriz BCG

Dashboard (`/`)
   │
   └─► Agrega: daily_sales + operating_expenses → KPIs (revenue, profit, prime cost)
```

## Glosario de negocio

| Término | Significado |
|---------|-------------|
| **Escandallo** | Ficha técnica de una receta con desglose detallado de costes. En la app, `/escandallos` agrupa recetas + ingredientes. |
| **Food cost** | Coste de materia prima sobre ventas. Target típico: 30%. |
| **Labor cost** | Coste de personal sobre ventas. Target típico: 33%. |
| **Prime cost** | Food cost + labor cost. Tope sano: 60%. |
| **COGS** | Cost of Goods Sold = food cost en hostelería. |
| **Margen de contribución** | `selling_price - cost` (unitario o total). |
| **BCG / Matriz de menú** | Clasifica platos en STAR (alto vol + alto margen), PLOWHORSE (alto vol + bajo margen), PUZZLE (bajo vol + alto margen), DOG (bajo vol + bajo margen). |
| **Yield / Merma** | Pérdida estándar al manipular un ingrediente (ej. cáscara, hueso). Se guarda como decimal 0..1. |
| **Pack size** | Conversión: cuántas unidades de venta hay en un envase del proveedor (ej. caja de 12). |
| **Cover** | Cubierto. Un cliente atendido (uso métrica de actividad: revenue/cover). |
| **IVA 10%** | Tipo reducido para comida en local (España). |
| **IVA 21%** | Tipo general (bebidas alcohólicas, comida para llevar bajo ciertas condiciones). |
| **Modelo 303** | Declaración trimestral de IVA (AEAT). |
| **Modelo 111** | Declaración trimestral de retenciones IRPF. |
| **Idempotency key** | Clave única que evita duplicar una operación si el cliente reintenta. |
| **RLS (Row Level Security)** | Política a nivel fila de PostgreSQL que filtra qué ve cada usuario. |
| **RPC** | Función SQL invocable desde el cliente Supabase. Aquí se usa para operaciones atómicas multi-fila. |
| **Impersonación** | Un admin "se mete en el rol" de un restaurante para soporte. Cookies httpOnly. |
| **Active addons** | Módulos contratados. Array de strings en `restaurants.active_addons`. Determina qué ve el sidebar. |

## Cómo está organizada la documentación

| Tipo | Prefijo | Contenido |
|------|---------|-----------|
| Visión general | `00` | Este archivo. Mapa mental, glosario. |
| Páginas | `01` a `17` | Una por ruta top-level. Plantilla de 7 secciones (propósito, viaje, flujo técnico, reglas, dependencias, casos límite, checklist al modificar). |
| Transversales | `T01` a `T06` | Arquitectura, base de datos, autenticación, financial-math, hooks/providers, server actions. |

Para uso por un agente IA:

1. **Antes de tocar una ruta**, leer su archivo (`NN-…`) + los transversales que declare relevantes en su sección 5.
2. **Antes de tocar un cálculo numérico**, leer [T04](./T04-financial-math.md).
3. **Antes de tocar mutaciones**, leer [T06](./T06-server-actions-comunes.md).
4. **Antes de tocar permisos/auth/onboarding**, leer [T03](./T03-autenticacion.md).
5. **Antes de añadir columnas o RPCs**, leer [T02](./T02-base-de-datos.md).

## Convenciones del repo (importantes para no romper cosas)

- **Server-first.** Las páginas son server components. Los formularios/editores son `'use client'`.
- **`restaurant_id` jamás viene del cliente.** Siempre se resuelve en server con `getUserRestaurant()`.
- **Mutaciones por server actions** (no por API routes salvo uploads).
- **Revalidar:** tras escritura, `revalidatePath('/ruta')` y a menudo `revalidatePath('/', 'layout')` para refrescar el layout (sidebar, banners).
- **Logs con `logger`** (pino), no `console`.
- **Idempotency** donde puede haber reintento.
- **Soft delete** para ingredientes; hard delete para casi todo lo demás.
- **Snapshots** en facturas (`cost_at_time`), reportes BCG (`cost_per_unit`/`price_per_unit`), waste (coste al registrar) — los datos históricos no se actualizan retroactivamente.
- **Trigger automático:** cambio en precio de ingrediente → recoste de recetas. **Excepción:** cambios en sub-recetas NO propagan a recetas padre (ver [T04](./T04-financial-math.md)).

## Cosas no obvias que conviene saber de entrada

1. **Identidad del producto:** `metadata.title` es "ControlHub". README dice "Restaurant Financial Management System". Es la misma app.
2. **Admins:** son lista hardcoded de emails en 3 sitios (`middleware.ts`, `app/page.tsx`, `admin-queries.ts`). Mantenerlos sincronizados.
3. **Onboarding mínimo:** solo pide nombre. Plan/módulos se activan después desde admin.
4. **`/escandallos` no tiene URL para sus tabs internos** — recargar vuelve al default "Recetas".
5. **`/recipes`** y **`/ingredients`** existen como rutas independientes, pero también se acceden vía tabs de `/escandallos`. Mismo dato.
6. **`/staff`** sin subruta no es navegable — la sidebar lleva siempre a `/staff/employees`, `/staff/schedule` o `/staff/policies`.
7. **Tabla `staff` (singular) es legacy.** Usar siempre `employees`.
8. **`broadcasts` y `billing_modules` son tablas globales** (sin `restaurant_id`).
9. **El root layout (`src/app/layout.tsx`)** consulta `getActiveBroadcasts()` en cada render sin caché.
10. **Sub-recetas no propagan coste:** bug de negocio conocido — un cambio en una sub-receta requiere re-guardar manualmente las recetas padre para que el coste se refresque.
11. **Hay docs en `docs/` (`ARCHITECTURE.md`, `FEATURES.md`, etc.) que pueden estar desactualizados.** Esta carpeta `docs/ai/` es la fuente fresca; los otros docs son input para construirla pero no se mantienen aquí.
