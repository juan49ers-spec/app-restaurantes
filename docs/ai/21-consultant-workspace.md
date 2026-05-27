# 21 — Consultant Workspace

**Ruta:** `/consultant`
**Archivos clave:** `src/app/consultant/page.tsx`, `src/app/actions/consultant.ts`, `src/components/consultant/ConsultantBrandingForm.tsx`, `src/components/consultant/MeetingRequestsPanel.tsx`
**Transversales relacionados:** [T01](./T01-arquitectura.md), [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md), [T06](./T06-server-actions-comunes.md), [T11](./T11-reporting-profesional.md)

## 1. Propósito y rol en el negocio

Mesa interna para el consultor. Su función es coordinar la entrega profesional al restaurante cliente: informes publicados, solicitudes de reunión y marca visible en el portal.

No es el portal cliente y no debe usarse como experiencia pública. Tampoco introduce todavía un modelo multi-cliente completo; trabaja sobre el restaurante activo resuelto en servidor.

## 2. Viaje del usuario

1. El consultor entra en `/consultant`.
2. Ve el restaurante activo y un resumen de informes publicados, solicitudes abiertas y última publicación.
3. Revisa la checklist del periodo que está preparando. Por defecto es el mes actual, pero puede navegar a meses anteriores con los controles anterior/siguiente.
4. Puede ir a `/reports` para preparar un nuevo informe o revisar versiones.
5. Puede abrir `/portal` para comprobar la experiencia cliente.
6. Gestiona solicitudes de reunión enviadas desde el portal: pendiente, en revisión o completada.
7. Configura nombre, email y logo del consultor visibles en el portal cliente.
8. Consulta el histórico publicado y abre el detalle web o la vista PDF.

## 3. Flujo técnico de datos

**Server page:** `src/app/consultant/page.tsx`

- Llama `getConsultantWorkspace()`.
- Si no hay restaurante activo, redirige a `/onboarding`.
- Renderiza un dashboard operativo sin aceptar `restaurant_id` del cliente.
- Si fallan lecturas no críticas (informes publicados o solicitudes), mantiene la mesa cargada con avisos y listas vacías. Solo falla de forma bloqueante si no puede cargar el restaurante activo.

**Server actions:** `src/app/actions/consultant.ts`

- `getConsultantWorkspace()` resuelve `restaurant_id` con `getUserRestaurant()` y carga:
  - `restaurants.id/name/consultant_*`
  - `professional_report_drafts` publicados (`published_at IS NOT NULL`)
  - `portal_meeting_requests`
  - conteos del mes actual para checklist de preparación: ventas, gastos, facturas, equipo, turnos, recetas, ventas por receta, Menu Engineering, drafts READY, publicaciones y solicitudes abiertas.
- `getPreparationChecklistForPeriod(input)` valida el mes con Zod (`YYYY-MM`), resuelve `restaurant_id` con `getUserRestaurant()`, calcula `from/to` del mes pedido y ejecuta las mismas queries de conteo que `getConsultantWorkspace()` pero para el periodo indicado. Devuelve `ConsultantPreparationChecklist`.
- Los conteos de checklist están extraídos a `fetchChecklistCounts()` para reutilización sin duplicación.
- `updateConsultantBranding(input)` valida nombre/email/logo con Zod y actualiza solo el restaurante activo.
- `updateMeetingRequestStatus(input)` valida UUID + estado y actualiza solo solicitudes del restaurante activo.
- Las fechas visibles usan helpers compartidos en `src/lib/date-format.ts` con zona horaria `Europe/Madrid`. Es una decisión temporal para España y evita errores de hidratación entre servidor y navegador.

**Client components:**

- `ConsultantBrandingForm` mantiene estado local del formulario y llama a `updateConsultantBranding`.
- `MeetingRequestsPanel` actualiza estado de solicitudes de forma optimista e inmutable tras respuesta correcta.
- `PreparationChecklist` es un componente client. Recibe el checklist del mes actual como `initialChecklist` (server-rendered) y permite navegar entre meses con botones anterior/siguiente. Al cambiar mes, llama a `getPreparationChecklistForPeriod()` y actualiza estado local de forma inmutable. No permite navegar más allá del mes actual.

## 4. Reglas de negocio y restricciones

