# Plan de desarrollo — Informes de consultoría ControlHub

Fecha: 2026-05-25
Repo: `app-finanzas-restaurante`
Objetivo: convertir ControlHub en una app capaz de generar informes finales de consultoría como el informe Chamaca y los informes Txiquita Tasca adjuntos, a partir de datos cargados en la aplicación.

## 0. Documentos de detalle

Esta carpeta queda organizada en cuatro piezas:

- `plan.md`: resumen ejecutivo y plan base.
- `reports/deep-review.md`: revision tecnica profunda por modulo, riesgos y contradicciones.
- `reports/data-contract.md`: contrato de datos de los informes, secciones, warnings y fuentes.
- `reports/implementation-roadmap.md`: roadmap de implementacion por fases con validaciones.
- `reports/phase-0-report.md`: informe de cierre de Fase 0 con cambios, validaciones y riesgos pendientes.

La conclusion de la revision profunda es clara: antes de construir el informe visual, hay que crear un motor de informes con snapshots deterministas, corregir inconsistencias multi-tenant y cerrar las brechas de schema en proveedores/staff. El objetivo no debe ser "exportar una pagina bonita", sino publicar informes trazables, auditables y reproducibles.

## 1. Referencias revisadas

- Web: `https://controlhub.es/informe-chamaca/`
- PDF: `C:\Users\Usuario\Downloads\Análisis Rentabilidad febrero - Txiquita Tasca (1).pdf`
- PDF: `C:\Users\Usuario\Downloads\Estudio de Horario - Txiquita Tasca - Diciembre 2025 (3).pdf`
- XLSX: `C:\Users\Usuario\Downloads\1. DIAGNÓSTICO FRO. TXIQUITA 2025.xlsx`
- Docs internas leídas: `docs/ai/00-vision-general.md`, `04-financial-control.md`, `T02-base-de-datos.md`, `T04-financial-math.md`, `T06-server-actions-comunes.md`, `T10-ai-insights.md`.

## 2. Qué debe ser el informe final

ControlHub debe generar un informe ejecutivo navegable y exportable con formato de consultoría, no solo un P&L. Debe combinar:

1. Resumen ejecutivo con KPIs, lectura del año/mes y alerta principal.
2. Cuenta de resultados comparada por años o meses.
3. Ingresos: evolución mensual, día de la semana, ticket medio, dependencia de días fuertes y heatmap día x mes.
4. Gastos: estructura, ratios vs objetivos y desviaciones por categoría.
5. Proveedores: compras por categoría, ranking, concentración y señales de compra de reposición.
6. Producto/carta: cobertura de escandallos, ranking de margen, productos críticos y oportunidades de pricing.
7. Operaciones/personal: matriz horaria, coste por día, ratio personal sobre ventas, desfase económico y escenario legal.
8. Conclusiones accionables, priorizadas y redactadas como consultoría.
9. Exportación a PDF/HTML imprimible con estilo similar a Chamaca.

## 3. Hallazgos de referencia

### Informe Chamaca

Estructura anual clara:

- Portada y navegación por secciones.
- Resumen ejecutivo con beneficio neto, ingresos netos, margen, break-even diario y ratios clave.
- P&L comparado 2022-2025.
- Ingresos por mes, día de semana y heatmap de facturación día x mes.
- Gastos con ratio real vs objetivo.
- Proveedores alimentación y bebidas con rankings y concentración.
- 10 conclusiones de negocio.

Métrica distintiva: el informe no se limita a mostrar datos; siempre traduce los datos a una lectura de gestión.

### Informe Rentabilidad Txiquita

Secciones principales:

- Cobertura de escandallos: 69 productos controlados, 0 sin escandallo, 100% cobertura.
- Incidencias de base de datos y carta.
- Distribución de rentabilidad: estrella, saludable, crítico.
- Ranking producto/formato/coste/PVP/beneficio/margen.
- Lista de productos urgentes con recomendación de acción.

Esto exige que ControlHub conecte `recipes`, costes, precios, formatos, ventas y margen contribución.

### Estudio Horario Txiquita

Secciones principales:

- Heatmap horario por día y hora con dotación de personal.
- Facturación media diaria.
- Coste de personal por día.
- Ratio personal sobre venta vs objetivo 33%.
- Desfase económico y horas ineficientes.
- Escenario real vs escenario legal completo.
- Próximos pasos.

Esto exige cruzar `employees`, `shifts`, costes horarios y ventas medias por día.

### Excel Diagnóstico FRO

El workbook contiene 21 hojas, entre ellas:

- `ARQUEO`: caja diaria, efectivo, tarjeta, facturación.
- `INGRESOS EXTRA`: delivery/plataformas.
- `PERSONAL`: sueldo, seguridad social, IRPF.
- `GASTOS OPERATIVOS`, `COMIDA`, `BEBIDA`, `MANTENIMIENTO`, `MARKETING`, `GASTOS EXTRA`, `INVERSIONES`, `GASTOS FINANCIEROS`.
- `RESULTADOS`, `INGRESOS`, `GASTOS`, `IMPUESTOS`, `RATIOS`, `EBITDA`.
- `DIAS SEMANA`, `Ranking comida`, `Ranking bebida`, `RANKING`.

Es prácticamente el modelo fuente que ControlHub debe absorber y normalizar.

## 4. Estado actual del código

Ya existe:

- `/financial-control` con tabs de Facturación, Gastos, Impuestos y Resultados.
- `monthly_results` como snapshot mensual.
- `daily_sales`, `operating_expenses`, `monthly_targets`.
- `ResultadosDashboard` con P&L, ratios, diagnósticos y cierre de mes.
- Export básico en `src/lib/export-utils.ts` con `jsPDF` y `xlsx`.
- Componentes sueltos en `src/components/financial-control/report-uploader/`, pero no hay flujo integrado que los use.

Gaps detectados:

- `docs/ai/T10-ai-insights.md` documenta `src/app/actions/ai-insights.ts`, pero el archivo no existe.
- `report-uploader` tiene tipos y tarjetas, pero no parece estar cableado a una página o action.
- `insertMonthlyTestData()` usa `restaurantId || "1"`, patrón inseguro y contrario a `docs/ai/T06`.
- `/staff/employees` usa `user.user_metadata?.restaurant_id || "1"`, lo que ya produjo error runtime: `invalid input syntax for type uuid: "1"`.
- El cierre `closeMonth()` solo marca `monthly_results` como cerrado; no genera un informe final rico.
- El export actual es P&L básico, no informe consultivo.
- No hay modelo persistente para secciones de informe, snapshots narrativos, métricas derivadas, heatmaps o conclusiones versionadas.
- Hay drift de schema en `price_history`: varias actions consultan columnas que no coinciden con la migracion base.
- `staff-optimization.ts` consulta campos que no coinciden con el schema profesional y usa tendencias aleatorias.
- Hay contradiccion de formula de menu engineering entre action, libreria y docs de calculo financiero.
- Varias mutaciones de financial control aceptan `restaurant_id` desde el cliente, contrario al protocolo documentado.

## 5. Arquitectura propuesta

### 5.1 Datos fuente normalizados

Mantener las tablas actuales como fuente operativa:

- Ventas: `daily_sales`, `daily_recipe_sales`.
- Gastos: `operating_expenses`.
- Mes cerrado: `monthly_results`.
- Carta: `recipes`, `recipe_ingredients`, `master_ingredients`.
- Compras/proveedores: `invoices`, `invoice_items`, `suppliers`, `supplier_items`, `price_history`.
- Personal: `employees`, `shifts`.

Añadir, si hace falta, tablas de soporte:

1. `period_reports`
   - `restaurant_id`
   - `period_type`: `month | quarter | year | custom`
   - `period_key`
   - `status`: `draft | generated | reviewed | published`
   - `source_snapshot` JSONB
   - `narrative` JSONB
   - `metadata` JSONB
   - `created_by`, `created_at`, `updated_at`

2. `report_sections`
   - `report_id`
   - `section_key`
   - `title`
   - `order_index`
   - `data` JSONB
   - `narrative` TEXT
   - `confidence`
   - `warnings` JSONB

3. Opcional para imports externos: `external_report_imports`
   - archivo, origen, estado, payload extraído, discrepancias, errores.

