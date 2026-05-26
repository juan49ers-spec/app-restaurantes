# Informe de cierre — Fase 1 Reporting profesional

Fecha de cierre: 2026-05-25

## Objetivo

Construir la primera base profesional para generar informes de gestión de restaurantes sin inventar conclusiones, sin mezclar restaurantes y sin introducir deuda crítica.

Esta fase no intenta maquetar todavía el PDF final. Su objetivo es dejar un núcleo fiable: contrato de datos, mapa de fuentes, control de calidad y borrador trazable.

## Qué se ha conseguido

1. Se ha creado un motor puro de reporting en `src/lib/reporting/`.

   Este motor no depende de Supabase ni de sesión. Recibe datos ya cargados y genera un borrador profesional con secciones de ventas, costes, personal, proveedores, rentabilidad, recomendaciones y apéndice de datos.

2. Se ha definido un contrato explícito de informe.

   El informe incluye métricas con fuente, evidencias y estado de calidad (`OK`, `PARTIAL`, `MISSING`, `CONFLICT`). Esto evita que una sección parezca fiable cuando faltan datos importantes.

3. Se ha añadido un mapa de fuentes.

   Cada bloque del informe apunta a tablas reales: `daily_sales`, `operating_expenses`, `monthly_targets`, `employees`, `shifts`, `suppliers` e `invoices`.

4. Se ha añadido una server action multi-tenant.

   `getProfessionalReportDraft(period)` resuelve el restaurante en servidor con `getUserRestaurant()`. No acepta `restaurant_id` desde cliente, siguiendo la regla de seguridad del producto.

5. Se ha bloqueado la generación de recomendaciones cuando faltan datos críticos.

   Si el informe no tiene ventas, costes, personal o proveedores suficientes, el sistema no inventa diagnóstico. Devuelve incidencias accionables y explica qué falta.

6. Se ha corregido una raíz fiscal detectada durante la revisión.

   Las bases imponibles negativas de `base_10/base_21` ahora se respetan como dato válido. Antes podían caer al fallback de `revenue_total - iva_collected`, produciendo una base positiva incorrecta en correcciones o abonos.

7. Se han saneado tests obsoletos.

   Los tests de acciones financieras, helpers de formato, resolución de restaurante y diálogos de ingredientes se han alineado con los contratos actuales del código y la documentación AI.

## Archivos principales

- `src/lib/reporting/types.ts`
- `src/lib/reporting/source-map.ts`
- `src/lib/reporting/build-professional-report.ts`
- `src/lib/reporting/index.ts`
- `src/app/actions/professional-reporting.ts`
- `tests/reporting/professional-report.test.ts`
- `docs/ai/T11-reporting-profesional.md`

## Verificación realizada

Comandos ejecutados con resultado correcto:

- `npm test` — 25 archivos, 289 tests pasados.
- `npm run typecheck` — TypeScript sin errores.
- `npx eslint --max-warnings=0` — lint sin warnings.
- `npm run build` — build de producción correcto.
- `npm run typecheck` después del build — correcto.

## Decisiones técnicas importantes

- El motor de reporting es puro para poder testearlo sin base de datos.
- Las lecturas multi-tenant quedan aisladas en server actions.
- El informe nunca oculta la calidad del dato.
- Las recomendaciones dependen de evidencia mínima.
- El typecheck se ejecuta sin incremental para evitar falsos fallos por artefactos generados de Next.

## Riesgo restante

No queda ningún fallo conocido en los gates ejecutados.

Lo que todavía no existe no se considera terminado: falta la pantalla de revisión del informe, la edición asistida, la exportación final y el diseño visual del documento. Eso pertenece a la siguiente fase.

## Siguiente paso recomendado

Fase 2: crear la experiencia de usuario para revisar y completar el informe antes de exportarlo.

Debe incluir:

- Selector de período.
- Vista de calidad de datos por sección.
- Borrador editable por bloques.
- Avisos claros cuando falte información.
- Preparación del contrato para exportación PDF/HTML.
