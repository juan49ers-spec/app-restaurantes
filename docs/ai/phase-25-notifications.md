# Cierre Fase 25 — Notificaciones

## 1. Objetivo

Corregir el acceso operativo a la configuración de notificaciones y dejarlo testeado.

La fase no añade canales nuevos ni automatizaciones de email/push. Primero arregla una fricción real: el botón de configuración del popover global apuntaba a una ruta que no existe.

## 2. Qué se ha añadido

- `src/lib/notifications.ts` con `normalizeNotificationsTab()`.
- `/notifications` acepta `?tab=settings` para abrir directamente la pestaña de configuración.
- `NotificationCenter` enlaza a `/notifications?tab=settings`.
- La carga explícita de notificaciones muestra toast si falla.
- El polling de unread count falla en silencio para no molestar al usuario por errores puntuales de red.

## 3. Flujo técnico de datos

No hay cambios de tablas ni actions.

La página `/notifications` sigue cargando `getNotifications()` y `getNotificationStats()` en servidor. El query param solo decide la pestaña inicial del componente `Tabs`.

## 4. Reglas de negocio

- Las notificaciones siguen siendo por restaurante.
- La configuración de reglas vive en `/notifications`, no en `/settings/alerts`.
- El polling no debe generar ruido visual si falla una vez.
- Las acciones de marcar leído y marcar todo no cambian.

## 5. Dependencias e implicaciones cruzadas

- `NotificationCenter`.
- `/notifications`.
- `AlertConfiguration`.
- `NotificationHistory`.

## 6. Casos límite

- `?tab=settings` abre configuración.
- Cualquier otro valor de `tab` cae a historial.
- Si el navegador envía varios valores de `tab`, se usa el primero.

## 7. Verificación

- Tests unitarios para `normalizeNotificationsTab()`.
- `npm run verify` debe seguir pasando antes de cerrar fase.
