# Revision profunda - Informes profesionales ControlHub

Fecha: 2026-05-25
Alcance: informe tipo Chamaca, informes Txiquita Tasca adjuntos y estado real del codigo.

## 1. Diagnostico ejecutivo

La app ya tiene una base valiosa: ventas diarias, gastos, resultados mensuales, proveedores, recetas, compras y personal. Pero todavia no esta preparada para generar informes profesionales de consultoria de forma fiable.

El problema principal no es visual. El bloqueo esta en la capa de datos y en los contratos de negocio:

- Hay acciones que aceptan `restaurant_id` desde cliente, contrario al protocolo interno.
- Hay fallbacks `"1"` en flujos multi-tenant que ya rompen en runtime porque la BD espera UUID.
- Hay modulos que consultan columnas que no existen segun las migraciones actuales.
- Hay calculos mockeados o aproximados que no pueden aparecer en informes cliente.
- Hay piezas de uploader/export/reporting, pero no existe un motor de informe versionado.

Decision recomendada: construir primero un `Report Engine` server-side con snapshots deterministas y despues la UI/exportacion. La narrativa IA debe ser la ultima capa, no la fuente de verdad.

## 2. Referencias externas y entregables esperados

### 2.1 Informe Chamaca

El informe web en `https://controlhub.es/informe-chamaca/` marca el formato objetivo:

- Informe navegable, no solo PDF plano.
- Portada ejecutiva.
- KPIs de negocio visibles desde el inicio.
- P&L comparado.
- Evolucion de ingresos por mes.
- Analisis por dia de semana.
- Heatmap de facturacion.
- Gastos comparados contra objetivos.
- Proveedores y concentracion.
- Conclusiones accionables.

La logica distintiva es que cada bloque convierte datos en decision: alerta, lectura de gestion y siguiente accion.

### 2.2 PDF Rentabilidad Txiquita

El PDF de rentabilidad exige un informe de carta con:

- Cobertura de escandallos.
- Productos sin escandallo o con problemas de mapeo.
- Distribucion de rentabilidad por rangos.
- Ranking producto/formato/coste/PVP/beneficio/margen.
- Productos criticos con recomendacion.

Datos extraidos del documento:

- 69 productos controlados.
- 0 productos sin escandallo.
- 100% de cobertura.
- 19 productos estrella con margen mayor o igual a 75%.
- 30 productos saludables entre 60% y 75%.
- 20 productos criticos por debajo de 60%.
- Productos urgentes detectados: Piparras Tempura Racion, Torreznos, Lentejas, Piparras Media, Navajas y Patatas Fritas Espinaler.

Implicacion tecnica: el modulo de carta debe cruzar recetas, ingredientes, coste, PVP, formato y ventas. Si falta un mapeo, el informe debe mostrarlo como incidencia, no ocultarlo.

### 2.3 PDF Estudio Horario Txiquita

El PDF de horarios exige un informe operativo con:

- Heatmap dia x hora con dotacion.
- Coste de personal mensual y semanal.
- Facturacion media por dia.
- Ratio personal/ventas vs objetivo.
- Desfase economico.
- Horas ineficientes.
- Escenario real y escenario legal.

Datos extraidos del documento:

- Coste personal mensual: 14.607 EUR.
- Horas mensuales: 1.104 h.
- Coste medio: 13,23 EUR/h.
- Facturacion estimada: 43.378 EUR.
- Objetivo de ratio personal: 33%.
- Ratio total actual: 42,1%.
- Desfase semanal: 823 EUR.
- Oportunidad anual estimada: 42.818 EUR.
- En escenario legal a 17 EUR/h, ratio total: 54,1% y oportunidad anual: 79.259 EUR.

Implicacion tecnica: el modulo staff debe ser determinista. No puede usar tendencias aleatorias ni columnas inexistentes.

### 2.4 Excel Diagnostico FRO

El Excel es el origen historico mas parecido al modelo que debe absorber ControlHub:

- `ARQUEO`: caja diaria, efectivo, tarjeta, facturacion.
- `INGRESOS EXTRA`: delivery y plataformas.
- `PERSONAL`: sueldos, seguridad social, IRPF, total.
- `MARKETING`, `GASTOS OPERATIVOS`, `COMIDA`, `BEBIDA`, `MANTENIMIENTO`, `GASTOS EXTRA`, `INVERSIONES`, `GASTOS FINANCIEROS`.
- `RESULTADOS`, `INGRESOS`, `GASTOS`, `IMPUESTOS`, `RATIOS`, `EBITDA`.
- `DIAS SEMANA`.
- `Ranking comida`, `Ranking bebida`, `RANKING`.

