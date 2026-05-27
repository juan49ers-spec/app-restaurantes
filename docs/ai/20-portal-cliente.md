# 20 — Portal Cliente

**Ruta:** `/portal`, `/portal/reports/[id]`
**Archivos clave:** `src/app/portal/layout.tsx`, `src/app/portal/page.tsx`, `src/app/portal/reports/[id]/page.tsx`, `src/app/actions/portal.ts`, `src/components/portal/*`
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
6. Revisa acciones sugeridas deterministas basadas en KPIs/conclusiones del snapshot, sin IA generativa.
7. En el detalle, navega por capítulos mediante anclas internas sin salir del portal.
8. Puede consultar el histórico de informes publicados, incluyendo si cada informe está pendiente de lectura o ya fue visto.
9. Puede solicitar una reunión de revisión.
10. Puede volver a ControlHub para operar la app interna.

## 3. Flujo técnico de datos

**Layout:** `src/app/portal/layout.tsx`

- Usa `getCurrentRestaurant()` para validar restaurante activo y mostrar identidad del consultor.
- Si no hay restaurante, redirige a `/login`.
- Renderiza una cabecera limpia sin sidebar operativo, con nombre/logo del consultor cuando existen.

**Componentes premium:** `src/components/portal/*`

- `PortalExecutiveBrief` renderiza una portada ejecutiva reutilizable para `/portal` y `/portal/reports/[id]`. Consume `ProfessionalReportPresentation`, no consulta datos y no recalcula el informe.
- La lectura principal prioriza conclusiones `critical` o `warning` antes que positivas, porque el portal debe destacar lo que requiere atención del cliente.
- `PortalChapterNavigation` renderiza navegación accesible por capítulos usando anclas `#chapter-{id}` en el detalle.
- `PortalPeriodComparisonPanel` muestra una comparación del periodo publicado contra el mes natural anterior. Consume `PortalPeriodComparison` ya calculado en servidor.
- `PortalSuggestedActions` muestra hasta 3 acciones sugeridas a revisar con el consultor. Las acciones salen de `buildPortalSuggestedActions(presentation)`, una función pura basada en tonos de KPIs/conclusiones.
- `PortalReportSummary` mantiene el histórico publicado con enlaces al detalle web y PDF imprimible.

**Actions:** `src/app/actions/portal.ts`

- `getPublishedReports()` lista solo drafts con `published_at IS NOT NULL`.
- `getPublishedReportDetail(id)` carga el snapshot completo solo si está publicado y pertenece al restaurante activo.
- `getPortalContext()` carga restaurante, datos del consultor y ventas acumuladas del mes vs objetivo.
- `markPublishedReportViewedForRestaurant(id, restaurantId)` vive en `src/lib/portal.ts` y se llama desde la página server `/portal/reports/[id]` después de validar restaurante e informe publicado. Actualiza `professional_report_drafts.viewed_at` con scope `id + restaurant_id + published_at IS NOT NULL`.
- `getPortalPeriodComparisonForRestaurant({ restaurantId, periodFrom, periodTo })` vive en `src/lib/portal.ts`. Carga ventas y gastos del periodo publicado y del mes natural anterior con scope `restaurant_id`, y delega el cálculo en `buildPortalPeriodComparison()`.
- `requestConsultantMeeting(input)` crea una fila `portal_meeting_requests` solo si no existe ya una solicitud abierta (`PENDING` o `ACKNOWLEDGED`) para ese informe y restaurante. Si existe, devuelve la solicitud existente con `reused: true`.
- `publishReportDraft(id)` y `unpublishReportDraft(id)` se usan desde la mesa interna. Publicar valida que el draft esta `READY`, pertenece al restaurante activo y que el snapshot supera `evaluateProfessionalReportQualityGate()` sin bloqueos.

**Consultas server-side:** `src/lib/portal.ts`

- Las páginas del portal usan helpers `*ForRestaurant(restaurantId)` después de resolver `getCurrentRestaurant()` en servidor.
- Las actions públicas siguen resolviendo `restaurant_id` con `getUserRestaurant()` y delegan en esos helpers para no duplicar queries.
- Si el contexto vivo falla, las páginas conservan identidad de restaurante/consultor desde `getCurrentRestaurant()` y solo omiten el dato vivo.

**Persistencia:**

- `professional_report_drafts.published_at` marca visibilidad en portal.
- `professional_report_drafts.published_by` conserva quién publicó.
- `professional_report_drafts.viewed_at` marca la última apertura del detalle web por parte del cliente/restaurante.
- `portal_meeting_requests` guarda solicitudes de reunión.

## 4. Reglas de negocio y restricciones

