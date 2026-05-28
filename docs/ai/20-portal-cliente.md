# 20 — Portal Cliente

**Ruta:** `/portal`, `/portal/reports/[id]`
**Archivos clave:** `src/app/portal/layout.tsx`, `src/app/portal/page.tsx`, `src/app/portal/reports/[id]/page.tsx`, `src/app/actions/portal.ts`, `src/app/api/portal/meeting-request/route.ts`, `src/lib/portal.ts`, `src/components/portal/*`
**Transversales relacionados:** [T01](./T01-arquitectura.md), [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md), [T06](./T06-server-actions-comunes.md), [T11](./T11-reporting-profesional.md)

## 1. Propósito y rol en el negocio

Área cliente profesional para consultar informes publicados por el consultor. Convierte el informe guardado en una experiencia web ejecutiva, con PDF como salida secundaria.

No sustituye la mesa interna de `/reports` ni la mesa de consultoría `/consultant`; solo muestra versiones ya publicadas y permite solicitar reunión.

## 2. Viaje del usuario

1. El usuario entra en `/portal`.
2. Ve una portada ejecutiva del último informe publicado: lectura principal, KPIs destacados, prioridades de revisión y acceso al PDF.
3. Puede abrir el detalle web del informe.
4. Al abrir el detalle, el informe queda marcado como visto para que el consultor pueda hacer seguimiento.
5. Ve una comparativa ejecutiva del periodo publicado frente al mes anterior: ventas, gastos, resultado operativo y presión de gasto.
6. En el detalle, consulta tendencia de hasta 3 meses y desglose de gastos por categoría para entender evolución y focos de coste.
7. Revisa acciones sugeridas deterministas basadas en KPIs/conclusiones del snapshot, sin IA generativa.
8. En el detalle, ve un plan de revisión accionable que le indica si toca leer el informe, revisar prioridades, pedir reunión o esperar al consultor.
9. En el detalle, navega por capítulos mediante anclas internas sin salir del portal.
10. Puede consultar el histórico de informes publicados, con estado claro del ciclo de entrega: nuevo, leído, reunión solicitada, en preparación o revisado.
11. Puede solicitar una reunión de revisión.
12. Puede volver a ControlHub para operar la app interna.

## 3. Flujo técnico de datos

**Layout:** `src/app/portal/layout.tsx`

- Usa `getCurrentRestaurant()` para validar restaurante activo y mostrar identidad del consultor.
- Si no hay restaurante, redirige a `/login`.
- Renderiza una cabecera limpia sin sidebar operativo, con nombre/logo del consultor cuando existen.

**Componentes premium:** `src/components/portal/*`

- `PortalExecutiveBrief` renderiza una portada ejecutiva reutilizable para `/portal` y `/portal/reports/[id]`. Consume `ProfessionalReportPresentation`, no consulta datos y no recalcula el informe.
- La lectura principal prioriza conclusiones `critical` o `warning` antes que positivas, porque el portal debe destacar lo que requiere atención del cliente.
- `PortalChapterNavigation` renderiza navegación accesible por capítulos usando anclas `#chapter-{id}` en el detalle.
- `PortalChapterSection` renderiza cada capítulo del detalle con lectura principal, bloques de métricas, confianza/evidencias e incidencias de calidad cuando existen. Consume secciones del snapshot publicado y `narrativeOverrides`; no consulta datos ni recalcula métricas.
- `PortalDeliveryPack` agrupa los entregables disponibles para el cliente: informe web, PDF imprimible y revisión con consultor. No genera documentos nuevos; ordena salidas ya existentes del snapshot publicado.
- `PortalPeriodComparisonPanel` muestra una comparación del periodo publicado contra el mes natural anterior. Consume `PortalPeriodComparison` ya calculado en servidor.
- `PortalMultiPeriodTrend` muestra hasta 3 meses de ventas, gastos y resultado operativo. Consume `PortalMultiPeriodTrend` calculado en servidor desde datos agregados.
- `PortalExpenseBreakdown` muestra gastos por categoría, ordenados por variación absoluta frente al mes anterior. Consume `PortalExpenseCategoryBreakdown` calculado en servidor y usa etiquetas españolas de `EXPENSE_CATEGORY_LABELS`.
- `PortalSuggestedActions` muestra hasta 3 acciones sugeridas a revisar con el consultor. Las acciones salen de `buildPortalSuggestedActions(presentation)`, una función pura basada en tonos de KPIs/conclusiones.
- `PortalClientReviewPlan` muestra el plan accionable del cliente para el detalle del informe. Consume `buildPortalClientReviewPlan({ viewedAt, meetingStatus, suggestedActions })` y no persiste estado propio.
- `PortalReviewRoadmap` muestra el recorrido de revisión del cliente: informe publicado, lectura, estado de reunión y próximas acciones. Consume `viewed_at`, `meetingStatus` y número de acciones sugeridas; no persiste estado nuevo.
- `PortalReportSummary` mantiene el histórico publicado con enlaces al detalle web y PDF imprimible. Además muestra el estado de entrega derivado de `viewed_at` y de la última solicitud de reunión.
- `PortalMeetingRequestDialog` usa `/api/portal/meeting-request` para solicitar reunión desde el cliente. Mantiene un estado optimista persistido en `sessionStorage` por informe para que el feedback "Solicitud registrada" sobreviva a remounts del árbol cliente tras la petición.