### 5.2 Motor de agregación

Crear un servicio server-side puro:

- `src/lib/reports/report-metrics.ts`
- `src/lib/reports/report-builders.ts`
- `src/lib/reports/report-narrative.ts`
- `src/app/actions/reports.ts`

Responsabilidades:

- Resolver `restaurant_id` solo en servidor con `getUserRestaurant()`.
- Construir snapshots deterministas antes de pedir narrativa IA.
- Calcular métricas sin depender de la UI.
- Guardar el informe versionado.
- Revalidar `/financial-control`, `/reports` y dashboard si aplica.

### 5.3 Tipos de informe

MVP debe soportar:

- Informe mensual financiero.
- Informe anual tipo Chamaca.
- Informe de rentabilidad de carta.
- Informe de estructura/horarios.

No mezclar todo en un único componente gigante. Usar un contrato común:

```ts
type ReportKind =
  | "financial_annual"
  | "financial_monthly"
  | "menu_profitability"
  | "staff_schedule_efficiency"

type ReportSection =
  | "executive_summary"
  | "pnl"
  | "revenue_trends"
  | "weekday_heatmap"
  | "expenses"
  | "suppliers"
  | "menu_profitability"
  | "staff_efficiency"
  | "conclusions"
```

## 6. UX propuesta

Añadir top-level route:

- `/reports`
- `/reports/new`
- `/reports/[id]`
- `/reports/[id]/print`

Flujo:

1. Usuario entra en `Informes`.
2. Elige tipo: mensual, anual, carta, horarios.
3. Elige período y módulos incluidos.
4. La app muestra checklist de datos:
   - Ventas cargadas.
   - Gastos cargados.
   - Facturas/proveedores suficientes.
   - Recetas con escandallo.
   - Turnos y coste hora.
5. Genera informe en borrador.
6. Usuario edita notas/conclusiones.
7. Publica/exporta a PDF.

Para no romper el flujo actual, `/financial-control` puede mantener un botón: `Generar informe del período`, que abre `/reports/new?kind=financial_monthly&period=YYYY-MM`.

## 7. Exportación

La exportación debe priorizar HTML imprimible + PDF del navegador, no `jsPDF` manual para informes largos.

Motivo:

- Informes Chamaca son visualmente web-first.
- Recharts/HTML/CSS permiten heatmaps, tarjetas, tablas y narrativa mejor que `jsPDF`.
- Exportar con `window.print()` o endpoint Playwright server-side da más fidelidad.

Propuesta:

- Crear `/reports/[id]/print` con CSS `@media print`.
- Añadir botón `Exportar PDF`.
- En local/servidor, usar Playwright solo si se necesita PDF server-side. Si no, `print` del navegador es suficiente para MVP.

## 8. Fases de implementación

### Fase 0 — Saneamiento antes de construir

- Corregir `restaurantId || "1"` en `src/app/actions/resultados.ts`.
- Corregir fallback `"1"` en `src/app/staff/employees/page.tsx`.
- Resolver contradicción `T10-ai-insights.md` vs código: crear `ai-insights.ts` o actualizar doc.
- Arreglar accesibilidad del `Sheet`/sidebar con `DialogTitle`.
- Arreglar estado de objetivo `0`: no mostrar “Objetivo superado” si no hay meta.
- Auditar y corregir mutaciones que reciben `restaurant_id` desde cliente.
- Auditar `price_history` antes de construir ranking de proveedores.
- Eliminar cualquier calculo aleatorio de staff antes de informes.

### Fase 1 — Modelo de informes

- Añadir migración para `period_reports` y, si procede, `report_sections`.
- Crear tipos Zod/TS.
- Crear actions:
  - `createReportDraft(input)`
  - `getReport(id)`
  - `generateReportSnapshot(id)`
  - `updateReportSection(id, sectionKey, patch)`
  - `publishReport(id)`
- Añadir docs `docs/ai/19-reports.md` y actualizar `docs/ai/README.md`.

### Fase 2 — Snapshot financiero mensual/anual

- Builder de P&L desde `monthly_results`.
- Builder de ingresos diarios desde `daily_sales`.
- Builder de gastos vs objetivos.
- Builder de heatmap día x mes.
- Builder de conclusiones deterministas sin IA primero.

