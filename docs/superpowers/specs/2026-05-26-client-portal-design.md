# Fase 9 — Area cliente profesional

Fecha: 2026-05-26

## Objetivo

Crear un area cliente en `/portal` donde cada restaurante autenticado pueda consultar informes profesionales publicados por su consultor. El portal debe sentirse como un entregable digital vivo y profesional, no como una simple descarga de PDF.

El PDF sigue existiendo como salida secundaria para archivar, enviar o imprimir, pero la experiencia principal sera web.

## Decisiones aprobadas

- **Acceso:** usuarios autenticados del restaurante. Los enlaces privados sin login quedan para una fase posterior.
- **Experiencia:** portal hibrido controlado. El informe cerrado manda; solo se muestra una capa minima de dato vivo, separada y etiquetada.
- **Publicacion:** `DRAFT`, `REVIEWED` y `READY` siguen siendo estados internos. La visibilidad al cliente depende de `published_at IS NOT NULL`.
- **Layout:** `/portal` tendra layout propio, limpio, sin sidebar operativo de ControlHub.
- **Marca:** el portal muestra identidad del consultor cuando exista (`consultant_name`, `consultant_email`, `consultant_logo_url`).
- **Dato vivo inicial:** solo ventas acumuladas del mes actual frente a objetivo mensual. Nada mas en esta fase.
- **Contacto:** el cliente puede solicitar una reunion de revision. En esta fase se crea un registro interno; no se envia email real todavia.

## Arquitectura

La fase se apoya en el contrato existente `ProfessionalRestaurantReport` y en la tabla `professional_report_drafts`. No se crea un segundo sistema de informes.

Se ampliara `professional_report_drafts` con campos de publicacion:

- `published_at`
- `published_by`

Se ampliara `restaurants` con datos opcionales del consultor:

- `consultant_name`
- `consultant_email`
- `consultant_logo_url`

Se creara una tabla pequena `portal_meeting_requests` para solicitudes de reunion, con RLS por restaurante.

Las nuevas lecturas y mutaciones viviran en `src/app/actions/portal.ts`. Todas resolveran el restaurante activo en servidor mediante `getUserRestaurant()` y nunca aceptaran `restaurant_id` desde cliente.

## Rutas y componentes

### `/portal`

Portada ejecutiva del cliente.

Debe mostrar:

- ultimo informe publicado;
- periodo, version y estado de calidad;
- 3 conclusiones principales del informe;
- 3-4 KPIs ejecutivos desde `buildProfessionalReportPresentation()`;
- boton "Ver informe";
- boton "Descargar PDF";
- card opcional de dato vivo: "Actualizacion operativa — no forma parte del informe";
- historico de informes publicados;
- accion "Solicitar reunion de revision".

Si no hay informes publicados, la pagina debe explicar que el consultor aun no ha publicado ningun informe.

### `/portal/reports/[id]`

Detalle web del informe publicado.

Debe cargar solo informes publicados del restaurante activo. Si el informe no existe, no pertenece al restaurante o no esta publicado, vuelve a `/portal` o devuelve `notFound()`.

Debe renderizar:

- cabecera con restaurante, periodo, version y consultor;
- KPIs ejecutivos;
- conclusiones;
- capitulos de `buildProfessionalReportPresentation()`;
- calidad de datos;
- narrativas y metricas trazables;
- botones de PDF y solicitud de reunion.

### Area interna de informes

La mesa interna de `/reports` seguira siendo el lugar de revision. Alli se anadira control de publicacion:

- "Publicar en portal" si el draft esta `READY` y no tiene `published_at`;
- "Despublicar" si ya esta publicado.

No se publican informes directamente desde el portal.

## Flujo de datos

1. El usuario interno genera y guarda versiones desde `/reports`.
2. Cuando una version esta lista, se marca como `READY`.
3. El usuario publica explicitamente esa version en el portal.
4. `/portal` lista solo versiones con `published_at IS NOT NULL`.
5. El detalle del portal consume el snapshot guardado, no recalcula datos actuales.
6. El PDF se abre desde el snapshot ya guardado.
7. La solicitud de reunion crea una fila `portal_meeting_requests` con estado `PENDING`.

## Seguridad y multi-tenancy

- Toda action usa `getUserRestaurant()`.
- Ninguna action acepta `restaurant_id`.
- Las queries filtran por `restaurant_id` resuelto server-side.
- `publishReportDraft()` exige que el draft pertenezca al restaurante activo y tenga `status = READY`.
- `getPublishedReportDetail()` exige `published_at IS NOT NULL`.
- Todas las tablas nuevas o modificadas tienen RLS reproducible en migraciones.
- La salida del portal nunca muestra drafts no publicados.

## Estados y errores

- Sin restaurante activo: redireccion a `/login` o flujo actual de auth/onboarding.
- Sin informes publicados: estado vacio amable y profesional.
- Informe no publicado: no visible en portal.
- Dato vivo sin objetivo mensual: no se muestra la card viva.
- Solicitud de reunion duplicada: se permite crear una nueva solicitud; no se bloquea en esta fase.
- Error de action: se muestra mensaje claro sin romper el portal completo.

## Testing

Tests minimos:

- publicar solo drafts `READY` del restaurante activo;
- rechazar publicacion de draft ajeno;
- listar solo informes publicados;
- bloquear detalle si `published_at` es `NULL`;
- devolver contexto de portal con consultor y dato vivo;
- crear solicitud de reunion en `PENDING`;
- verificar que `/portal` no consume `restaurant_id` desde cliente;
- validar render basico de portada con informe publicado y estado vacio.

La verificacion final sera `npm run verify`.

## Fuera de alcance

- enlaces compartibles sin login;
- envio real de email;
- editor UI de datos del consultor;
- roles granulares dentro del restaurante;
- PDF server-side nuevo;
- datos vivos adicionales distintos de ventas acumuladas vs objetivo.

## Documentacion AI

Al implementar se debe:

- crear `docs/ai/20-portal-cliente.md`;
- registrar `/portal` en `docs/ai/README.md`;
- actualizar `docs/ai/19-reports.md` y `docs/ai/T11-reporting-profesional.md` si cambia la publicacion desde `/reports`;
- actualizar `docs/ai/T02-base-de-datos.md` por las migraciones;
- actualizar `docs/ai/T06-server-actions-comunes.md` si se anaden patrones nuevos de actions.