- `restaurant_id` nunca viaja desde cliente.
- `/consultant` pertenece al backoffice interno, no al portal cliente.
- El portal cliente sigue siendo solo entrega: informe, PDF, histórico y solicitud de reunión.
- Una solicitud puede estar en `PENDING`, `ACKNOWLEDGED` o `COMPLETED`.
- El estado de reunión no modifica el informe publicado.
- La identidad del consultor se guarda en `restaurants.consultant_name`, `consultant_email` y `consultant_logo_url`.
- La URL del logo debe ser URL válida o quedar vacía.
- La checklist es derivada, no persistida. El estado se calcula desde tablas fuente para el periodo seleccionado.
- La checklist se puede consultar para cualquier mes pasado o el actual. No se permite navegar al futuro más allá del mes actual.
- El periodo de checklist se calcula como mes natural: `from = YYYY-MM-01`, `to = último día del mes`.
- Criterios de checklist: ventas requiere al menos una fila `daily_sales` con `revenue_total > 0`; gastos requiere al menos un `operating_expenses`; facturas queda completo solo si hay facturas `completed` y cero `review_required`/`processing`; equipo requiere empleado activo y turno en periodo; carta requiere recetas y ventas por receta; Menu Engineering acepta reportes `ANALYZED` solapados con el periodo; informes READY/publicados usan periodo exacto; solicitudes abiertas se cuentan globalmente.
- Los enlaces de resolución solo usan filtros cuando la ruta destino ya los soporta. Para estados parciales, equipo enlaza a `/staff/schedule` si ya hay empleados pero faltan turnos, y carta enlaza a `/stock` si ya hay recetas pero faltan ventas por receta.
- La checklist guía la preparación, pero no sustituye las reglas de calidad del informe profesional en `/reports`.
- No se crea todavía una cartera multi-cliente ni una tabla `consultant_clients`.

## 5. Dependencias e implicaciones cruzadas

- **Reports:** crea versiones `READY` y las publica.
- **Portal cliente:** consume los informes publicados y la identidad del consultor.
- **Base de datos:** usa `restaurants`, `professional_report_drafts` y `portal_meeting_requests`.
- **Datos operativos:** la checklist lee conteos de `daily_sales`, `operating_expenses`, `invoices`, `employees`, `shifts`, `recipes`, `daily_recipe_sales` y `menu_reports`.
- **Navegación:** aparece en CORE como “Consultoría”.
- **Futuro multi-cliente:** esta ruta es el punto natural para evolucionar hacia cartera de clientes, pero ahora respeta el modelo actual usuario/restaurante.

## 6. Casos límite y errores conocidos

- Si no hay informes publicados, muestra estado vacío y acceso a `/reports`.
- Si no hay solicitudes, muestra estado vacío.
- Si faltan datos del periodo seleccionado, la checklist marca `Pendiente` o `Revisar` y enlaza al módulo que debe resolverlo.
- Si `getPreparationChecklistForPeriod()` falla al cambiar de mes, el componente conserva el checklist anterior sin crashear.
- Si el consultor navega a un mes sin datos, los ítems marcan `Pendiente` o `Revisar` según el criterio de cada bloque; esto es correcto y esperado.
- Si alguna consulta de conteo de checklist falla, la mesa carga con aviso y marca ese punto como pendiente.
- Si fallan informes o solicitudes, muestra un aviso y conserva el resto de la mesa operativa.
- Si una solicitud apunta a un informe despublicado o eliminado, se conserva la solicitud pero sin enlace de reporte.
- Si la actualización de marca falla, el portal mantiene la identidad anterior.
- Si el consultor trabaja como admin impersonando un restaurante, las actions siguen resolviendo el restaurante impersonado mediante `getUserRestaurant()`.

## 7. Al añadir/modificar una función aquí

1. Leer [T03](./T03-autenticacion.md) y [T06](./T06-server-actions-comunes.md).
2. No aceptar `restaurant_id` desde componentes cliente.
3. Mantener el portal cliente sin inputs operativos de carga de datos.
4. Si se añade cartera multi-cliente, crear diseño de datos explícito antes de tocar UI.
5. Añadir tests de action para cada nueva mutación.
6. Probar `/consultant`, `/reports` y `/portal` juntos, porque forman un flujo único de entrega.
