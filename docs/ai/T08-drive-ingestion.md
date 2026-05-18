# T08 — Ingesta Automática desde Google Drive

**Archivos clave:** `src/lib/google-drive.ts`, `src/app/api/cron/process-drive/route.ts`, `src/components/shared/DriveInboxPanel.tsx`
**Transversales relacionados:** [T07](./T07-ocr-pipeline.md), [05-Invoices](./05-invoices.md), [04-Financial Control](./04-financial-control.md)

## 1. Propósito

Automatizar la ingesta de facturas y reportes mensuales. El restaurante deja archivos en una carpeta de Google Drive ("INBOX") y un cron los procesa automáticamente: OCR para facturas, extracción estructurada para reportes mensuales en PDF.

## 2. Estructura de carpetas en Drive

Cada restaurante tiene una configuración en la tabla `drive_sync_config`:

```
📁 RESTAURANTE_X/
├── 📁 1_INBOX/              ← inbox_folder_id (aquí sube el usuario)
├── 📁 2_PROCESADAS/         ← processed_folder_id
│   ├── 📁 2026/
│   │   ├── 📁 01/
│   │   ├── 📁 02/
│   │   └── ...
├── 📁 3_REVISION_MANUAL/    ← review_folder_id (confianza baja o error)
```

## 3. Google Drive Client (`google-drive.ts`)

Cliente REST ligero sin dependencia del SDK `googleapis`. Compatible con Vercel Edge Runtime.

**Autenticación:** Service Account JWT firmado con Web Crypto API.

| Función | Descripción |
|---------|-------------|
| `listFilesInFolder(folderId)` | Lista hasta 50 PDFs/imágenes en una carpeta, orden cronológico. |
| `downloadFile(fileId)` | Descarga metadata + contenido binario. Devuelve `{buffer, mimeType}`. |
| `moveFile(fileId, from, to)` | Cambia el parent del archivo (PATCH addParents/removeParents). |
| `createSubfolder(parentId, name)` | Crea subcarpeta. |
| `findSubfolder(parentId, name)` | Busca subcarpeta por nombre. |
| `getOrCreateDateFolder(processedId, date)` | Crea `{year}/{month}` bajo PROCESADAS si no existe. |

**Env var:** `GOOGLE_SERVICE_ACCOUNT_KEY` — JSON de Service Account codificado en base64.

## 4. Cron Route (`/api/cron/process-drive`)

Endpoint GET ejecutado como Vercel Cron Job (máximo 300 segundos).

**Seguridad:** Valida `Authorization: Bearer {CRON_SECRET}` en producción.

**Flujo por restaurante:**

```
1. Leer drive_sync_config activos
2. Para cada config:
   │
   ├── listFilesInFolder(inbox_folder_id)
   │
   ├── Para cada archivo:
   │   │
   │   ├── ¿Nombre contiene "informe" o nombre de mes?
   │   │   └── SÍ → Ruta de REPORTE MENSUAL:
   │   │       1. extractMonthlyReport(buffer, fileName)
   │   │       2. reportToOperatingExpenses() → INSERT operating_expenses
   │   │       3. reportToDailySalesSummary() → INSERT daily_sales
   │   │       4. Log en report_imports
   │   │       5. Mover a PROCESADAS/{year}/{month}
   │   │
   │   └── NO → Ruta de FACTURA:
   │       1. extractInvoiceData(buffer, mimeType, fileName) [V1]
   │       2. ¿confidence >= 0.7?
   │       │   ├── SÍ → INSERT operating_expenses / daily_sales
   │       │   │       Mover a PROCESADAS/{year}/{month}
   │       │   └── NO → Mover a REVISION_MANUAL
   │       3. INSERT invoices (registro de auditoría)
   │
   └── Actualizar drive_sync_config.last_sync_at
```

**Tablas escritas:** `operating_expenses`, `daily_sales`, `invoices`, `report_imports`, `drive_sync_config`.

**Dependencias:**
- `@/lib/google-drive` — acceso a Drive.
- `@/lib/invoice-extractor` — OCR V1 (Ollama/Anthropic).
- `@/lib/report-extractor` — extracción de reportes mensuales en PDF.
- `@supabase/supabase-js` — admin client (service role, sin sesión de usuario).

**Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GOOGLE_SERVICE_ACCOUNT_KEY`, + env vars de OCR (ver [T07](./T07-ocr-pipeline.md)).

## 5. Reports API (`/api/reports/`)

Cuatro endpoints para gestión manual de reportes mensuales:

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/api/reports/extract` | Sube un PDF → extrae datos financieros → opcionalmente inserta en DB |
| POST | `/api/reports/compare` | Compara reporte extraído vs datos existentes en DB. Devuelve discrepancias campo a campo. |
| GET | `/api/reports/history?restaurant_id=...&limit=20` | Historial de importaciones de reportes. |
| POST | `/api/reports/insert` | Inserta definitivamente un reporte (posiblemente editado por el usuario). |

**Severidad de discrepancias (`/compare`):**
- < 2% diferencia → `ok`
- 2–10% → `warn`
- > 10% → `error`

## 6. DriveInboxPanel (`DriveInboxPanel.tsx`)

Componente cliente que muestra el estado de la bandeja de Drive y permite lanzar sincronización manual.

**Estado actual:** MVP/placeholder. Los datos están hardcodeados como mock. La llamada real al cron está comentada pendiente de auth.

**Props:** `restaurantId: string`.

## 7. Drive Sync Config (tabla)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `restaurant_id` | UUID | FK → restaurants |
| `inbox_folder_id` | TEXT | ID de la carpeta INBOX en Drive |
| `processed_folder_id` | TEXT | ID de la carpeta PROCESADAS |
| `review_folder_id` | TEXT | ID de la carpeta REVISION_MANUAL |
| `is_active` | BOOLEAN | Si el cron debe procesar este restaurante |
| `last_sync_at` | TIMESTAMPTZ | Última ejecución exitosa |

## 8. Al modificar la ingesta por Drive

- **Leer:** este archivo + [T07](./T07-ocr-pipeline.md) + [05-invoices](./05-invoices.md).
- **Si se cambia la estructura de carpetas de Drive:** actualizar `getOrCreateDateFolder()` y este doc.
- **Si se conecta V2 del extractor:** cambiar import en `process-drive/route.ts`.
- **Si se activa el DriveInboxPanel real:** reemplazar mocks con query a `invoices` + `report_imports` filtrado por restaurante.
- **Para configurar un restaurante nuevo:** insertar fila en `drive_sync_config` con los IDs de carpeta de Drive y compartir las carpetas con el email del Service Account.
