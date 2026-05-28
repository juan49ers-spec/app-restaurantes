# Documentación AI-first — `docs/ai/`

> Documentación pensada para que **un agente de IA** entienda completamente la aplicación y tome decisiones bien informadas sobre cualquier cambio. **No es documentación de cliente.**

## Cómo usar esta carpeta

Cuando vayas a tocar una funcionalidad:

1. Lee [`00-vision-general.md`](./00-vision-general.md) si es tu primer contacto con la app.
2. Identifica la **ruta/página** que modificas → abre su archivo numerado.
3. Lee la sección **5. Dependencias e implicaciones cruzadas** del archivo: te dirá qué otras páginas se afectan y qué transversales (`T…`) debes consultar.
4. Lee la sección **7. Al añadir/modificar una función aquí** antes de escribir código: te dice qué leer, qué tocar, qué probar.
5. Si el cambio toca cálculos numéricos, lee [T04](./T04-financial-math.md).
6. Si el cambio toca esquema/migraciones, lee [T02](./T02-base-de-datos.md).
7. Si el cambio toca auth/permisos, lee [T03](./T03-autenticacion.md).
8. Si el cambio es una mutación nueva, lee [T06](./T06-server-actions-comunes.md).

## Reglas duras

- **`restaurant_id` jamás viaja desde el cliente.** Siempre se resuelve server-side con `getUserRestaurant()`.
- **Mutaciones por server actions** con validación Zod y `revalidatePath()` tras escritura.
- **Soft delete solo donde está definido** (ingredientes principalmente).
- **Snapshots inmutables** en facturas, reportes BCG y desperdicios — los datos históricos no se reescriben.
- **Lista de admins centralizada** en `src/lib/admin.ts` vía `process.env.ADMIN_EMAILS` — un solo punto de verdad.

## Índice maestro

### Visión general

- [00 — Visión general](./00-vision-general.md) — mapa mental, glosario de negocio, convenciones globales.

### Páginas (una por ruta top-level)

| # | Archivo | Ruta principal | Qué resuelve |
|---|---------|----------------|--------------|
| 01 | [Login](./01-login.md) | `/login` | Punto de entrada. Auth por email/password. |
| 02 | [Onboarding](./02-onboarding.md) | `/onboarding` | Crear el restaurante por primera vez. |
| 03 | [Dashboard](./03-dashboard.md) | `/` | Centro de comando — KPIs financieros del mes. |
| 04 | [Financial Control](./04-financial-control.md) | `/financial-control` | Hub diario: facturación, gastos, impuestos, resultados. |
| 05 | [Invoices](./05-invoices.md) | `/invoices` | Ingesta de facturas con OCR (GPT-4o) + review + mapeo. |
| 06 | [Escandallos](./06-escandallos.md) | `/escandallos` | Hub UI: tabs de Recetas + Ingredientes. |
| 07 | [Recipes](./07-recipes.md) | `/recipes` | Editor de fichas técnicas (recetas) full-screen. |
| 08 | [Ingredients](./08-ingredients.md) | `/ingredients` | Catálogo maestro de ingredientes + import CSV. |
| 09 | [Menu Engineering](./09-menu-engineering.md) | `/menu-engineering` | Análisis BCG (STAR/PLOWHORSE/PUZZLE/DOG). |
| 10 | [Stock](./10-stock.md) | `/stock` | Inventario + ventas diarias por receta + entradas manuales. |
| 11 | [Desperdicios](./11-desperdicios.md) | `/desperdicios` | Mermas con deducción automática de stock. |
| 12 | [Suppliers](./12-suppliers.md) | `/suppliers` | CRM de proveedores + scorecard + items vendidos. |
| 13 | [Purchasing](./13-purchasing.md) | `/purchasing/analytics` | Analytics de compras + smart ordering + comparador. |
| 14 | [Staff](./14-staff.md) | `/staff/employees`, `/schedule`, `/policies` | Empleados, turnos (drag-drop), políticas internas. |
| 15 | [Operational](./15-operational.md) | `/operational` | Salud operativa: alertas + tareas pendientes. |
| 16 | [Notifications](./16-notifications.md) | `/notifications` | Centro de notificaciones + reglas de alerta. |
| 17 | [Admin](./17-admin.md) | `/admin/*` | Panel super-admin: restaurantes, usuarios, billing, audit, impersonación. |
| 18 | [Inventory](./18-inventory.md) | `/operations/inventory` | Conteo físico de inventario + informe de consumo real. |
| 19 | [Reports](./19-reports.md) | `/reports` | Mesa de revision de informes profesionales. |
| 20 | [Portal Cliente](./20-portal-cliente.md) | `/portal` | Área cliente para informes profesionales publicados. |
| 21 | [Consultant Workspace](./21-consultant-workspace.md) | `/consultant` | Mesa interna del consultor para entregas, solicitudes y marca. |
| 22 | [Multi-client consulting](./22-multi-client-consulting.md) | `/consultant` | Cartera de restaurantes cliente para consultores. |

