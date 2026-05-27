# 19 — Reports

**Ruta:** `/reports`
**Archivos clave:** `src/app/reports/page.tsx`, `src/app/reports/print/[draftId]/page.tsx`, `src/components/reports/ProfessionalReportReview.tsx`, `src/components/reports/PrintReportButton.tsx`, `src/app/actions/professional-reporting.ts`, `src/lib/reporting/*`
**Transversales relacionados:** [T01](./T01-arquitectura.md), [T04](./T04-financial-math.md), [T06](./T06-server-actions-comunes.md), [T11](./T11-reporting-profesional.md)

## 1. Propósito y rol en el negocio

Mesa de revision de informes profesionales. Permite elegir un periodo, generar un borrador estructurado y revisar la calidad de datos antes de convertirlo en un informe final para cliente.

No sustituye al control financiero diario. Es una capa superior orientada a diagnostico, evidencia y narrativa profesional.

## 2. Viaje del usuario

1. Entra en `/reports` desde el menu CORE.
2. La pagina propone el mes actual como periodo.
3. Puede ajustar fecha inicial y final.
4. Pulsa "Generar" y la URL cambia a `/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`.
5. La pagina carga un borrador desde `getProfessionalReportDraft(period)` y el historial guardado con `getProfessionalReportDraftHistory(period)`.
6. Revisa estado global, confianza, bloqueos criticos, fuentes y secciones.
7. Revisa la vista de informe final: KPIs destacados, capitulos, carta y conclusiones ejecutivas.
8. Edita la narrativa de cada seccion.
9. Pulsa "Guardar revision". La action regenera los datos en servidor, guarda un snapshot y conserva las narrativas editadas.
10. Si no hay bloqueos criticos, puede pulsar "Guardar listo para publicar" para crear una version `READY`.
11. Cuando una version esta `READY`, puede publicarla en el portal cliente si el quality gate del snapshot no detecta bloqueos criticos.
12. Desde "Versiones" abre "Exportar", que lleva a `/reports/print/[draftId]`.
13. En la vista imprimible pulsa "Guardar PDF / imprimir" para usar el dialogo nativo del navegador.

## 3. Flujo tecnico de datos

**Server page:** `src/app/reports/page.tsx`

- Llama `getCurrentRestaurant()`.
- Si no hay restaurante, redirige a `/onboarding`.
- Lee `from` y `to` desde `searchParams`.
- Valida formato basico `YYYY-MM-DD`; si no existe, usa el mes actual.
- Llama `getProfessionalReportDraft(period)`.
- Llama `getProfessionalReportDraftHistory(period)`.
- Pasa `report` o `error` al client component.
- Pasa `savedDrafts` para mostrar versiones del periodo actual.

**Client component:** `ProfessionalReportReview`

- Renderiza KPIs de calidad del informe.
- Renderiza la capa ejecutiva construida por `buildProfessionalReportPresentation(report)`.
- Evalua el quality gate con `evaluateProfessionalReportQualityGate(report)` y muestra si el informe esta listo, publicable con advertencias o bloqueado.
- Agrupa secciones en tabs.
- Permite editar narrativa.
- Guarda versiones mediante `saveProfessionalReportDraft`: revision normal (`DRAFT`/`REVIEWED`) o version `READY` cuando no hay bloqueos criticos.
- Publica o despublica versiones `READY` mediante `publishReportDraft` y `unpublishReportDraft`.
- No envia `restaurant_id` ni calculos financieros desde cliente.

**Print page:** `src/app/reports/print/[draftId]/page.tsx`

- Carga una version guardada con `getSavedProfessionalReportDraft(draftId)`.
- Carga `getCurrentRestaurant()` para incorporar la marca visible del consultor (`consultant_name`, `consultant_email`, `consultant_logo_url`) sin modificar el snapshot.
- Renderiza `ProfessionalReportPrintDocument`, un documento HTML imprimible con portada, KPIs ejecutivos, bloque de referencia, índice, conclusiones numeradas, plan de revisión recomendado para la reunión, capitulos, metricas, incidencias, narrativas revisadas, pie de documento imprimible y anexo de calidad de dato.
- Usa `PrintReportButton` para marcar `exported_at` y abrir `window.print()` con `try/finally`, de forma que el botón no quede bloqueado si la marca de exportación falla inesperadamente.

**Persistencia:** `professional_report_drafts`

- Guarda snapshot JSONB completo de `ProfessionalRestaurantReport`.
- Guarda `narrative_overrides` por seccion.
- Versiona por `restaurant_id + period_from + period_to + version`.
- `published_at` y `published_by` separan estado interno de visibilidad en portal cliente.
- RLS limita filas al restaurante propietario.