**Actions:** `src/app/actions/portal.ts`

- `getPublishedReports()` lista solo drafts con `published_at IS NOT NULL`.
- `getPublishedReportDetail(id)` carga el snapshot completo solo si está publicado y pertenece al restaurante activo.
- `getPortalContext()` carga restaurante, datos del consultor y ventas acumuladas del mes vs objetivo.
- `markPublishedReportViewedForRestaurant(id, restaurantId)` vive en `src/lib/portal.ts` y se llama desde la página server `/portal/reports/[id]` después de validar restaurante e informe publicado. Actualiza `professional_report_drafts.viewed_at` con scope `id + restaurant_id + published_at IS NOT NULL`.
- `getPortalPeriodComparisonForRestaurant({ restaurantId, periodFrom, periodTo })` vive en `src/lib/portal.ts`. Carga ventas y gastos del periodo publicado y del mes natural anterior con scope `restaurant_id`, y delega el cálculo en `buildPortalPeriodComparison()`.
- `getPortalMultiPeriodTrendForRestaurant({ restaurantId, periodFrom, periodTo })` vive en `src/lib/portal.ts`. Carga ventas y gastos del periodo publicado y los dos meses naturales anteriores con scope `restaurant_id`, agrupa por mes y delega en `buildPortalMultiPeriodTrend()`.
- `getPortalExpenseBreakdownForRestaurant({ restaurantId, periodFrom, periodTo })` vive en `src/lib/portal.ts`. Carga `operating_expenses.category/amount` del periodo publicado y del mes anterior con scope `restaurant_id`, y delega en `buildPortalExpenseCategoryBreakdown()`.
- `requestConsultantMeeting(input)` crea una fila `portal_meeting_requests` solo si no existe ya una solicitud abierta (`PENDING` o `ACKNOWLEDGED`) para ese informe y restaurante. Si existe, devuelve la solicitud existente con `reused: true`.
- `publishReportDraft(id)` y `unpublishReportDraft(id)` se usan desde la mesa interna. Publicar valida que el draft esta `READY`, pertenece al restaurante activo y que el snapshot supera `evaluateProfessionalReportQualityGate()` sin bloqueos.
- Las acciones críticas del ciclo de entrega registran auditoría en `admin_audit_log`: `report.publish`, `report.unpublish` y `portal.meeting_request`. La metadata incluye `restaurant_id`, y en reuniones incluye `report_id` y si la solicitud fue reutilizada.

**API routes:** `src/app/api/portal/meeting-request/route.ts`

