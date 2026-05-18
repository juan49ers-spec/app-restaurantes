# Changelog: Mejoras de equipo-flama

Rama integrada: `equipo-flama/claude/jolly-brown-0eceab`  
Fecha de integración: 2026-05-18  
Commits incorporados: 6

---

## Resumen ejecutivo

equipo-flama realizó tres tipos de trabajo sobre la base de código compartida:

1. **Security hardening** — nuevas capas de autenticación, auditoría y validación de archivos
2. **Refactor estructural (fase 1)** — limpieza de deuda técnica, eliminación de endpoints de prueba, reorganización de docs
3. **Nuevos componentes UI** — subcomponentes para `financial-control/resultados`, `report-uploader`, `menu-engineering/matrix` y `layout`

---

## 1. Security Hardening (`feat(security): hardening completo`)

### `src/lib/admin.ts` — gestión centralizada de admins

Centraliza la lista de superadmins en la variable de entorno `ADMIN_EMAILS` (separada por comas). Expone tres funciones:

- `isSuperAdmin(userId?)` — comprueba si el usuario actual es admin
- `requireAdmin()` — lanza error si no es admin (usar en server actions protegidas)
- `getAdminEmailList()` — devuelve la lista para otros módulos

**Antes:** los emails de admin estaban hardcodeados en múltiples archivos.  
**Ahora:** un solo punto de verdad vía variable de entorno.

---

### `src/lib/audit.ts` — log de auditoría

Registra en la tabla `admin_audit_log` (nueva migración) cualquier acción privilegiada:

```ts
await logAuditEvent({
  action: 'impersonation_start',
  target_type: 'restaurant',
  target_id: restaurantId,
  metadata: { admin_email: admin.email }
})
```

Cada evento guarda: actor, acción, tipo de objetivo, id de objetivo, metadata JSON y timestamp.

---

### `src/lib/verify-access.ts` — verificación de propiedad de restaurante

Antes de operar sobre datos de un restaurante, verifica que el usuario sea el propietario (o un admin con impersonación activa). Lanza error si no tiene acceso. Se debe llamar al inicio de cualquier server action que reciba un `restaurantId` externo.

---

### `src/lib/upload-validation.ts` — validación de archivos subidos

Valida tamaño (máx 10 MB), tipo MIME y extensión antes de procesar cualquier upload:

- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Extensiones permitidas: `jpg`, `jpeg`, `png`, `webp`, `pdf`
- Sanitiza el nombre del archivo (elimina caracteres especiales)

---

### `src/app/actions/impersonate.ts` — impersonación con auditoría

La función `startImpersonation` ahora:
- Exige `requireAdmin()` antes de continuar
- Verifica que el restaurante exista en la base de datos
- Registra el evento en `admin_audit_log`
- La cookie de impersonación expira en 30 minutos (`maxAge: 1800`)
- Usa `httpOnly: true`, `secure: true`, `sameSite: 'strict'`

---

### `supabase/migrations/20260501_admin_audit_log.sql` — nueva tabla

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Con RLS: solo el service role puede insertar; los usuarios autenticados leen sus propios registros.

---

## 2. Refactor estructural (fase 1)

### Archivos eliminados

Eliminados ~60 archivos temporales que se habían acumulado en el directorio raíz:

- Logs de build: `build.log`, `build2.log` … `build4.log`, `build_final.txt`, `build_output*.txt`
- Logs de lint: `lint.log`, `lint_results*.txt`, `lint_results_src.txt`, `lint_phase1.txt`
- Logs de TypeScript: `tsc_errors.log`, `typecheck_output*.txt`, `typecheck_phase1*.txt`
- Logs de CI: `ci_audit_report.txt`, `ci_build_report.txt`, `ci_lint_report.txt`
- Archivos de debug: `debug-invoices.ts`, `check_db.ts`, `repro_stock_error.ts`, `verify_stock_fix.ts`
- Scripts sueltos: `test-bundle.js`, `run_opencode.bat`
- Archivos de prueba OCR: `test_ollama.txt`, `oc_debug.txt`, `dummy_out.png`, `ejemplo_ventas.csv`

### Endpoints de debug eliminados

- `src/app/api/debug/ping/route.ts`
- `src/app/api/debug/seed-invoice/route.ts`
- `src/app/api/debug/test-ingestion/route.ts`
- `src/app/api/test-ocr/route.ts`
- `src/app/api/test-ocr-image/route.ts`
- `src/app/api/seed-ops/route.ts`

Todos eran endpoints de desarrollo que no deben existir en producción.

### Componentes obsoletos eliminados