### Fase 3 — Informe visual estilo Chamaca

- Crear UI de lectura:
  - portada
  - navegación por secciones
  - KPI cards
  - tablas comparativas
  - heatmaps
  - ranking proveedor
  - conclusiones
- Crear ruta print.
- Verificar responsive y print.

### Fase 4 — Carta/rentabilidad

- Builder desde recetas:
  - cobertura de escandallos
  - productos sin coste/precio
  - ranking margen
  - grupos estrella/saludable/crítico
  - recomendaciones de precio/coste.
- Integrar ventas por receta si hay `daily_recipe_sales`.

### Fase 5 — Horarios/personal

- Builder desde `shifts` + `employees` + ventas por día.
- Métricas:
  - horas por día/hora
  - coste personal real
  - coste legal simulado
  - ratio personal/ventas
  - desfase económico
  - horas ineficientes
- Heatmap semanal.

### Fase 6 — Importación de Excel/PDF histórico

- Para el Excel FRO: crear importador guiado.
- Mapear hojas a tablas:
  - `ARQUEO` -> `daily_sales`
  - `PERSONAL` -> `operating_expenses` o `monthly_results`
  - `COMIDA`/`BEBIDA` -> compras/proveedores/gastos COGS
  - `RESULTADOS`/`RATIOS`/`EBITDA` -> validación y snapshots.
- No insertar sin preview y confirmación.
- Guardar discrepancias.

### Fase 7 — Narrativa IA revisable

- Generar borrador con contexto de snapshot, no con datos vivos.
- Guardar narrativa por sección.
- Permitir editar antes de publicar.
- No enviar datos innecesarios a IA.

## 9. Criterios de aceptación

Un informe anual debe poder:

- Mostrar beneficio, ingresos, margen, break-even, ratios clave.
- Comparar mínimo 12 meses; ideal 2-4 años si hay datos.
- Mostrar heatmap día x mes.
- Mostrar gastos vs objetivo.
- Mostrar proveedores top y concentración.
- Incluir conclusiones accionables.
- Exportarse a PDF/print sin cortes visuales.
- Conservar snapshot aunque cambien datos posteriores.

Un informe de carta debe poder:

- Indicar cobertura de escandallos.
- Listar productos sin coste o sin PVP.
- Clasificar margen en estrella/saludable/crítico.
- Mostrar ranking coste/PVP/beneficio/margen.
- Sugerir acciones para productos críticos.

Un informe horario debe poder:

- Mostrar dotación por hora/día.
- Calcular coste real y coste legal simulado.
- Comparar ratio personal vs objetivo 33%.
- Identificar días/franjas deficitarias.
- Proponer reducción de horas con impacto económico.

## 10. Riesgos y decisiones

- Riesgo de datos incompletos: resolver con checklist previo al informe.
- Riesgo de doble fuente (`monthly_results` vs `daily_sales`): definir snapshot como fuente del informe publicado.
- Riesgo de PDFs largos con `jsPDF`: usar HTML print.
- Riesgo multi-tenant: ninguna action debe aceptar `restaurant_id` desde cliente.
- Riesgo de narrativa inventada: IA solo redacta sobre snapshot calculado y debe mostrar warnings de datos faltantes.

## 11. Primer sprint recomendado

1. Corregir saneamientos de Fase 0.
2. Crear modelo `period_reports`.
3. Crear `/reports` con lista vacía y `new`.
4. Crear builder financiero anual básico con datos existentes.
5. Crear vista HTML tipo Chamaca para resumen + P&L + gastos + conclusiones deterministas.
6. Añadir export print.
7. Verificar con datos `Casa Juan` y una carga parcial del Excel Txiquita en entorno controlado.

## 12. No hacer todavía

- No meter IA antes de tener snapshots deterministas.
- No importar automáticamente PDFs del cliente a DB sin revisión.
- No crear un export PDF con `jsPDF` para todo el informe largo.
- No mezclar informe anual, carta y horarios en un solo componente monolítico.
- No modificar docs legacy en `docs/` fuera de `docs/ai/`.
