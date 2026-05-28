# 21 — Consultant Workspace

**Ruta:** `/consultant`
**Archivos clave:** `src/app/consultant/page.tsx`, `src/app/actions/consultant.ts`, `src/lib/consultant/*`, `src/components/consultant/PreparationChecklist.tsx`, `src/components/consultant/ConsultantBrandingForm.tsx`, `src/components/consultant/DeliveryWorkflowPanel.tsx`, `src/components/consultant/MeetingRequestsPanel.tsx`
**Transversales relacionados:** [T01](./T01-arquitectura.md), [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md), [T06](./T06-server-actions-comunes.md), [T11](./T11-reporting-profesional.md)

## 1. Propósito y rol en el negocio

Mesa interna para el consultor. Su función es coordinar la entrega profesional al restaurante cliente: informes publicados, solicitudes de reunión y marca visible en el portal.

No es el portal cliente y no debe usarse como experiencia pública. Tampoco introduce todavía un modelo multi-cliente completo; trabaja sobre el restaurante activo resuelto en servidor.

## 2. Viaje del usuario

1. El consultor entra en `/consultant`.
2. Si tiene más de un restaurante accesible, ve la cartera de clientes y puede seleccionar el restaurante activo.
3. Ve el restaurante activo y un resumen de informes publicados, solicitudes abiertas y última publicación.
4. Revisa la checklist del periodo que está preparando. Por defecto es el mes actual, pero puede navegar a meses anteriores con los controles anterior/siguiente.
5. Ve la siguiente acción recomendada del periodo, priorizada por bloqueantes primero y avisos después.
6. Comprueba el quality gate del último informe `READY` del periodo, si existe, para saber si el snapshot puede publicarse o tiene bloqueos.
7. Usa el panel "Primer informe guiado" para saber si toca completar datos, crear `READY`, resolver quality gate, publicar desde `/reports` o revisar el portal cliente.
8. Revisa el flujo de entrega para saber qué informes READY faltan por publicar, cuáles están publicados y cuáles tienen seguimiento cliente abierto.
9. Puede ir a `/reports` para preparar un nuevo informe o revisar versiones.
10. Puede abrir `/portal` para comprobar la experiencia cliente.
11. Gestiona solicitudes de reunión enviadas desde el portal: pendiente, en revisión o completada.
12. Configura nombre, email y logo del consultor visibles en el portal cliente.
13. Consulta el histórico publicado y abre el detalle web o la vista PDF.

## 3. Flujo técnico de datos

**Server page:** `src/app/consultant/page.tsx`

- Llama `getConsultantWorkspace()`.
- También llama `getConsultantPortfolio()` para mostrar la cartera multi-cliente cuando existe más de un restaurante accesible.
- Si no hay restaurante activo, redirige a `/onboarding`.
- Renderiza un dashboard operativo sin aceptar `restaurant_id` del cliente.
- Si fallan lecturas no críticas (informes publicados o solicitudes), mantiene la mesa cargada con avisos y listas vacías. Solo falla de forma bloqueante si no puede cargar el restaurante activo.

**Server actions:** `src/app/actions/consultant.ts`

- `getConsultantWorkspace()` resuelve `restaurant_id` con `getUserRestaurant()` y carga:
  - `restaurants.id/name/consultant_*`
  - `professional_report_drafts` publicados (`published_at IS NOT NULL`) incluyendo `viewed_at` para saber si el cliente abrió el informe.
  - `professional_report_drafts` con `status = READY` para construir el flujo de entrega reciente, también con `viewed_at`.
  - el último `professional_report_drafts` `READY` del periodo actual con `report_snapshot` para evaluar el quality gate de preparación.
  - `portal_meeting_requests`
  - conteos del mes actual para checklist de preparación: ventas, gastos, facturas, equipo, turnos, recetas, ventas por receta, Menu Engineering, drafts READY, publicaciones y solicitudes abiertas.
