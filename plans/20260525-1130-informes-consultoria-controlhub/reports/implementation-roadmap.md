# Roadmap detallado de implementacion

Fecha: 2026-05-25
Objetivo: secuenciar el desarrollo para llegar a informes profesionales sin introducir deuda critica.

## Fase 0 - Saneamiento obligatorio

Objetivo: eliminar bloqueos que comprometen seguridad, datos o verificacion local.

Cambios:

- Corregir `restaurantId || "1"` en `src/app/actions/resultados.ts`.
- Corregir fallback `"1"` en `src/app/staff/employees/page.tsx`.
- Revisar todas las mutaciones que reciben `restaurant_id` desde cliente en `src/app/actions/financial-control.ts`.
- Arreglar `SheetContent`/`DialogTitle` en sidebar movil.
- Resolver comportamiento de objetivo mensual `0` para que no aparezca como objetivo superado.
- Documentar decision sobre `docs/ai/T10-ai-insights.md` vs ausencia de `src/app/actions/ai-insights.ts`.

Validacion:

- Login con `flyderapp@gmail.com`.
- Navegacion `/financial-control`.
- Navegacion `/staff/employees`.
- `npm run lint`.
- `npm run typecheck`.

Salida:

- Base estable para implementar reporting.

## Fase 1 - Contrato de informes

Objetivo: crear el modelo persistente de informes y dejarlo protegido por tenant.

Cambios:

- Migracion `period_reports`.
- Migracion `report_sections`.
- Opcional: migracion `external_report_imports`.
- Tipos TS/Zod en `src/lib/reports/types.ts`.
- Helpers server-side en `src/lib/reports/permissions.ts`.
- Actions en `src/app/actions/reports.ts`:
  - `createReportDraft`
  - `getReport`
  - `generateReportSnapshot`
  - `updateReportSection`
  - `publishReport`
  - `archiveReport`

Reglas:

- El cliente no envia `restaurant_id`.
- Un informe publicado no se recalcula implicitamente.
- Todas las secciones guardan warnings y confidence.

Validacion:

- Tests unitarios de validacion Zod.
- Tests de acceso: usuario solo ve informes de su restaurante.

Salida:

- Informes persistidos, aunque todavia sin UI completa.

## Fase 2 - Builders financieros

Objetivo: construir el informe financiero anual/mensual desde datos actuales.

Builders:

- `buildExecutiveSummary`.
- `buildPnlSection`.
- `buildRevenueTrends`.
- `buildWeekdayAnalysis`.
- `buildRevenueHeatmap`.
- `buildExpenseAnalysis`.
- `buildSupplierSummary`.
- `buildDeterministicConclusions`.

Archivos propuestos:

- `src/lib/reports/financial-builder.ts`
- `src/lib/reports/financial-calculations.ts`
- `src/lib/reports/warnings.ts`
- `src/lib/reports/formatters.ts`

Reglas:

- Los builders son funciones puras cuando reciben datos ya consultados.
- Los warnings no son excepciones; viajan en el snapshot.
- No usar aproximaciones silenciosas. Si efectivo/tarjeta no existe, mostrar warning.

Validacion:

- Tests con fixtures:
  - mes completo
  - mes sin gastos
  - dias sin ventas
  - gastos sin categoria
  - objetivo no configurado

Salida:

- Snapshot financiero listo para renderizar.

## Fase 3 - UI de informes

Objetivo: crear la experiencia visible tipo ControlHub/Chamaca.

Rutas:

- `/reports`
- `/reports/new`
- `/reports/[id]`
- `/reports/[id]/print`

Componentes:

- `ReportShell`
- `ReportCover`
- `ReportNav`
- `ExecutiveKpiGrid`
- `PnlComparisonTable`
- `RevenueTrendChart`
- `WeekdayRevenueTable`
- `RevenueHeatmap`
- `ExpenseTargetTable`
- `SupplierRanking`
- `ReportConclusions`
- `ReportWarnings`

UX:

- Lista de informes con estado.
- Wizard simple para crear informe.
- Checklist de datos disponibles antes de generar.
- Vista lectura con navegacion por secciones.
- Vista print limpia y sin controles.

Validacion:

- Browser en desktop y mobile.
- Print route sin cortes visuales obvios.
- Estados: loading, empty, error, missing data, published.

Salida:

- Primer informe financiero profesional utilizable.