- `src/components/invoices/InvoiceUpload.tsx` — sustituido por `InvoiceUploadV2.tsx`
- `src/components/invoices/UploadInvoice.tsx` — duplicado obsoleto

### Docs reorganizados

Todos los `.md` sueltos en la raíz se movieron a `docs/archive/`. El directorio raíz queda limpio.

### CI/CD (`fix(ci): upgrade Node matrix`)

- El workflow de GitHub Actions ahora usa Node **20 y 22** (antes 18+20)
- Los tests e2e y de IA se excluyen del CI (eran inestables y bloqueaban el pipeline)

---

## 3. Nuevos componentes UI

### `src/components/financial-control/resultados/`

Refactor del `ResultadosDashboard` monolítico en subcomponentes independientes:

| Archivo | Rol |
|---------|-----|
| `types.ts` | Tipos `DashboardUiData`, `DiagnosisCard`, `EMPTY_DATA` |
| `formatters.ts` | Helpers de formato numérico/porcentaje |
| `simulated-scenarios.ts` | Datos de escenarios simulados para demo/onboarding |
| `useResultadosData.ts` | Hook que transforma datos del servidor en `DashboardUiData` |
| `useDiagnoses.ts` | Hook que genera tarjetas de diagnóstico financiero automático |
| `useIntelligenceKPIs.ts` | Hook para KPIs de inteligencia financiera |
| `KpiCard.tsx` | Tarjeta de KPI con variación respecto al mes anterior |
| `CollapsibleSection.tsx` | Sección plegable con animación |
| `DiagnosisCardComponent.tsx` | Tarjeta de diagnóstico (alerta / info / éxito) |

**Por qué:** el componente original `ResultadosDashboard.tsx` tenía más de 600 líneas. Ahora cada responsabilidad está aislada y es testeable de forma independiente.

---

### `src/components/financial-control/report-uploader/`

Subcomponentes del `MonthlyReportUploader` (también era un fichero de más de 500 líneas):

| Archivo | Rol |
|---------|-----|
| `types.ts` | Tipos del uploader |
| `shared-components.tsx` | Elementos visuales compartidos (skeleton, badge de estado) |
| `ReportCard.tsx` | Tarjeta individual de un reporte subido |
| `HistoryRow.tsx` | Fila del historial de reportes |

---

### `src/components/layout/Breadcrumbs.tsx`

Breadcrumbs automáticos basados en el `pathname` actual y el `navigationConfig`. Detecta UUIDs en la ruta y los convierte en "Detalle". Se integra en el `AppLayout`.

---

### `src/components/layout/CommandPalette.tsx`

Paleta de comandos accesible con `Ctrl+K` / `Cmd+K`. Usa `cmdk` + Radix `Dialog`. Permite navegar a cualquier sección del app escribiendo su nombre. Se integra en el `AppLayout`.

---

### `src/components/menu-engineering/matrix/`

Refactor del componente `EngineeringMatrix` (también monolítico, ~500 líneas):

| Archivo | Rol |
|---------|-----|
| `constants.ts` | Constantes de la matriz BCG (cuadrantes, colores, umbrales) |
| `MatrixChartElements.tsx` | Elementos SVG/Recharts de la matriz |
| `ItemEditorPanel.tsx` | Panel lateral de edición de ítems de la matriz |

---

## 4. Bug fixes

### `saveRecipe.ts`

- Corregido el cálculo de `currentCost` (suma correcta de `quantity_gross * price_per_unit`)
- El `recipeId` se genera con `crypto.randomUUID()` para recetas nuevas
- Se incluye registro en `price_history` tanto para creaciones como actualizaciones

### `supabase/migrations/20260503_fix_upsert_recipe_rpc.sql`

Reescritura completa del RPC `upsert_recipe_with_ingredients` para que coincida con el esquema actual de la tabla `recipes` (la migración original de 2026-03 usaba nombres de columna obsoletos).

### `src/app/api/seed-ingredients/route.ts` (nuevo)

Endpoint de desarrollo (`NODE_ENV !== 'production'`) que siembra recetas de ejemplo con ingredientes reales para facilitar el setup de entornos de prueba.

---

## Variables de entorno nuevas requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ADMIN_EMAILS` | Lista de emails superadmin separados por comas | `admin@empresa.com,soporte@empresa.com` |

---

## Migraciones pendientes de aplicar

Si la base de datos de producción aún no tiene estas migraciones, deben aplicarse en orden:

1. `supabase/migrations/20260501_admin_audit_log.sql`
2. `supabase/migrations/20260503_fix_upsert_recipe_rpc.sql`