### Transversales (lo que no es una página pero atraviesa todo)

| # | Archivo | Cubre |
|---|---------|-------|
| T01 | [Arquitectura](./T01-arquitectura.md) | Stack, layout root, estructura de carpetas, server vs client components, multi-tenancy. |
| T02 | [Base de datos](./T02-base-de-datos.md) | Esquema completo (25+ tablas), RLS, triggers, RPCs, índices, convenciones. |
| T03 | [Autenticación](./T03-autenticacion.md) | Login, decisión de rol, onboarding, permisos por módulo, impersonación, helpers. |
| T04 | [Financial math](./T04-financial-math.md) | Cálculos de coste, margen, prime cost, proyección, Menu Engineering BCG, gotchas. |
| T05 | [Hooks y providers](./T05-hooks-y-providers.md) | Hooks compartidos, providers, cached queries, logger, after(), design tokens. |
| T06 | [Server actions](./T06-server-actions-comunes.md) | Patrón estándar, `safe-action`, resolución de `restaurant_id`, revalidación, RPCs. |
| T07 | [OCR Pipeline](./T07-ocr-pipeline.md) | Extractores V1/V2, Chandra, ingesta inteligente, persistencia atómica. |
| T08 | [Drive Ingestion](./T08-drive-ingestion.md) | Google Drive → cron → OCR → DB. Reports API. |
| T09 | [Services Layer](./T09-services-layer.md) | BusinessRules, FinancialAlerts, InvoiceAtomic, InvoiceIngestion. |
| T10 | [AI Insights](./T10-ai-insights.md) | Informes narrativos por módulo y período con contexto del usuario. |
| T11 | [Reporting profesional](./T11-reporting-profesional.md) | Contrato maestro de informes, mapa de fuentes, calidad de dato y borrador profesional. |

### Informes de fase

