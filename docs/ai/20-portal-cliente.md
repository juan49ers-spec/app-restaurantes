# 20 — Portal Cliente

**Ruta:** `/portal`, `/portal/reports/[id]`
**Archivos clave:** `src/app/portal/layout.tsx`, `src/app/portal/page.tsx`, `src/app/portal/reports/[id]/page.tsx`, `src/app/actions/portal.ts`, `src/components/portal/*`
**Transversales relacionados:** [T01](./T01-arquitectura.md), [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md), [T06](./T06-server-actions-comunes.md), [T11](./T11-reporting-profesional.md)

## 1. Propósito y rol en el negocio

Área cliente profesional para consultar informes publicados por el consultor. Convierte el informe guardado en una experiencia web ejecutiva, con PDF como salida secundaria.

No sustituye la mesa interna de `/reports`; solo muestra versiones ya publicadas.

## 2. Viaje del usuario

1. El usuario entra en `/portal`.
2. Ve el último informe publicado, KPIs ejecutivos, conclusiones y acceso al PDF.
3. Puede abrir el detalle web del informe.
4. Puede consultar el histórico de informes publicados.
5. Puede solicitar una reunión de revisión.
6. Puede volver a ControlHub para operar la app interna.

## 3. Flujo técnico de datos

**Layout:** `src/app/portal/layout.tsx`

- Usa `getCurrentRestaurant()`.
- Si no hay restaurante, redirige a `/login`.
- Renderiza una cabecera limpia sin sidebar operativo.

**Actions:** `src/app/actions/portal.ts`

- `getPublishedReports()` lista solo drafts con `published_at IS NOT NULL`.
- `getPublishedReportDetail(id)` carga el snapshot completo solo si está publicado y pertenece al restaurante activo.
- `getPortalContext()` carga restaurante, datos del consultor y ventas acumuladas del mes vs objetivo.
- `requestConsultantMeeting(input)` crea una fila `portal_meeting_requests`.
- `publishReportDraft(id)` y `unpublishReportDraft(id)` se usan desde la mesa interna.

**Persistencia:**

- `professional_report_drafts.published_at` marca visibilidad en portal.
- `professional_report_drafts.published_by` conserva quién publicó.
- `portal_meeting_requests` guarda solicitudes de reunión.

## 4. Reglas de negocio y restricciones

- El portal solo muestra informes publicados.
- `READY` no implica visibilidad; la visibilidad depende de `published_at`.
- El detalle del portal consume `report_snapshot`; no recalcula el informe.
- El dato vivo solo muestra ventas acumuladas del mes actual contra objetivo mensual.
- Si no hay objetivo mensual, no se muestra la card de dato vivo.
- La solicitud de reunión no envía email en esta fase; solo crea registro interno.
- `restaurant_id` nunca viaja desde cliente.

## 5. Dependencias e implicaciones cruzadas

- **Reports:** `/reports` publica o despublica versiones.
- **Reporting profesional:** el portal usa `ProfessionalRestaurantReport` y `buildProfessionalReportPresentation()`.
- **Financial Control:** aporta ventas diarias y objetivos mensuales para el dato vivo.
- **Base de datos:** depende de `professional_report_drafts`, `restaurants` y `portal_meeting_requests`.
- **Layout:** `AppLayout` exime `/portal` para no mostrar sidebar operativo.

## 6. Casos límite y errores conocidos

- Si no hay informes publicados, se muestra estado vacío.
- Si un informe existe pero no está publicado, no aparece ni puede abrirse por URL.
- Si el objetivo mensual no existe o es 0, no se muestra progreso vivo.
- Si falla una solicitud de reunión, el formulario muestra error sin romper el portal.
- Si una versión se despublica mientras el cliente la ve, una recarga deja de mostrarla.

## 7. Al añadir/modificar una función aquí

1. Leer [T11](./T11-reporting-profesional.md).
2. Leer [T06](./T06-server-actions-comunes.md) antes de tocar actions.
3. No aceptar `restaurant_id` desde cliente.
4. No recalcular informes desde páginas del portal.
5. Mantener PDF basado en snapshot guardado.
6. Añadir tests de action para cualquier cambio de publicación o reunión.
