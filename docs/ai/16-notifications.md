# 16 — Notifications (Centro de notificaciones)

**Ruta:** `/notifications`
**Archivos clave:** `src/app/notifications/page.tsx`, `src/app/actions/alerts.ts`, `src/app/actions/broadcasts.ts`, `src/components/alerts/`, `src/components/common/BroadcastBanner.tsx`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T03](./T03-autenticacion.md)

## 1. Propósito y rol en el negocio

Centro de control de alertas in-app. Muestra histórico de notificaciones generadas por el sistema (cambios de precio, márgenes bajos, stock crítico, anomalías de facturas, etc.) y permite configurar reglas (umbrales, canales, cooldown). Separado del sistema de "broadcasts" globales del super-admin.

## 2. Viaje del usuario

1. Entra a `/notifications`. Ve 2 tabs:
   - **Historial** (default).
   - **Configuración**.
2. **Historial:**
   - Lista hasta 50 notificaciones, paginadas.
   - Cada una con severidad (`INFO`/`WARNING`/`CRITICAL`), tipo, título, timestamp (formato distancia: "hace 2h").
   - Botón "Marcar como leído" individual o "Marcar todos".
   - Badge rojo con conteo no leídos (también visible en el icono campana del `NotificationCenter` global).
3. **Configuración:**
   - Form `AlertConfiguration` para crear/editar reglas.
   - Tipo (enum 8 valores), condiciones (JSON), canales (email/in-app/push), cooldown_hours, `is_active`.
   - Botón "Inicializar Reglas Predeterminadas" → `initializeDefaultAlertRules`.
4. **Notificación expandible** → muestra descripción, entidad afectada, fecha completa.
5. Desde el popover global de la campana, el icono de configuración abre `/notifications?tab=settings` para entrar directamente en la pestaña de reglas.

## 3. Flujo técnico de datos

**Lectura:**
- `getNotifications({ limit, offset, unreadOnly })` — paginadas, retorna `{ notifications, total, unread }`.
- `getNotificationStats()` — counts por severidad y por tipo.
- `getAlertRules()` — reglas configuradas.
- `normalizeNotificationsTab(tab)` en `src/lib/notifications.ts` normaliza `searchParams.tab` para abrir `Historial` o `Configuración` sin depender de strings sueltos en la página.

**Escritura:**
- `markNotificationAsRead(id)` — actualiza `read=true`, `read_at=NOW()`.
- `markAllNotificationsAsRead()` — bulk update por restaurant_id.
- `saveAlertRule(rule)` — upsert con condiciones JSON.
- `deleteAlertRule(id)` — soft delete (toggle `is_active=false`).
- `initializeDefaultAlertRules()` — crea reglas predeterminadas si no existen.
- `createNotification(payload)` — usado internamente por triggers del sistema.
- `shouldTriggerAlert(ruleId, entityId, cooldownHours)` — checa si debe dispararse respetando cooldown.
- `cleanupOldNotifications(days=30)` — limpia notificaciones viejas (cron job futuro, no automatizado todavía).

**`NotificationCenter`** (componente global en `AppLayout`): popover con icono campana, lista de últimas, polling cada 30s para actualizar unread count.

## 4. Reglas de negocio y restricciones

- **Tipos de alerta** (enum 8):
  - `PRICE_CHANGE`, `MARGIN_DROP`, `WASTE_HIGH`, `INGREDIENT_LOW_STOCK`, `SUPPLIER_PRICE_INCREASE`, `MENU_ITEM_UNPROFITABLE`, `INVOICE_ANOMALY`, `PRICE_DISCREPANCY`.
  - Desde Fase 36 también existen tipos de entrega: `REPORT_PUBLISHED` y `CLIENT_MEETING_REQUEST`.
- **Severidad:** se infiere de la condición (>20% → WARNING, >40% → CRITICAL).
- **Canales:** `email`, `in-app`, `push` (push aún sin implementación efectiva con Supabase Realtime).
- **Notificaciones de entrega:** publicar un informe y crear una solicitud nueva de reunión insertan notificaciones in-app en `alert_notifications`. Son eventos del flujo consultor-cliente y no dependen de una regla configurable, por eso `rule_id` puede ser `NULL`.
- **Cooldown:** evita spam. Si una regla dispara para `entityId`, no vuelve a disparar para el mismo `entityId` en X horas.
- **Retención:** notificaciones > 30 días se limpian automáticamente (cuando el cron se active).
- **Broadcasts vs Notifications:**
  - **Broadcasts** (`/admin/...`) son anuncios sistema-wide creados por super-admin, visibles a todos los restaurantes en el `BroadcastBanner` top. No son alertas accionables.
  - **Notifications** son específicas por restaurante.
