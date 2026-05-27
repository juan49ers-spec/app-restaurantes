# T11 — Reporting profesional

> Transversal. Núcleo para informes profesionales tipo consultoría. Léelo antes de tocar cualquier informe, export PDF/Excel o narrativa ejecutiva.

## 1. Propósito y rol en el negocio

El reporting profesional convierte datos operativos del restaurante en un borrador de informe trazable. Su objetivo no es “rellenar páginas”, sino decidir qué puede afirmarse con rigor, qué está incompleto y qué no debe salir hacia cliente.

## 2. Contrato maestro

Archivo principal: `src/lib/reporting/types.ts`.

El contrato `ProfessionalRestaurantReport` incluye identidad del restaurante, periodo, estado global de calidad de dato, mapa de fuentes, resumen ejecutivo y secciones de ventas, costes, personal, proveedores, rentabilidad, recomendaciones y anexo.

Cada sección tiene `quality.status` (`OK`, `PARTIAL`, `MISSING`, `CONFLICT`), confianza 0-100, incidencias, evidencia y métricas tipadas con unidad, fuente y tipo (`actual`, `derived`, `estimated`, `not_available`).

Desde Fase 5, la seccion de ventas incluye diagnostico por dia de semana cuando hay ventas registradas. La brecha semanal se expresa como porcentaje acotado sobre el dia fuerte: `(dia_fuerte - dia_debil) / dia_fuerte`, por lo que debe narrarse como "el dia debil queda X% por debajo". La seccion de rentabilidad compara ingresos, materia prima y personal contra `monthly_targets` si existen objetivos configurados.

Desde Fase 6, el informe incluye una seccion de carta (`menu_performance`) alimentada por `daily_recipe_sales` y `recipes`. Esta seccion calcula unidades vendidas, venta estimada por receta, coste estimado, margen bruto estimado, producto lider y producto con menor margen porcentual. No es todavia una matriz BCG dentro del informe.

Desde Fase 7, Menu Engineering ya tiene una formula BCG unica en libreria, action y simulador.

Desde Fase 8, Reporting incorpora `menu_engineering` como seccion separada de la carta descriptiva. Esta seccion no recalcula BCG: consume el ultimo `menu_reports` con `status=ANALYZED` del restaurante activo cuyo `date_from/date_to` queda dentro del periodo del informe. Si no existe snapshot, la seccion queda `PARTIAL` y no inventa cuadrantes.

Desde Fase 12, Reporting incorpora un quality gate puro en `src/lib/reporting/quality-gate.ts`. El gate decide si un snapshot puede publicarse en portal cliente: bloquea incidencias criticas y secciones `CONFLICT`, permite publicar con advertencias no criticas y expone el mismo criterio para UI y servidor.

## 3. Flujo técnico de datos

**Motor puro:** `src/lib/reporting/build-professional-report.ts`.

- No consulta Supabase.
- No lee sesión.
- No inventa datos.
- Recibe arrays ya cargados y devuelve un informe estructurado.

**Mapa de fuentes:** `src/lib/reporting/source-map.ts`.

**Capa de presentacion:** `src/lib/reporting/professional-report-presentation.ts`.

- Consume el contrato maestro.
- Construye portada, KPIs ejecutivos, capitulos y conclusiones.
- Puede derivar ratios de lectura ejecutiva, pero siempre desde metricas ya presentes en el informe y manteniendo `sourceIds`.
- No consulta Supabase y no altera el snapshot base.
- Eleva el cumplimiento de objetivos a KPI ejecutivo cuando `monthly_targets` existe.

**Quality gate:** `src/lib/reporting/quality-gate.ts`.

- Consume solo `ProfessionalRestaurantReport`.
- No consulta Supabase.
- No recalcula metricas.
- Devuelve `READY`, `WARNING` o `BLOCKED`, con listas separadas de bloqueos, avisos e informacion.
- Lo usa `ProfessionalReportReview` para orientar al consultor y `publishReportDraft` para impedir publicar snapshots con bloqueos.

**Server action de lectura:** `src/app/actions/professional-reporting.ts`.