- `POST /api/portal/meeting-request` valida `reportId/message` con Zod, resuelve `restaurant_id` en servidor con `getUserRestaurant()` y delega en `requestConsultantMeetingForRestaurant()`.
- La ruta existe para el formulario cliente interactivo; evita depender de una server action invocada desde el cliente cuando el árbol se remonta y se pierde estado local.

**QA operativo:** `npm run qa:client-flow`

- Ejecuta el recorrido determinista consultor -> cliente con Vitest y puede añadir QA visual con Playwright si se define `RUN_VISUAL_QA=true`.
- La QA visual local usa por defecto `http://127.0.0.1:3100`, no `:3000`, para evitar colisiones con servidores abiertos durante desarrollo. Se puede cambiar con `E2E_PORT`.
- Para validar el portal publicado en producción se puede usar `QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow`.
- Las credenciales de prueba (`E2E_EMAIL`, `E2E_PASSWORD`) se cargan desde variables de entorno o `.env.local`; nunca deben quedar hardcodeadas en los tests.
- La parte visual necesita un informe publicado; si no lo hay, las pruebas E2E se saltan con explicación en vez de fallar sin contexto.

**Consultas server-side:** `src/lib/portal.ts`

- Las páginas del portal usan helpers `*ForRestaurant(restaurantId)` después de resolver `getCurrentRestaurant()` en servidor.
- Las actions públicas siguen resolviendo `restaurant_id` con `getUserRestaurant()` y delegan en esos helpers para no duplicar queries.
- `src/lib/portal.ts` contiene la orquestación pública, mappers, respuestas y aplicación de lógica derivada.
- `src/lib/portal-queries.ts` contiene las consultas Supabase de bajo nivel del portal. No debe contener lógica editorial ni decidir estados de UI; solo ejecuta lecturas/escrituras scoped por `restaurant_id`.
- `requestConsultantMeetingForRestaurant({ restaurantId, reportId, message })` concentra la validación de pertenencia del informe publicado, el anti-duplicado de solicitudes abiertas y la inserción de `portal_meeting_requests`. Lo reutilizan la server action y la API route.
- Si el contexto vivo falla, las páginas conservan identidad de restaurante/consultor desde `getCurrentRestaurant()` y solo omiten el dato vivo.

**Persistencia:**

- `professional_report_drafts.published_at` marca visibilidad en portal.
- `professional_report_drafts.published_by` conserva quién publicó.
- `professional_report_drafts.viewed_at` marca la última apertura del detalle web por parte del cliente/restaurante.
- `portal_meeting_requests` guarda solicitudes de reunión.
- `admin_audit_log` guarda eventos explícitos del flujo de entrega para trazabilidad operativa.
- El histórico del portal une los informes publicados con la última solicitud de reunión del informe para mostrar `meetingStatus` sin persistir un estado duplicado en `professional_report_drafts`.

## 4. Reglas de negocio y restricciones