- **Permisos:** solo super-admin (`requireSuperAdmin`) crea broadcasts. Restaurante normal solo ve y configura sus propias alert rules.
- Visible en sidebar (revisar si depende de algún addon).

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `alert_notifications`, `alert_rules`, `broadcasts` (global), `financial_alerts` (relacionada).
- **Otras páginas afectadas:**
  - `/invoices` — al confirmar factura con spike, dispara `PRICE_CHANGE`.
  - `/recipes` y `/ingredients` — `MARGIN_DROP`, `MENU_ITEM_UNPROFITABLE`.
  - `/stock` — `INGREDIENT_LOW_STOCK`.
  - `/desperdicios` — `WASTE_HIGH`.
  - `/admin/broadcasts` (si existe) — crea anuncios globales.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — esquema `alert_rules`, `notifications`, `broadcasts`.
  - [T03](./T03-autenticacion.md) — separación admin vs usuario.

## 6. Casos límite y errores conocidos

- **Cron de limpieza no automatizado:** `cleanupOldNotifications` existe pero no se ejecuta solo. Notificaciones >30 días siguen ahí hasta que alguien dispare la función (manual o via endpoint).
- **Push notifications no funcionales:** el campo `channels.push` puede marcarse pero no hay infraestructura activa. Solo email + in-app reales.
- **Notificación duplicada en pocos segundos:** mitigada por cooldown, pero si el cooldown es 0 horas, pueden duplicar.
- **Condiciones JSON sin validación de schema:** un admin puede meter un JSON inválido. Se debería validar contra un schema antes de guardar.
- **Polling cada 30s** en `NotificationCenter` puede ser excesivo para muchas tabs abiertas. Considerar realtime.
- **Polling tolerante:** si falla una petición puntual del polling, se ignora para no molestar al usuario; si falla la carga explícita al abrir el popover, muestra toast.
- **Email:** depende de provider configurado (probablemente Resend o similar, no visible en el código revisado).
- **Entrega no bloqueante:** si falla la inserción de una notificación de publicación o reunión, la publicación/solicitud no se revierte; se registra warning estructurado y el flujo principal sigue.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Distinguir si lo que añades es una alerta (por restaurante) o un broadcast (global, super-admin).
- Mirar `getNotificationStats` para entender los counts.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/alerts.ts`, `broadcasts.ts`.
- `src/components/alerts/NotificationCenter.tsx`, `NotificationHistory.tsx`, `AlertConfiguration.tsx`.
- `src/components/common/BroadcastBanner.tsx`.
- `src/types/alerts.ts`.

**Qué probar manualmente:**
- Subir factura con spike >10% → ver alerta `PRICE_CHANGE` creada.
- Marcar como leído → unread count baja.
- Marcar todos → counts a 0.
- Crear regla custom con cooldown 1h → disparar 2 veces seguidas → solo se crea la primera.
- Borrar regla → ya no se dispara.
- Inicializar reglas predeterminadas en restaurante nuevo → ver set inicial.
- Broadcast desde admin → ver banner global en todos los restaurantes.

**Si añades un tipo de alerta nuevo:**
1. Extender enum en `src/types/alerts.ts` y migración SQL.
2. Implementar el disparador en la action correspondiente (ej. en `review-invoice.ts` para nuevo tipo de discrepancia).
3. Añadir cooldown default, icono, color.
4. Documentar aquí y en `actions/alerts.ts`.

**Si implementas push notifications de verdad:**
1. Configurar Supabase Realtime (channels).
2. Subscribirse desde el client a inserts en `notifications`.
3. Solicitar permiso Notification API en navegador.
4. Considerar privacy / GDPR.

**Cambios delicados:**
- Bajar la retención (30 días → 7): pierdes histórico para análisis.
- Subir el polling (30s → 5s): coste de queries N veces mayor.
- Cambiar la severidad inferida desde umbrales: notificaciones existentes no se reclasifican.