- El portal solo muestra informes publicados.
- `READY` no implica visibilidad; la visibilidad depende de `published_at`.
- Una version `READY` no puede publicarse si el snapshot tiene bloqueos criticos o secciones en conflicto. El servidor aplica este quality gate aunque la UI ya haya mostrado el estado.
- El detalle del portal consume `report_snapshot`; no recalcula el informe.
- Abrir `/portal/reports/[id]` marca `viewed_at`. Esta marca no cambia el snapshot, no altera el estado `READY` y no publica/despublica.
- El dato vivo solo muestra ventas acumuladas del mes actual contra objetivo mensual.
- El porcentaje del dato vivo se devuelve redondeado a 4 decimales para evitar artefactos de coma flotante.
- Si no hay objetivo mensual, no se muestra la card de dato vivo.
- Si falla la carga del dato vivo, no debe romper ni vaciar el portal.
- La solicitud de reunión no envía email en esta fase; solo crea registro interno.
- No se crean duplicados si el cliente vuelve a pulsar "Solicitar reunión" para el mismo informe mientras haya una solicitud `PENDING` o `ACKNOWLEDGED`.
- La solicitud aparece en `/consultant` para seguimiento del consultor.
- Los enlaces PDF desde el portal abren la vista imprimible en una pestaña nueva para no sacar al cliente del área limpia.
- La portada ejecutiva del portal muestra solo una lectura principal y una selección de KPIs/prioridades. El detalle completo vive en `/portal/reports/[id]`.
- La navegación por capítulos del detalle es solo UI local basada en `presentation.chapters`; no cambia URL de datos ni dispara queries nuevas.
- La comparativa mensual es lectura derivada, no modifica el snapshot y no cambia la calidad del informe. Usa `daily_sales.revenue_total` y `operating_expenses.amount` del restaurante activo para el periodo publicado y el mes natural anterior.
- Si no hay datos del mes anterior, la comparativa se muestra como `Sin histórico previo` y evita porcentajes engañosos cuando el denominador es 0.
- Las acciones sugeridas del portal son reglas deterministas sobre KPIs/conclusiones (`prime_cost`, materia prima, personal, ventas, rentabilidad). No son IA y no deben afirmar causalidad no soportada por los datos.
- `restaurant_id` nunca viaja desde cliente.

## 5. Dependencias e implicaciones cruzadas

- **Reports:** `/reports` publica o despublica versiones.
- **Consultant Workspace:** `/consultant` gestiona solicitudes de reunión e identidad del consultor.
- **Reporting profesional:** el portal usa `ProfessionalRestaurantReport` y `buildProfessionalReportPresentation()`. Los componentes premium consumen la presentación ya derivada y no acceden a Supabase.
- **Financial Control:** aporta ventas diarias y objetivos mensuales para el dato vivo.
- **Gastos operativos:** aporta `operating_expenses.amount` para la comparativa mensual del portal.
- **Base de datos:** depende de `professional_report_drafts`, `restaurants` y `portal_meeting_requests`.
- **Insights del portal:** `src/lib/portal-insights.ts` mantiene cálculos puros de comparativa mensual y acciones sugeridas. No importa Supabase ni componentes.
- **Layout:** `AppLayout` exime `/portal` para no mostrar sidebar operativo.
- **Consultas compartidas:** `src/lib/portal.ts` mantiene el mapper de informes publicados y el contexto vivo reutilizable por pages y actions.

## 6. Casos límite y errores conocidos

- Si no hay informes publicados, se muestra estado vacío.
- Si un informe existe pero no está publicado, no aparece ni puede abrirse por URL.
- Si el consultor intenta publicar un snapshot bloqueado, la action devuelve error y no actualiza `published_at`.
- Si el objetivo mensual no existe o es 0, no se muestra progreso vivo.
- Si falla una solicitud de reunión, el formulario muestra error sin romper el portal.
- Si ya existe una solicitud abierta para el informe, el formulario informa al cliente y no inserta otra fila.
- Si una versión se despublica mientras el cliente la ve, una recarga deja de mostrarla.
- Si una versión se despublica o se vuelve a publicar, `viewed_at` se reinicia para que el nuevo ciclo de entrega empiece como pendiente de lectura.
- Si el informe tiene conclusiones con tono `warning` o `critical`, la portada las muestra antes que una lectura positiva para orientar la revisión con el consultor.
- Si un capítulo no tiene secciones disponibles en el snapshot, la navegación puede seguir mostrando el capítulo por contrato de presentación, pero el detalle solo renderiza secciones existentes.
- Si falla la comparativa mensual, el portal conserva portada, KPIs, acciones sugeridas e histórico; no debe bloquear la lectura del informe.
- Si el periodo anterior tiene ventas o gastos a 0, los deltas absolutos se muestran, pero los porcentajes relativos pueden omitirse para no inventar una evolución.

## 7. Al añadir/modificar una función aquí

1. Leer [T11](./T11-reporting-profesional.md).
2. Leer [T06](./T06-server-actions-comunes.md) antes de tocar actions.
3. No aceptar `restaurant_id` desde cliente.
4. No recalcular informes desde páginas del portal.
5. Mantener PDF basado en snapshot guardado.
6. Añadir tests de action para cualquier cambio de publicación o reunión.
7. Si una página server necesita leer portal, resolver restaurante en servidor y usar `src/lib/portal.ts`, no llamar a una mutación/action como data loader.