Advertencia: algunas hojas contienen formulas rotas o valores tipo `#ERROR!` / `#DIV/0!`. El importador debe ser asistido, con preview y validacion. No debe importar ciegamente.

## 3. Estado actual por modulo

### 3.1 Financial Control

Archivos relevantes:

- `src/app/financial-control/page.tsx`
- `src/app/financial-control/client.tsx`
- `src/app/actions/financial-control.ts`
- `src/components/financial-control/ResultadosDashboard.tsx`
- `src/app/actions/resultados.ts`
- `src/lib/export-utils.ts`

Fortalezas:

- Ya hay separacion por tabs: facturacion, gastos, impuestos y resultados.
- Ya existen agregaciones para dashboard.
- Ya existe `monthly_results` como snapshot mensual basico.
- Ya hay exportacion inicial a PDF/Excel.

Problemas:

- `upsertDailySales`, `upsertOperatingExpense` y `upsertMonthlyTarget` aceptan `restaurant_id` desde el cliente.
- `insertMonthlyTestData()` usa `restaurantId || "1"`.
- `closeMonth()` acepta `restaurantId` desde UI y solo marca el mes como cerrado.
- El cierre mensual no crea snapshot de informe, ni secciones, ni narrativa, ni version.
- `getBillingDashboardData()` aproxima efectivo/tarjeta con 40/60, lo cual no sirve para un informe si el cliente necesita caja real.
- `getFinancialHubData()` usa coste teorico de personal con multiplicador fijo `15`.
- La UI de tabs no parece reflejar `?view=...` aunque la documentacion interna lo menciona.

Impacto:

- Alto. Antes de generar informes, hay que asegurar multi-tenant, cerrar el modelo de snapshot y separar datos reales de aproximaciones.

### 3.2 Results / Monthly Close

Archivos relevantes:

- `src/app/actions/resultados.ts`
- `src/components/financial-control/ResultadosDashboard.tsx`
- migracion `monthly_results`

Fortalezas:

- Hay una entidad mensual que puede ser base de snapshots.
- El dashboard ya calcula margen bruto, EBITDA, beneficio neto, ratios y desviaciones.

Problemas:

- `closeMonth()` no calcula ni congela nada; solo actualiza `is_closed`.
- No hay versionado de cierre.
- No hay control de "datos incompletos".
- No hay bloqueo o advertencia cuando se recalculan datos tras cerrar.

Decision:

- Mantener `monthly_results` como resumen financiero.
- Crear `period_reports` como snapshot publicado para informes.
- El informe debe poder indicar que un mes esta cerrado, en borrador o publicado.

### 3.3 Report Uploader

Archivos relevantes:

- `src/components/financial-control/report-uploader/types.ts`
- `src/components/financial-control/report-uploader/ReportCard.tsx`
- `src/components/financial-control/report-uploader/HistoryRow.tsx`

Fortalezas:

- Hay tipos para un `ExtractedMonthlyReport`.
- Hay componentes visuales reutilizables.

Problemas:

- No se ha encontrado un flujo padre integrado.
- No hay action server-side clara para parsear, validar, confirmar e importar.
- No hay persistencia de imports externos.

Decision:

- No apoyarse en esto como base funcional hasta cablearlo.
- Reaprovechar tipos o componentes solo si encajan con el nuevo contrato `external_report_imports`.

### 3.4 Menu Engineering / Carta

Archivos relevantes:

- `src/app/actions/menu-engineering.ts`
- `src/lib/menu-engineering.ts`
- `src/app/menu-engineering/page.tsx`

Fortalezas:

- Existen calculos de coste, margen, contribucion y matriz de menu.
- Hay actions con patron `safeAction`.
- Hay modelos de receta e ingredientes que encajan con el informe de rentabilidad.

Problemas:

- Contradiccion de formula: `src/app/actions/menu-engineering.ts` clasifica popularidad con umbral Kasavana `(1 / totalItems) * 0.7`, mientras `src/lib/menu-engineering.ts` y `docs/ai/T04-financial-math.md` usan media de unidades vendidas.
- Hay que decidir cual es la formula oficial antes de mostrar clasificaciones al cliente.
- El informe PDF de Txiquita pide rangos de margen por coste/PVP, no solo matriz BCG.

Decision:

- Separar dos calculos:
  - `menu_matrix`: popularidad/contribucion.
  - `menu_profitability_report`: coste, PVP, beneficio y margen por producto/formato.
- Resolver formalmente la formula y actualizar `docs/ai/` en la implementacion.

### 3.5 Suppliers / Purchasing

Archivos relevantes:

- `src/app/actions/purchase-analytics.ts`
- `src/app/actions/smart-ordering.ts`
- `src/app/actions/supplier-scorecard.ts`
- `supabase/migrations/20260209_create_price_history.sql`
- `supabase/migrations/20250303_performance_indexes.sql`

Fortalezas:

- Existen conceptos de proveedores, compras, recomendaciones y scorecards.
- El informe Chamaca necesita exactamente rankings y concentracion de proveedor.

Problemas criticos:

- Actions consultan columnas como `master_ingredient_id`, `quantity`, `supplier_id`, `recorded_at` o `variance_pct` en `price_history`.
- La migracion base de `price_history` define `entity_id`, `entity_type`, `price`, `previous_price`, `change_pct`, `created_at`.
- Otra migracion de indices referencia `ingredient_id`, `recorded_at` y `deleted_at`, que no encajan con la migracion base.

Impacto:

- Muy alto. Los informes de proveedores no deben construirse sobre estas actions hasta resolver el contrato real de schema.

Decision:

- Auditar schema Supabase real.
- Normalizar `price_history` o crear vistas/queries nuevas correctas.
- Para MVP financiero, proveedores pueden entrar desde gastos/compras existentes si los datos de invoices son fiables.

### 3.6 Staff / Horarios

Archivos relevantes:

- `src/app/staff/employees/page.tsx`
- `src/app/actions/staff.ts`
- `src/app/actions/staff-actions.ts`
- `src/app/actions/staff-optimization.ts`
- migraciones HR

Fortalezas:

- Hay entidades de empleados, turnos, ausencias y politicas.
- El dominio encaja con el informe horario de Txiquita.

Problemas:

- `/staff/employees` usa fallback `"1"` para restaurante y ya produjo error UUID.
- Hay duplicidad de actions entre `staff.ts` y `staff-actions.ts`.
- `staff-optimization.ts` consulta `base_salary_monthly`, pero el schema profesional usa `monthly_base_salary`.
- `staff-optimization.ts` usa `Math.random()` para tendencias. Esto invalida cualquier informe profesional.
- Hay posibles inconsistencias entre enums de estado de turno en migraciones y Zod.

Decision:

- Corregir acceso multi-tenant primero.
- Consolidar actions o declarar cual es la capa oficial.
- El informe horario debe usar solo datos trazables: turnos, horas, coste/hora, ventas por dia.
- Los escenarios legales deben ser parametros explicitos, no magic numbers escondidos.

### 3.7 AI Insights

Archivos relevantes:

- `docs/ai/T10-ai-insights.md`
- codigo real: `src/app/actions/ai-insights.ts` no existe.

Contradiccion:

- La documentacion describe un modulo/action que no esta en el codigo.

Decision:

- El codigo gana.
- Antes de implementar narrativa IA, decidir si se crea `ai-insights.ts` o si la documentacion debe cambiar hacia `reports/report-narrative.ts`.
- No actualizar la documentacion en silencio.

### 3.8 UI / Navegacion

Archivos relevantes:

- `src/config/navigation.ts`
- `src/components/layout/Sidebar.tsx`
- `src/components/ui/sheet.tsx`

Problemas:

- No existe ruta `Informes`.
- El sidebar movil dispara warning/error de Radix por faltar `DialogTitle` en `SheetContent`.
- La navegacion por addons deberia decidir si `Informes` es core o modulo premium.

Decision:

- Crear `Informes` como core si es eje del producto.
- Arreglar accesibilidad del sidebar antes de validar frontend.

## 4. Contrato de datos objetivo

### 4.1 Entidad principal

`period_reports`

Campos minimos:

- `id`
- `restaurant_id`
- `kind`: `financial_monthly`, `financial_annual`, `menu_profitability`, `staff_schedule_efficiency`
- `period_type`: `month`, `year`, `custom`
- `period_start`
- `period_end`
- `status`: `draft`, `generated`, `reviewed`, `published`, `archived`
- `source_snapshot` JSONB
- `warnings` JSONB
- `metadata` JSONB
- `created_by`
- `created_at`
- `updated_at`
- `published_at`

### 4.2 Secciones

`report_sections`

Campos minimos:

- `id`
- `report_id`
- `section_key`
- `title`
- `order_index`
- `data` JSONB
- `narrative` TEXT
- `confidence`: `complete`, `partial`, `insufficient`
- `warnings` JSONB
- `created_at`
- `updated_at`

### 4.3 Importaciones externas

`external_report_imports`

Campos minimos:

- `id`
- `restaurant_id`
- `source_type`: `fro_excel`, `profitability_pdf`, `staff_pdf`, `manual_csv`
- `file_name`
- `file_hash`
- `status`: `uploaded`, `parsed`, `mapped`, `validated`, `imported`, `failed`
- `raw_payload` JSONB
- `normalized_payload` JSONB
- `mapping_warnings` JSONB
- `created_by`
- `created_at`