- El portal solo muestra informes publicados.
- `READY` no implica visibilidad; la visibilidad depende de `published_at`.
- Una version `READY` no puede publicarse si el snapshot tiene bloqueos criticos o secciones en conflicto. El servidor aplica este quality gate aunque la UI ya haya mostrado el estado.
- El detalle del portal consume `report_snapshot`; no recalcula el informe.
- Los capítulos del detalle muestran calidad de dato e incidencias dentro de cada bloque para que el cliente entienda qué lecturas son firmes y cuáles requieren revisión con el consultor.
- Abrir `/portal/reports/[id]` marca `viewed_at`. Esta marca no cambia el snapshot, no altera el estado `READY` y no publica/despublica.
- El dato vivo solo muestra ventas acumuladas del mes actual contra objetivo mensual.
- El porcentaje del dato vivo se devuelve redondeado a 4 decimales para evitar artefactos de coma flotante.
- Si no hay objetivo mensual, no se muestra la card de dato vivo.
- Si falla la carga del dato vivo, no debe romper ni vaciar el portal.
- La solicitud de reunión no envía email en esta fase; solo crea registro interno.
- No se crean duplicados si el cliente vuelve a pulsar "Solicitar reunión" para el mismo informe mientras haya una solicitud `PENDING` o `ACKNOWLEDGED`.
- La base de datos refuerza ese anti-duplicado con un índice parcial único por `restaurant_id + report_id` para solicitudes abiertas.
- La solicitud aparece en `/consultant` para seguimiento del consultor.
- Publicar, despublicar y solicitar/reutilizar reunión dejan rastro en `admin_audit_log`, pero un fallo de auditoría no debe impedir la acción principal si la escritura funcional ya ha terminado.
- Los enlaces PDF desde el portal abren la vista imprimible en una pestaña nueva para no sacar al cliente del área limpia. Esa vista incluye el plan de revisión recomendado generado de forma determinista desde el snapshot.
- El paquete de entrega debe recordar que informe web y PDF salen del mismo snapshot publicado. No debe sugerir que son documentos diferentes con datos distintos.
- La portada ejecutiva del portal muestra solo una lectura principal y una selección de KPIs/prioridades. El detalle completo vive en `/portal/reports/[id]`.
- La navegación por capítulos del detalle es solo UI local basada en `presentation.chapters`; no cambia URL de datos ni dispara queries nuevas.
- La comparativa mensual es lectura derivada, no modifica el snapshot y no cambia la calidad del informe. Usa `daily_sales.revenue_total` y `operating_expenses.amount` del restaurante activo para el periodo publicado y el mes natural anterior.
- Si no hay datos del mes anterior, la comparativa se muestra como `Sin histórico previo` y evita porcentajes engañosos cuando el denominador es 0.
- La tendencia multi-periodo es lectura derivada de los dos meses anteriores más el periodo publicado. No sustituye a la comparativa mensual; aporta contexto de trayectoria.
- El desglose de gastos por categoría es lectura derivada de `operating_expenses`. Un gasto que sube se marca como peor y uno que baja como mejor, porque en este panel `lowerIsBetter=true`.
- El estado del histórico se deriva así: sin lectura = `Nuevo`; leído sin reunión = `Leído`; solicitud `PENDING` = `Reunión solicitada`; `ACKNOWLEDGED` = `Reunión en preparación`; `COMPLETED` = `Revisado`.
- El recorrido de revisión del portal usa los mismos datos derivados que el histórico. No crea una fuente de estado adicional.
- Las acciones sugeridas del portal son reglas deterministas sobre KPIs/conclusiones (`prime_cost`, materia prima, personal, ventas, rentabilidad). No son IA y no deben afirmar causalidad no soportada por los datos.
- El plan de revisión del cliente es derivado de `viewed_at`, `meetingStatus` y acciones sugeridas. No crea columnas nuevas ni duplica el estado del histórico.
- El plan de revisión enlaza por anclas a `#resumen-ejecutivo`, `#acciones-sugeridas` o `#solicitar-reunion`; no dispara mutaciones.
- `restaurant_id` nunca viaja desde cliente.

## 5. Dependencias e implicaciones cruzadas

- **Reports:** `/reports` publica o despublica versiones.
- **Consultant Workspace:** `/consultant` gestiona solicitudes de reunión e identidad del consultor.
- **Reporting profesional:** el portal usa `ProfessionalRestaurantReport` y `buildProfessionalReportPresentation()`. Los componentes premium consumen la presentación ya derivada y no acceden a Supabase.
- **Financial Control:** aporta ventas diarias y objetivos mensuales para el dato vivo.
- **Gastos operativos:** aporta `operating_expenses.amount` para la comparativa mensual del portal.
- **Gastos operativos:** aporta `operating_expenses.category` para el desglose por categoría.
- **Base de datos:** depende de `professional_report_drafts`, `restaurants` y `portal_meeting_requests`.
- **Insights del portal:** `src/lib/portal-insights.ts` mantiene cálculos puros de comparativa mensual, tendencia multi-periodo, desglose de gastos y acciones sugeridas. No importa Supabase ni componentes.
- **Plan de revisión:** `buildPortalClientReviewPlan()` vive también en `src/lib/portal-insights.ts` porque es lógica editorial pura del portal.
- **Layout:** `AppLayout` exime `/portal` para no mostrar sidebar operativo.
- **Consultas compartidas:** `src/lib/portal.ts` mantiene el mapper de informes publicados y el contexto vivo reutilizable por pages y actions.
- **Queries compartidas:** `src/lib/portal-queries.ts` centraliza el acceso a Supabase del portal para que nuevas lecturas no vuelvan a mezclar queries con presentación en `portal.ts`.