- `getPreparationChecklistForPeriod(input)` valida el mes con Zod (`YYYY-MM`), resuelve `restaurant_id` con `getUserRestaurant()`, calcula `from/to` del mes pedido y ejecuta las mismas queries de conteo que `getConsultantWorkspace()` pero para el periodo indicado. También carga el último draft `READY` exacto del periodo y evalúa su snapshot con `evaluateProfessionalReportQualityGate()`. Devuelve `ConsultantPreparationChecklist`.
- `getConsultantPortfolio()` carga restaurantes propios y relaciones activas de `consultant_restaurants`, fusionando duplicados con prioridad de owner.
- `selectConsultantClient(input)` valida UUID, comprueba en servidor que el usuario es propietario o consultor activo, y escribe la cookie `active_consultant_restaurant_id` para que `getUserRestaurant()` resuelva ese cliente en las siguientes acciones.
- `selectConsultantClient(input)`, `updateConsultantBranding(input)` y `updateMeetingRequestStatus(input)` registran eventos en `admin_audit_log` para trazabilidad del trabajo del consultor.
- Las respuestas de `consultant.ts` usan el helper compartido `ok()/fail()` de `src/app/actions/action-result.ts` como piloto para reducir repetición manteniendo el contrato histórico `{ success, data?, error? }`.
- Los conteos de checklist están extraídos a `fetchChecklistCounts()` para reutilización sin duplicación.
- El quality gate de preparación está separado en `fetchLatestReadyReportQualityGate()` y no recalcula informes: solo lee el snapshot guardado del último `READY`.
- `updateConsultantBranding(input)` valida nombre/email/logo con Zod y actualiza solo el restaurante activo.
- `updateMeetingRequestStatus(input)` valida UUID + estado y actualiza solo solicitudes del restaurante activo.
- Las fechas visibles usan helpers compartidos en `src/lib/date-format.ts` con zona horaria `Europe/Madrid`. Es una decisión temporal para España y evita errores de hidratación entre servidor y navegador.
- El archivo de actions conserva las queries, validaciones Zod, `getUserRestaurant()` y `revalidatePath()`. La lógica pura de tipos, mappers, preparación y delivery vive en `src/lib/consultant/` para evitar que `consultant.ts` vuelva a crecer como módulo monolítico.

**Lógica pura:** `src/lib/consultant/*`

- `types.ts` define los contratos `ConsultantWorkspace`, `ConsultantPreparationChecklist`, `ConsultantDeliveryReport` y filas Supabase mapeadas.
- `mappers.ts` convierte filas de `restaurants` y `professional_report_drafts` a tipos de UI.
- `delivery.ts` calcula estados derivados de entrega (`READY_TO_PUBLISH`, `PUBLISHED`, `MEETING_REQUESTED`, `FOLLOW_UP_COMPLETE`) sin consultar Supabase.
- `preparation.ts` calcula periodos mensuales, checklist de preparación, severidad de cada punto, porcentaje ponderado de avance, siguiente acción recomendada y quality gate ligero desde el snapshot `READY` ya cargado. No hace I/O.
- `first-report-guide.ts` convierte la checklist en un recorrido operativo de primer informe: completar datos, crear `READY`, resolver quality gate, publicar desde `/reports` o revisar `/portal`. Es una función pura y no publica ni guarda nada.

**Client components:**

- `ConsultantBrandingForm` mantiene estado local del formulario y llama a `updateConsultantBranding`.
- `MeetingRequestsPanel` actualiza estado de solicitudes de forma optimista e inmutable tras respuesta correcta.
- `PreparationChecklist` es un componente client. Recibe el checklist del mes actual como `initialChecklist` (server-rendered), muestra conteos operativos agrupados por severidad, siguiente acción recomendada y el quality gate del último `READY` del periodo. Permite navegar entre meses con botones anterior/siguiente. Al cambiar mes, llama a `getPreparationChecklistForPeriod()` y actualiza estado local de forma inmutable. No permite navegar más allá del mes actual.
- `FirstReportGuidePanel` es server-rendered. Recibe el resultado de `buildFirstReportGuide(preparation)` y muestra la etapa actual del primer informe con cuatro pasos fijos: datos base, versión `READY`, quality gate y portal cliente.
- `DeliveryWorkflowPanel` es un componente client ligero. Recibe informes READY recientes ya cruzados con solicitudes del portal, filtra localmente por estado (`Todos`, `Abiertos`, `Publicados`, `Cerrados`) y muestra timeline visual: READY → Portal → Reunión → Cierre. No hace queries ni decide permisos.
- `ClientPortfolioPanel` es un componente client ligero. Recibe la cartera ya calculada, muestra el restaurante activo y llama a `selectConsultantClient()` para cambiar de cliente. No decide permisos.