- Valida periodo con Zod.
- Resuelve `restaurant_id` con `getUserRestaurant()`.
- Carga datos de Supabase para el restaurante activo.
- Construye el informe con el motor puro.
- Lista versiones guardadas con `getProfessionalReportDraftHistory(period)`.
- Guarda versiones con `saveProfessionalReportDraft(input)`.
- Abre snapshots guardados con `getSavedProfessionalReportDraft(id)`.

Tablas consultadas: `restaurants`, `daily_sales`, `operating_expenses`, `monthly_targets`, `employees`, `shifts`, `suppliers`, `invoices`, `daily_recipe_sales`, `recipes`, `menu_reports`, `menu_report_items`.

Tabla de persistencia desde Fase 3: `professional_report_drafts`.

Desde Fase 9, la publicación al cliente es explícita: `status = READY` solo indica preparación interna; `published_at IS NOT NULL` indica visibilidad en `/portal`.

**UI de revision:** `src/app/reports/page.tsx` + `src/components/reports/ProfessionalReportReview.tsx`.

- La pagina carga el borrador por periodo.
- La UI muestra calidad global, evidencias, incidencias y metricas.
- La UI muestra la capa ejecutiva previa a exportacion.
- La narrativa es editable y puede persistirse como override por seccion.
- La ruta `/reports/print/[draftId]` renderiza el snapshot guardado mediante `ProfessionalReportPrintDocument`. La salida HTML imprimible incluye portada con marca del consultor, KPIs, índice, conclusiones, capítulos, métricas, incidencias y anexo de calidad de dato.

**Seed demo de verificacion:** `src/app/actions/seed-professional-report-demo.ts`.

- Crea un caso completo y determinista para febrero 2026.
- Solo funciona fuera de produccion, salvo override explicito `ALLOW_REPORTING_DEMO_SEED=true`.
- Su endpoint HTTP exige usuario autenticado y limita llamadas repetidas por usuario/IP.
- Sirve para validar visualmente informes completos antes de avanzar en fases de analisis.

## 4. Reglas de negocio y restricciones

- No se genera conclusión profesional si faltan ventas o gastos.
- No se maquilla un cero: `0` puede significar dato real a cero o sin dato; el motor marca `MISSING` cuando no hay filas fuente.
- Los conflictos de ventas por canal se marcan como `CONFLICT` si canales y venta total difieren más de un 5%.
- El prime cost usa gastos de personal si existen. Si no hay gastos de personal pero sí turnos, usa coste de turnos y marca la sección como parcial.
- Las facturas de proveedores solo cuentan como compra real si `status = completed`.
- Las recomendaciones dependen de la calidad de dato.
- Los objetivos mensuales se usan solo como comparativa. Si `revenue_target=0` o no existe objetivo, no se fuerza lectura de cumplimiento.
- La lectura por dia de semana se calcula solo con dias que tengan filas de venta registradas; no inventa demanda de dias sin dato.
- La lectura de carta se calcula solo con recetas vendidas en `daily_recipe_sales` y con PVP/coste actuales de `recipes`.
- Si faltan ventas por receta, `menu_performance` queda `PARTIAL` con severidad `warning`; no debe bloquear conclusiones financieras si ventas/gastos existen.
- La cobertura de carta contra ventas diarias debe mostrarse cuando sea calculable para detectar capturas incompletas.
- BCG vive en `menu_engineering`, no en `menu_performance`. Solo se presenta desde snapshot Menu Engineering ya calculado, con `sourceIds=['menu_engineering.report']`.
- Las recomendaciones BCG deben ser prudentes: STAR como referencia, PUZZLE como producto a revisar comercialmente, PLOWHORSE como volumen con margen a optimizar. No presentar DOG como orden automatica de eliminacion.
- Los datos demo se consideran herramienta de QA/dev, no dato operativo real ni importacion de cliente.
- El cliente no envia metricas para persistir. Al guardar, el servidor regenera el informe desde Supabase y guarda ese snapshot.
- Cada guardado crea una version nueva; no se sobreescriben snapshots.
- El guardado queda cubierto por tests de regeneracion server-side, saneamiento de narrativa, verificacion de pertenencia y retry por version duplicada.
- La exportacion visible debe abrir una version guardada. No debe exportar estado local sin snapshot.
- La publicación en portal solo puede hacerse sobre versiones guardadas. El portal consume snapshots publicados y no recalcula el informe.
- Publicar en portal exige snapshot guardado `READY`, pertenencia al restaurante activo y quality gate sin bloqueos. La validacion se repite en servidor aunque la UI ya haya mostrado el estado.
- La salida actual es imprimible por navegador con CSS orientado a A4; si se anade PDF server-side, debe consumir el mismo snapshot y la misma estructura documental.
- Si existen bloqueos criticos, las conclusiones deben hablar de calidad de dato antes que de decisiones comerciales.