## 6. Casos límite y errores conocidos

- Si no hay informes publicados, se muestra estado vacío.
- Si un informe existe pero no está publicado, no aparece ni puede abrirse por URL.
- Si el consultor intenta publicar un snapshot bloqueado, la action devuelve error y no actualiza `published_at`.
- Si el objetivo mensual no existe o es 0, no se muestra progreso vivo.
- Si falla una solicitud de reunión, el formulario muestra error sin romper el portal.
- Si ya existe una solicitud abierta para el informe, el formulario informa al cliente y no inserta otra fila.
- Si el componente de solicitud se remonta después de enviar la petición, el estado de confirmación se recupera desde `sessionStorage` para mantener feedback visible al cliente.
- Si una versión se despublica mientras el cliente la ve, una recarga deja de mostrarla.
- Si una versión se despublica o se vuelve a publicar, `viewed_at` se reinicia para que el nuevo ciclo de entrega empiece como pendiente de lectura.
- Si el informe tiene conclusiones con tono `warning` o `critical`, la portada las muestra antes que una lectura positiva para orientar la revisión con el consultor.
- Si un capítulo no tiene secciones disponibles en el snapshot, la navegación puede seguir mostrando el capítulo por contrato de presentación, pero el detalle solo renderiza secciones existentes.
- Si una sección tiene `quality.issues`, el detalle las muestra como incidencias de dato; no las oculta detrás de la métrica principal.
- Si falla la comparativa mensual, el portal conserva portada, KPIs, acciones sugeridas e histórico; no debe bloquear la lectura del informe.
- Si el periodo anterior tiene ventas o gastos a 0, los deltas absolutos se muestran, pero los porcentajes relativos pueden omitirse para no inventar una evolución.
- Si falla la tendencia multi-periodo o el desglose por categoría, el detalle conserva el informe publicado, comparativa mensual, acciones y capítulos.
- Si solo hay un mes con datos, la tendencia muestra `Sin tendencia histórica`.
- Si no hay gastos del mes anterior, el desglose muestra importes actuales y evita deltas porcentuales.
- Si no hay acciones sugeridas, el recorrido de revisión muestra que no hay acciones urgentes, pero mantiene la recomendación de revisar el histórico y hacer seguimiento.
- Si el cliente aún no abrió el detalle, el plan de revisión prioriza leer el informe completo.
- Si el cliente ya leyó el informe y hay acciones sugeridas, el plan prioriza revisar esas acciones antes de pedir reunión.
- Si ya existe solicitud de reunión, el plan no invita a duplicarla: muestra el estado abierto y enlaza al bloque de solicitud.
- Si la reunión está completada, el plan marca todos los pasos como listos y apunta al histórico del portal.
- Si un informe se despublica, el paquete de entrega deja de estar accesible porque depende de que el snapshot esté publicado en portal.

## 7. Al añadir/modificar una función aquí

1. Leer [T11](./T11-reporting-profesional.md).
2. Leer [T06](./T06-server-actions-comunes.md) antes de tocar actions.
3. No aceptar `restaurant_id` desde cliente.
4. No recalcular informes desde páginas del portal.
5. Mantener PDF basado en snapshot guardado.
6. Añadir tests de action para cualquier cambio de publicación o reunión.
7. Si una página server necesita leer portal, resolver restaurante en servidor y usar `src/lib/portal.ts`, no llamar a una mutación/action como data loader.
8. Antes de una demo cliente, ejecutar `npm run qa:client-flow`; si se va a enseñar portal real, añadir `RUN_VISUAL_QA=true`.