**QA operativo:** `npm run qa:client-flow`

- Verifica el recorrido comercial completo que nace en la mesa del consultor: checklist, informe, publicación, portal, solicitud de reunión, seguimiento y despublicación.
- No sustituye a `npm run verify`; es el comando recomendado antes de enseñar la app con datos reales o demo.

## 4. Reglas de negocio y restricciones

- `restaurant_id` nunca viaja desde cliente.
- `/consultant` pertenece al backoffice interno, no al portal cliente.
- El portal cliente sigue siendo solo entrega: informe, PDF, histórico y solicitud de reunión.
- Una solicitud puede estar en `PENDING`, `ACKNOWLEDGED` o `COMPLETED`.
- El estado de reunión no modifica el informe publicado.
- Los cambios de cliente activo, branding del consultor y estado de reunión quedan auditados en `admin_audit_log`. La auditoría es no bloqueante y no sustituye las validaciones de restaurante activo.
- La identidad del consultor se guarda en `restaurants.consultant_name`, `consultant_email` y `consultant_logo_url`.
- La URL del logo debe ser URL válida o quedar vacía.
- La checklist es derivada, no persistida. El estado se calcula desde tablas fuente para el periodo seleccionado.
- La checklist se puede consultar para cualquier mes pasado o el actual. No se permite navegar al futuro más allá del mes actual.
- El periodo de checklist se calcula como mes natural: `from = YYYY-MM-01`, `to = último día del mes`.
- Criterios de checklist: ventas requiere al menos una fila `daily_sales` con `revenue_total > 0`; gastos requiere al menos un `operating_expenses`; facturas queda completo solo si hay facturas `completed` y cero `review_required`/`processing`; equipo requiere empleado activo y turno en periodo; carta requiere recetas y ventas por receta; Menu Engineering acepta reportes `ANALYZED` solapados con el periodo; informes READY/publicados usan periodo exacto; solicitudes abiertas se cuentan globalmente.
- Cada ítem de checklist tiene severidad derivada: ventas, gastos e informe `READY` son `blocker` si no están completos; facturas, equipo, carta, Menu Engineering, publicación y solicitudes abiertas son `warning`; los puntos completos quedan como `info`.
- La siguiente acción se deriva en `buildPreparationChecklist()`: toma el primer ítem no completo con severidad `blocker`; si no hay bloqueantes, toma el primer `warning`; si todo está completo, queda `null`.
- La razón de la siguiente acción se calcula por ítem. Los bloqueantes explican por qué impiden publicar con confianza; los avisos explican la consecuencia concreta de seguir sin ese dato (facturas, turnos, carta, BCG, publicación o solicitudes).
- `completionPct` es ponderado, no un simple conteo de ítems. Ventas, gastos e informe `READY` pesan más que avisos de entrega; facturas, equipo, carta y Menu Engineering tienen peso intermedio; publicación y solicitudes tienen peso menor. Los estados `partial` aportan medio peso.
- La UI no decide prioridades: solo renderiza `nextAction`, `severity` y `actionLabel` ya calculados por la lógica pura. La presentación agrupa los ítems en tres regiones accesibles: `Bloqueantes`, `Recomendados` y `Listos`.
- Los enlaces de resolución solo usan filtros cuando la ruta destino ya los soporta. Para estados parciales, equipo enlaza a `/staff/schedule` si ya hay empleados pero faltan turnos, y carta enlaza a `/stock` si ya hay recetas pero faltan ventas por receta.
- La checklist guía la preparación, pero no sustituye las reglas de calidad del informe profesional en `/reports`.
- El quality gate mostrado en `/consultant` usa exactamente el mismo evaluator que `/reports` y `publishReportDraft`, pero solo sobre snapshots `READY` ya guardados.
- Si no hay versión `READY` para el periodo, el quality gate de preparación queda vacío y la UI enlaza a `/reports?from=...&to=...` para crear una.
- Si el snapshot `READY` está corrupto o no pertenece al restaurante activo, la preparación lo marca como `BLOCKED` y pide regenerar una versión.
- El panel "Primer informe guiado" no sustituye la checklist ni el flujo de entrega. Solo resume la próxima etapa del primer informe usando la checklist ya calculada.
- El panel "Primer informe guiado" nunca publica directamente: si el snapshot es publicable, su acción principal lleva a `/reports?from=...&to=...` para que la publicación pase por la mesa de revisión y el quality gate server-side.
- Si el informe ya está publicado para el periodo, el panel apunta a `/portal` para validar la experiencia cliente.
- El flujo de entrega es derivado, no persistido. Se calcula desde `professional_report_drafts.status`, `published_at`, `viewed_at` y `portal_meeting_requests.status`.
- Estados del flujo de entrega: `READY_TO_PUBLISH` si el informe READY no está publicado; `PUBLISHED` si ya está visible sin solicitudes abiertas; `MEETING_REQUESTED` si el cliente pidió reunión y está pendiente/en revisión; `FOLLOW_UP_COMPLETE` si la solicitud asociada ya se completó.
- El panel de entrega no publica ni despublica directamente. La publicación sigue viviendo en `/reports`, donde existe la revisión del snapshot y los controles internos.
- `viewed_at` no cambia el estado de entrega por sí solo, pero el panel muestra si el cliente ya abrió el detalle del informe o si sigue pendiente de lectura.
- Los filtros del flujo de entrega son solo estado de UI local. No cambian URL, no hacen queries y no alteran el estado de las solicitudes.
- La cartera multi-cliente se apoya en `consultant_restaurants`. La relación activa permite seleccionar cliente, pero no convierte al portal cliente en zona de carga de datos.