## 5. Dependencias e implicaciones cruzadas

- **Financial Control:** ventas, gastos, presupuestos y rentabilidad.
- **Staff:** plantilla y coste de turnos.
- **Suppliers/Purchasing:** proveedores, fiabilidad y facturas completadas.
- **Recipes/Stock:** ventas por receta y fichas tecnicas alimentan la seccion de carta.
- **Exportes futuros:** PDF/Excel deben consumir este contrato, no recalcular por su cuenta.
- **Persistencia:** `professional_report_drafts` conserva snapshots y narrativas revisadas.
- **AI Insights futuros:** la IA debe recibir el informe estructurado con calidad de dato, no tablas sueltas.

## 6. Casos límite y errores conocidos

- Periodos largos con pocos registros se marcan como `PARTIAL`.
- Gastos negativos se aceptan como correcciones, pero generan incidencia informativa.
- Si no hay gastos de personal, el coste laboral puede venir de turnos; esto no equivale a contabilidad real de nóminas.
- `monthly_targets` ya gobierna la comparativa de ingresos, materia prima y personal cuando existen objetivos válidos. Si no hay objetivo, no se fuerza una lectura presupuestaria.
- La Fase 1 no diseña PDF final. Primero fija contrato, fuentes y calidad de dato.
- La Fase 3 incorpora persistencia real de versiones y salida HTML imprimible.
- La Fase 4 incorpora estructura de entregable: portada, KPIs destacados, capitulos y conclusiones numeradas.
- La Fase 5 incorpora comparativa contra objetivos mensuales y diagnostico de venta por dia de semana.
- La Fase 6 incorpora diagnostico basico de carta desde ventas por receta, sin clasificacion BCG.
- La Fase 6.5 incorpora seed demo completa, tests de server action y pulido de exportacion imprimible.
- La Fase 7 unifica la formula BCG de Menu Engineering, pero reporting aun no incorpora esos cuadrantes en el entregable profesional.
- La Fase 7.2 cierra deuda menor de formulas y QA: `getStats().avgMargin` vuelve a margen ponderado, la brecha semanal queda acotada, el endpoint demo distingue auth/rate limit y se cubren edge cases de Menu Engineering.
- La Fase 8 incorpora BCG al informe profesional como snapshot trazable, no como recalculo en UI.
- La Fase 12 incorpora quality gate compartido para preparar y publicar informes sin duplicar criterios entre UI y servidor.
- Si dos guardados simultaneos chocan por version, la action reintenta una vez.

## 7. Al añadir/modificar reporting

1. Leer [T04](./T04-financial-math.md) si cambias métricas financieras.
2. Leer [T02](./T02-base-de-datos.md) si añades tablas fuente.
3. Leer [T06](./T06-server-actions-comunes.md) si añades una action.
4. Añadir la fuente en `source-map.ts` antes de usarla en métricas.
5. Cada métrica debe tener `sourceIds`.
6. Cada sección debe poder explicar su calidad con `issues` y `evidence`.
7. No hacer queries dentro del motor puro.
8. Añadir tests en `tests/reporting/` para datos completos, faltantes y contradictorios.
9. Si el informe exporta PDF/Excel, debe consumir `ProfessionalRestaurantReport`.
10. Si cambias guardado/exportacion, probar que el snapshot guardado se abre desde `/reports/print/[draftId]`.
11. Si cambias presentacion, probar `buildProfessionalReportPresentation` con datos completos y faltantes.