## 5. Builders necesarios

### 5.1 Financial Annual Builder

Entradas:

- `daily_sales`
- `operating_expenses`
- `monthly_results`
- `monthly_targets`
- compras/proveedores si disponibles

Salidas:

- KPIs ejecutivos.
- P&L por mes y comparativo anual si hay historico.
- Evolucion mensual de ingresos.
- Facturacion por dia de semana.
- Heatmap dia x mes.
- Gastos por categoria vs objetivo.
- Proveedores top y concentracion.
- Conclusiones deterministas.

Warnings:

- Falta split efectivo/tarjeta real.
- Meses sin cierre.
- Meses con ventas pero sin gastos.
- Gastos sin categoria.

### 5.2 Menu Profitability Builder

Entradas:

- `recipes`
- `recipe_ingredients`
- `master_ingredients`
- precios de venta
- ventas por receta si existen

Salidas:

- Cobertura de escandallos.
- Incidencias de mapeo.
- Ranking coste/PVP/beneficio/margen.
- Rangos estrella/saludable/critico.
- Productos urgentes.
- Recomendaciones por item.

Warnings:

- Recetas sin PVP.
- Ingredientes sin coste.
- Formatos no mapeados.
- Venta sin receta asociada.

### 5.3 Staff Schedule Efficiency Builder

Entradas:

- `employees`
- `shifts`
- ventas diarias
- parametros: coste legal/hora, objetivo ratio personal

Salidas:

- Heatmap dotacion por hora/dia.
- Horas por dia.
- Coste por dia.
- Facturacion media por dia.
- Ratio personal/ventas.
- Desfase vs objetivo.
- Escenario real.
- Escenario legal.
- Oportunidad semanal/anual.

Warnings:

- Turnos sin empleado.
- Empleado sin coste.
- Ventas insuficientes para promedio.
- Dias cerrados confundidos con dias sin datos.

## 6. Matriz de brechas

| Necesidad del informe | Estado actual | Brecha | Prioridad |
| --- | --- | --- | --- |
| Snapshot publicado | `monthly_results` parcial | Falta `period_reports` versionado | P0 |
| Informe anual web | No existe | Crear `/reports/[id]` y print | P0 |
| Export PDF profesional | `jsPDF` basico | HTML print / PDF navegador | P0 |
| Multi-tenant seguro | Inconsistente | Quitar `restaurant_id` desde cliente | P0 |
| Rentabilidad carta | Calculos parciales | Builder especifico + formula oficial | P1 |
| Horarios | Datos existen parcialmente | Corregir staff schema/actions | P1 |
| Proveedores | Actions con schema drift | Auditar schema y reescribir queries | P1 |
| Import Excel | No integrado | Importador con preview | P2 |
| Narrativa IA | Doc existe, codigo no | Crear capa despues de snapshots | P2 |

## 7. Riesgos principales

### Riesgo 1: informes bonitos con datos no fiables

Mitigacion:

- Cada informe debe mostrar `warnings`.
- Cada seccion debe tener `confidence`.
- No publicar si faltan P0 de datos.

### Riesgo 2: mezclar datos vivos con informes cerrados

Mitigacion:

- Publicar siempre desde snapshot.
- Nunca renderizar un informe publicado directamente desde tablas operativas.

### Riesgo 3: fuga multi-tenant

Mitigacion:

- Todas las actions de informes usan `getUserRestaurant()` o `safeAction`.
- El cliente nunca envia `restaurant_id`.
- RLS y tests de acceso cruzado.

### Riesgo 4: IA inventando conclusiones

Mitigacion:

- IA solo redacta sobre JSON calculado.
- Guardar prompts, modelo, fecha y warnings.
- Permitir edicion humana antes de publicar.

### Riesgo 5: schema drift en Supabase

Mitigacion:

- Auditar migraciones contra tipos generados.
- No construir proveedores/staff avanzado hasta cerrar contrato de columnas.

## 8. Definicion de hecho

Un informe se considera listo para cliente cuando:

- Se genera desde datos reales del restaurante logueado.
- Tiene snapshot persistido.
- Tiene warnings visibles si hay datos incompletos.
- No depende de `Math.random()`, ratios hardcodeados o columnas inexistentes.
- Se puede abrir en `/reports/[id]`.
- Se puede imprimir desde `/reports/[id]/print`.
- Mantiene el mismo resultado aunque cambien datos operativos posteriores.
- Tiene tests unitarios de builders.
- Tiene verificacion visual en navegador desktop y mobile.
- La documentacion `docs/ai/` del modulo queda actualizada durante la implementacion.