## 5. Dependencias e implicaciones cruzadas

- **Reports:** crea versiones `READY` y las publica.
- **Portal cliente:** consume los informes publicados y la identidad del consultor.
- **Base de datos:** usa `restaurants`, `professional_report_drafts` y `portal_meeting_requests`.
- **Auditoría:** escribe eventos explícitos en `admin_audit_log` para selección de cliente, cambios de branding y cambios de estado de reunión.
- **Datos operativos:** la checklist lee conteos de `daily_sales`, `operating_expenses`, `invoices`, `employees`, `shifts`, `recipes`, `daily_recipe_sales` y `menu_reports`.
- **Importadores CSV:** ventas, gastos, cabeceras de recetas, empleados, ventas por receta, turnos y cabeceras de factura alimentan estos conteos. Las cabeceras de receta permiten preparar carta sin escandallo completo; los empleados importados permiten preparar turnos; las cabeceras de factura importadas cuentan como facturas revisadas si quedan `completed`, pero no sustituyen líneas de factura, movimientos de stock ni gastos operativos.
- **Lógica compartida:** `src/lib/consultant/` mantiene helpers puros reutilizables por actions y tests. No debe importar `createClient()` ni resolver sesión.
- **Navegación:** aparece en CORE como “Consultoría”.
- **Futuro multi-cliente:** esta ruta es el punto natural para evolucionar hacia cartera de clientes, pero ahora respeta el modelo actual usuario/restaurante.

## 6. Casos límite y errores conocidos