## Fase 4 - Importador FRO Excel

Objetivo: permitir cargar historico del cliente con control y trazabilidad.

Flujo:

1. Upload.
2. Parseo.
3. Vista previa por hojas.
4. Mapeo sugerido.
5. Validacion de errores.
6. Confirmacion humana.
7. Insercion.
8. Informe de discrepancias.

Mapeo inicial:

- `ARQUEO` -> `daily_sales`.
- `INGRESOS EXTRA` -> ingresos extra por canal.
- `PERSONAL` -> gastos de personal o tabla HR segun detalle.
- `COMIDA`/`BEBIDA` -> compras, COGS o gastos por categoria.
- `GASTOS OPERATIVOS`/`MARKETING`/`MANTENIMIENTO` -> `operating_expenses`.
- `RESULTADOS`/`RATIOS`/`EBITDA` -> validacion contra calculos propios, no fuente unica.
- `DIAS SEMANA` -> comparativa historica o validacion.
- `Ranking comida`/`Ranking bebida` -> ventas por item si se puede mapear.

Reglas:

- No insertar filas con `#ERROR!`, `#DIV/0!` o fechas ambiguas sin review.
- Guardar `file_hash` para evitar duplicados.
- Toda importacion debe poder auditarse.

Validacion:

- Fixture del Excel Txiquita.
- Preview de totales antes/despues.
- Rechazo controlado de hojas con formulas rotas.

Salida:

- Historico cargable para informes anuales.

## Fase 5 - Informe de carta/rentabilidad

Objetivo: replicar el informe de rentabilidad Txiquita desde datos de ControlHub.

Cambios:

- Resolver formula oficial de popularidad/matriz con producto.
- Crear builder `menu-profitability-builder.ts`.
- Crear secciones visuales:
  - cobertura
  - incidencias
  - distribucion de margen
  - ranking
  - productos urgentes
  - recomendaciones

Calculos:

- Coste total receta.
- PVP.
- Beneficio bruto.
- Margen porcentaje.
- Categoria de margen:
  - estrella: >= 75%
  - saludable: >= 60% y < 75%
  - critico: < 60%

Validacion:

- Fixture con 69 productos similar a Txiquita.
- Tests de redondeo.
- Tests de recetas sin coste y sin PVP.

Salida:

- Informe de producto independiente y exportable.

## Fase 6 - Informe horarios/personal

Objetivo: replicar el estudio horario Txiquita.

Precondiciones:

- Corregir schema/actions de staff.
- Eliminar `Math.random()` de cualquier calculo.
- Definir coste real/hora y coste legal/hora.

Builder:

- `staff-efficiency-builder.ts`

Calculos:

- Horas por dia.
- Dotacion por franja.
- Coste por dia.
- Facturacion media por dia.
- Ratio personal/ventas.
- Desfase vs objetivo.
- Horas ineficientes.
- Escenario legal.
- Oportunidad semanal/anual.

Parametros:

- ratio objetivo, por defecto 33%.
- coste legal/hora configurable, por ejemplo 17 EUR/h.
- periodo de ventas usado para promedios.

Validacion:

- Fixture con datos del PDF Txiquita.
- Test de dias cerrados.
- Test de turnos cruzando medianoche.

Salida:

- Informe horario accionable.

## Fase 7 - Narrativa IA revisable

Objetivo: acelerar la redaccion sin perder control.

Cambios:

- Crear `src/lib/reports/report-narrative.ts`.
- Crear action server-side para regenerar narrativa por seccion.
- Guardar version de narrativa, fecha, modelo y prompt metadata.

Reglas:

- IA recibe snapshot reducido, no datos vivos completos.
- IA no calcula metricas.
- IA no publica sola.
- La UI permite editar narrativa.

Validacion:

- Snapshot con warnings produce narrativa prudente.
- Snapshot incompleto no inventa conclusiones.

Salida:

- Informe con lectura consultiva editable.

## Fase 8 - QA y despliegue controlado

Objetivo: preparar la funcionalidad para cliente real.

Checklist:

- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- Tests unitarios de builders.
- Browser desktop/mobile.
- Ruta print.
- RLS/manual tenant check.
- Revisión de `docs/ai/`.
- Prueba con datos demo.
- Prueba con Excel Txiquita en entorno controlado.

Salida:

- Feature lista para demo profesional.