**Motor:** todo calculo viene de `src/lib/reporting/`; la UI no recalcula rentabilidad.

**Quality gate:** `src/lib/reporting/quality-gate.ts`

- Es una funcion pura sobre `ProfessionalRestaurantReport`.
- Convierte incidencias criticas en bloqueos de publicacion.
- Permite publicar con advertencias cuando los problemas no son criticos.
- Trata secciones `CONFLICT` como bloqueo defensivo aunque falte una incidencia global.
- Se usa tanto en la UI de revision como en `publishReportDraft()` antes de actualizar `published_at`.

**Datos demo de verificacion:** `src/app/actions/seed-professional-report-demo.ts` + `src/app/api/seed-reporting-demo/route.ts`

- Solo habilitado fuera de produccion, salvo `ALLOW_REPORTING_DEMO_SEED=true`.
- La ruta HTTP valida usuario autenticado antes de ejecutar la seed y aplica un limite simple por usuario/IP para evitar ejecuciones repetidas accidentales.
- Resuelve el restaurante activo en servidor.
- Crea datos deterministas para febrero 2026: ventas, gastos, objetivo mensual si no existe, empleados, turnos, proveedores, facturas, recetas y ventas por receta.
- Marca filas demo con `source`, `idempotency_key`, emails o nombres `[Demo Informe]` para poder limpiar/resembrar sin tocar datos no demo. Las ventas por receta solo se limpian si pertenecen a recetas demo.

**Capa de presentacion:** `src/lib/reporting/professional-report-presentation.ts`

- Consume `ProfessionalRestaurantReport`.
- Ordena el informe como entregable profesional: portada, KPIs, capitulos y conclusiones.
- No consulta Supabase.
- No modifica metricas fuente.
- Cuando hay `monthly_targets`, muestra cumplimiento de objetivo como KPI ejecutivo.
- Cuando hay ventas diarias, incluye lectura de dia fuerte, dia debil y brecha semanal acotada: `weekday_spread_pct = (dia_fuerte - dia_debil) / dia_fuerte`. El texto debe leerse como "el dia debil queda X% por debajo del fuerte", no como crecimiento sobre el dia debil.
- Cuando hay `daily_recipe_sales`, incorpora una seccion de carta con unidades vendidas, venta estimada, coste estimado, margen bruto estimado, producto lider por margen y producto con menor margen porcentual.
- Cuando hay un `menu_reports` ANALYZED cuyo rango queda contenido en el periodo, incorpora una seccion de Ingenieria de carta con snapshot BCG: conteo por STAR/PLOWHORSE/PUZZLE/DOG, umbrales y productos prioritarios.

## 4. Reglas de negocio y restricciones

- `restaurant_id` no viaja desde cliente.
- El periodo viaja por URL como `from` y `to`, no como objeto con restaurante.
- La UI debe mostrar estados `OK`, `PARTIAL`, `MISSING`, `CONFLICT` sin suavizarlos.
- Las metricas deben mostrar "Sin dato" cuando `kind = not_available`.
- La capa de presentacion puede derivar ratios ejecutivos, pero siempre desde metricas del snapshot y con `sourceIds`.
- Las comparativas contra objetivo solo aparecen si el objetivo existe y es mayor que 0.
- La lectura semanal solo usa dias con venta registrada; no interpreta ausencias como ventas cero salvo que exista fila fuente.
- La lectura de carta usa `daily_recipe_sales` + `recipes.current_cost/selling_price`. Si faltan ventas por receta, queda como `PARTIAL` y no como bloqueo critico.
- La seccion descriptiva de carta (`menu_performance`) no recalcula BCG. La seccion `menu_engineering` solo presenta BCG si existe un snapshot Menu Engineering `ANALYZED` del restaurante activo y contenido en el periodo del informe.
- Si no hay snapshot BCG, `menu_engineering` queda `PARTIAL` con warning. No bloquea rentabilidad ni exportacion; simplemente impide afirmar recomendaciones BCG.
- El guardado siempre regenera el informe en servidor antes de insertar el snapshot; no se persisten metricas enviadas por cliente.
- Cada guardado crea una nueva version inmutable. No se sobrescriben versiones anteriores.
- `saveProfessionalReportDraft` debe estar cubierto por tests de snapshot regenerado, bloqueo por restaurante no coincidente y retry por choque de version.
- "Guardar revision" crea `DRAFT` si hay bloqueos criticos y `REVIEWED` si no los hay.
- "Guardar listo para publicar" solo esta habilitado sin bloqueos criticos y crea una version `READY`.
- `READY` significa listo internamente. Solo `published_at IS NOT NULL` hace visible una version en `/portal`.
- Publicar exige dos condiciones: la fila debe pertenecer al restaurante activo y estar `READY`, y el snapshot guardado debe pasar `evaluateProfessionalReportQualityGate()` sin bloqueos.
- `publishReportDraft` vuelve a validar en servidor el `restaurant.id` del snapshot antes de evaluar el gate. La UI no es fuente de verdad.
- La exportacion actual es HTML imprimible/PDF de navegador, no generacion binaria server-side. El template debe estar preparado para A4 mediante CSS print y consumir siempre el snapshot guardado.
- La marca visible del PDF pertenece al consultor configurado en `restaurants.consultant_*`; si no existe, se usa una identidad neutra de ControlHub.
- El plan de revisión recomendado del PDF se genera con `buildConsultantBriefing(presentation)`: es determinista, no usa IA y prioriza conclusiones críticas/warning para orientar la reunión sin inventar causalidad.
- La seed demo de informes no debe exponerse como funcionalidad normal de cliente. Es herramienta de verificacion/dev. El endpoint devuelve `401` si no hay usuario autenticado, `403` si la seed no esta habilitada en el entorno y `429` si se excede el limite por usuario/IP.