- Si no hay informes publicados, muestra estado vacío y acceso a `/reports`.
- Si no hay solicitudes, muestra estado vacío.
- Si faltan datos del periodo seleccionado, la checklist marca `Pendiente` o `Revisar` y enlaza al módulo que debe resolverlo.
- Si hay varios puntos incompletos, la siguiente acción muestra primero el bloqueo operativo más importante. Por ejemplo, ventas faltantes tienen prioridad sobre crear una versión `READY`, y `READY` tiene prioridad sobre publicar.
- Si el asistente de primer informe detecta bloqueos operativos, muestra esos bloqueos antes de sugerir crear o publicar informes.
- Si no hay `READY`, el asistente guía a `/reports` para crear una versión lista, no intenta generar snapshots desde `/consultant`.
- Si el quality gate del `READY` está bloqueado, el asistente enlaza a `/reports` para revisar bloqueos, no a `/portal`.
- Si el informe ya está publicado, el asistente marca los cuatro pasos como listos aunque queden tareas de seguimiento en el flujo de entrega.
- Si no hay bloqueantes pero sí avisos, la siguiente acción muestra el primer aviso pendiente para mejorar la entrega sin bloquear la preparación.
- Si todos los puntos están completos, la checklist no muestra bloque de siguiente acción.
- Si un punto está `partial`, suma medio peso al porcentaje de preparación. Esto evita castigar igual un bloque parcialmente cargado que un bloque totalmente ausente.
- Si hay facturas importadas solo como cabecera histórica, la checklist puede marcar facturas como revisadas, pero los análisis de compras/stock seguirán dependiendo de sus tablas específicas.
- Si hay un `READY` con warnings, la checklist lo muestra como publicable con advertencias; si hay bloqueos, lo muestra como bloqueado y enlaza a `/reports`.
- Si no hay `READY`, la checklist no inventa calidad de informe y muestra una llamada a crear una versión lista.
- Si no hay informes READY, el flujo de entrega muestra estado vacío operativo.
- Si un filtro del flujo no contiene entregas, muestra un estado vacío local sin alterar los datos cargados.
- Si un informe READY no está publicado, el flujo enlaza a `/reports` con su periodo para publicarlo desde la mesa de revisión.
- Si un informe publicado tiene solicitudes abiertas, el flujo enlaza al panel de solicitudes dentro de `/consultant`.
- Si `getPreparationChecklistForPeriod()` falla al cambiar de mes, el componente conserva el checklist anterior sin crashear.
- Si el consultor navega a un mes sin datos, los ítems marcan `Pendiente` o `Revisar` según el criterio de cada bloque; esto es correcto y esperado.
- Si alguna consulta de conteo de checklist falla, la mesa carga con aviso y marca ese punto como pendiente.
- Si fallan informes o solicitudes, muestra un aviso y conserva el resto de la mesa operativa.
- Si una solicitud apunta a un informe despublicado o eliminado, se conserva la solicitud pero sin enlace de reporte.
- Si la actualización de marca falla, el portal mantiene la identidad anterior.
- Si la auditoría falla tras una mutación correcta, la mutación no se revierte; el logger estructurado registra el fallo para investigación.
- Si el consultor trabaja como admin impersonando un restaurante, las actions siguen resolviendo el restaurante impersonado mediante `getUserRestaurant()`.

## 7. Al añadir/modificar una función aquí

1. Leer [T03](./T03-autenticacion.md) y [T06](./T06-server-actions-comunes.md).
2. No aceptar `restaurant_id` desde componentes cliente.
3. Mantener el portal cliente sin inputs operativos de carga de datos.
4. Si se añade cartera multi-cliente, crear diseño de datos explícito antes de tocar UI.
5. Añadir tests de action para cada nueva mutación.
6. Probar `/consultant`, `/reports` y `/portal` juntos, porque forman un flujo único de entrega.
7. Mantener las server actions en `src/app/actions/consultant.ts`; si crece la lógica, extraer helpers puros a `src/lib/consultant/` sin mover mutaciones a subcarpetas de actions.
8. Si el cambio afecta al recorrido de entrega, añadirlo a `npm run qa:client-flow` o justificar por qué queda fuera.