- [Cierre Fase 1 — Reporting profesional](./phase-1-reporting-cierre.md) — resumen claro de alcance, decisiones, verificación y siguiente paso.
- [Cierre Fase 2 — Reporting profesional](./phase-2-reporting-cierre.md) — resumen de la mesa de revision, gates y siguiente paso.
- [Cierre Fase 3 — Reporting profesional](./phase-3-reporting-cierre.md) — resumen de persistencia, versionado y exportacion imprimible.
- [Cierre Fase 4 — Reporting profesional](./phase-4-reporting-cierre.md) — resumen de estructura ejecutiva, KPIs y conclusiones.
- [Cierre Fase 5 — Reporting profesional](./phase-5-reporting-cierre.md) — resumen de objetivos mensuales y diagnostico semanal.
- [Cierre Fase 6 — Reporting profesional](./phase-6-reporting-cierre.md) — resumen de carta, ventas por receta y margen por producto.
- [Cierre Fase 6.5 — Consolidacion reporting](./phase-6-5-reporting-consolidacion.md) — seed demo completa, tests server action y exportacion pulida.
- [Cierre Fase 7 — Menu Engineering](./phase-7-menu-engineering-cierre.md) — unificacion de formula BCG entre libreria, action y simulador.
- [Cierre Fase 7.1 — Remediacion de revision externa](./phase-7-1-security-review-remediation.md) — cierre de IDOR/RLS en Menu Engineering y tests de guardado de informes.
- [Cierre Fase 7.2 — Limpieza analitica y QA menor](./phase-7-2-analytical-cleanup.md) — coherencia de margen ponderado, brecha semanal acotada y endpoint demo protegido.
- [Cierre Fase 8 — BCG en informe profesional](./phase-8-menu-engineering-reporting.md) — integra snapshots Menu Engineering ANALYZED en el informe sin recalcular en UI.
- [Cierre Fase 9 — Área cliente](./phase-9-client-portal.md) — portal autenticado para informes publicados, solicitudes de reunión y descarga PDF.
- [Cierre Fase 21 — QA real del flujo cliente](./phase-21-real-client-qa.md) — comando operativo para verificar el recorrido consultor -> cliente antes de enseñar la app.
- [Cierre Fase 22 — Onboarding comercial del consultor](./phase-22-consultant-onboarding.md) — recorrido post-alta para llevar un cliente nuevo hasta su primer informe publicado.
- [Cierre Fase 23 — Portal Cliente V3](./phase-23-client-portal-v3.md) — recorrido de revisión dentro del portal para explicar estado de lectura, reunión y próximas acciones.
- [Cierre Fase 24 — Exportaciones y entregables](./phase-24-delivery-exports.md) — paquete de entrega con informe web, PDF imprimible y revisión con consultor.
- [Cierre Fase 25 — Notificaciones](./phase-25-notifications.md) — acceso directo a configuración de alertas y normalización testeada de pestañas.
- [Cierre Fase 26 — Auditoría operativa](./phase-26-operational-audit.md) — trazabilidad de publicación, reuniones, selección de cliente y cambios del consultor.
- [Cierre Fase 27 — Infraestructura test/build](./phase-27-test-build-infrastructure.md) — elimina warnings espurios de listeners en Vitest y Next build.
- [Cierre Fase 28 — QA visual robusta](./phase-28-visual-qa.md) — Playwright local sin colisión de puertos y recorrido visual del portal/PDF.
- [Cierre Fase 30 — Guía demo cliente](./phase-30-client-demo.md) — guion comercial para enseñar el flujo consultor -> cliente con seguridad.
- [Cierre Fase 31 — Seguridad QA](./phase-31-qa-security.md) — credenciales E2E fuera del código y test guardia anti-secretos.
- [Resumen consolidado — Reporting y Menu Engineering](./implementation-summary-reporting-menu-engineering.md) — vision completa de fases, decisiones, verificacion y pendientes.
- [Prompt Claude — Revision externa](./claude-review-prompt-reporting-menu-engineering.md) — prompt preparado para pedir una segunda revision independiente.

### Prompts de implementación

- [Prompt Fase 9 — Área cliente](./prompts/phase-9-client-portal.md) — especificación operativa para construir `/portal`, publicación separada de informes y solicitud de reunión.

## Plantilla de archivo de página (para futuras adiciones)

Si en el futuro se añade una página nueva, su archivo debe tener estas 7 secciones (ver [04 — Financial Control](./04-financial-control.md) como ejemplo canónico):

1. **Propósito y rol en el negocio**
2. **Viaje del usuario**
3. **Flujo técnico de datos**
4. **Reglas de negocio y restricciones**
5. **Dependencias e implicaciones cruzadas**
6. **Casos límite y errores conocidos**
7. **Al añadir/modificar una función aquí**

Y debe registrarse en este README.

## Mantenimiento — Protocolo obligatorio

Esta documentación **solo es útil si se mantiene sincronizada con el código**. La regla es simple:

1. **Antes de editar un módulo:** lee su archivo aquí. Las secciones 5 (implicaciones cruzadas) y 6 (casos límite) son las que evitan que rompas algo invisible.
2. **Si código y doc no cuadran:** gana el código, pero **avisa al usuario** y propón actualizar el archivo. No cambies la doc en silencio.
3. **Después de modificar un módulo:** actualiza su archivo en esta carpeta. Forma parte del cambio, no es un extra opcional. Repasa especialmente:
   - § 3 Flujo técnico de datos.
   - § 4 Reglas de negocio.
   - § 5 Dependencias e implicaciones cruzadas.
   - § 6 Casos límite.
4. **Si añades una página/ruta nueva:** crea su archivo con las 7 secciones de la plantilla y añádela al índice de arriba.
5. **Los docs en `docs/` (sin `ai/`)** son legacy. No los modifiques. Pueden consultarse como input si una duda aparece, pero la fuente de verdad para IA es `docs/ai/`.

La instrucción equivalente está duplicada en el `CLAUDE.md` raíz del repo para que cualquier agente la cargue al iniciar.