## 5. Dependencias e implicaciones cruzadas

- **Reporting profesional:** consume el contrato `ProfessionalRestaurantReport`.
- **Financial Control:** ventas, gastos, objetivos y fiscalidad alimentan el informe.
- **Staff:** empleados y turnos alimentan la seccion de personal.
- **Suppliers/Invoices:** proveedores y facturas completadas alimentan compras y fiabilidad.
- **Recipes/Stock:** `daily_recipe_sales` y `recipes` alimentan la lectura de carta.
- **Navigation:** aparece en `src/config/navigation.ts` dentro de CORE.
- **Consultant Workspace:** `/consultant` muestra las versiones publicadas y las solicitudes asociadas a informes.
- **Base de datos:** depende de `professional_report_drafts` y sus politicas RLS.
- **Exportacion:** la salida imprimible consume el snapshot guardado, no el estado actual del formulario.
- **Referencias externas:** el formato se inspira en informes ControlHub tipo Chamaca y documentos Txiquita, pero la app debe generar contenido desde datos propios.

## 6. Casos limite y errores conocidos

- Si faltan datos, la pagina debe mostrar el borrador con incidencias, no ocultar el informe.
- Si la action devuelve error, se muestra una alerta y no se renderizan secciones vacias.
- Si el usuario edita narrativa y cambia periodo, se reinicializa el borrador local con el nuevo informe.
- Si dos guardados coinciden en version, la action reintenta una vez para evitar choque por indice unico.
- Si una version guardada no pertenece al restaurante activo, la print page devuelve `notFound()`.
- Si `markProfessionalReportDraftExported` falla, el HTML sigue siendo imprimible; solo no quedaria marcado `exported_at`.
- Si la marca del consultor no está configurada, el PDF sigue renderizando portada e informe completo con fallback neutro.
- Si hay bloqueos criticos, las conclusiones ejecutivas priorizan calidad de dato y no recomendaciones de negocio.
- Si una version `READY` fue guardada antes de endurecer el criterio, `publishReportDraft` la bloquea si el snapshot contiene incidencias criticas o conflicto de seccion.
- Si falla la publicacion por quality gate, la version sigue guardada como `READY`, pero no se hace visible en `/portal`.
- Si no existen objetivos mensuales, el informe vuelve a umbrales profesionales por defecto solo en la capa ejecutiva.
- Si no hay ventas por receta, el informe puede seguir siendo revisable, pero la carta queda incompleta.
- Si ventas por receta y ventas diarias no cuadran, se muestra cobertura de carta contra ventas diarias para evitar conclusiones falsas de mix.
- Si no hay reporte Menu Engineering analizado para el periodo, el informe muestra la ausencia como incidencia parcial, no genera cuadrantes desde datos actuales.
- Si existe reporte BCG pero faltan clasificaciones en items, la seccion queda parcial.
- La seed demo borra y recrea solo filas marcadas como demo. No debe borrar datos reales del restaurante ni ventas por receta asociadas a recetas reales.

## 7. Al anadir/modificar una funcion aqui

1. Leer [T11](./T11-reporting-profesional.md).
2. No recalcular metricas en componentes React.
3. Si se cambia persistencia de borradores, leer [T02](./T02-base-de-datos.md) y mantener versionado/RLS.
4. Si se cambia exportacion, consumir el snapshot `ProfessionalRestaurantReport`.
5. Si se cambia la capa ejecutiva, actualizar tests de `buildProfessionalReportPresentation`.
6. Si se anade una mutacion, seguir [T06](./T06-server-actions-comunes.md).
7. Probar `/reports` con datos completos, faltantes y conflicto de ventas.
