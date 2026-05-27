# 05 — Invoices (Facturas)

**Ruta:** `/invoices` (+ `/invoices/[id]/review`)
**Archivos clave:** `src/app/invoices/page.tsx`, `src/app/invoices/[id]/review/page.tsx`, `src/app/actions/invoices.ts`, `src/app/actions/review-invoice.ts`, `src/app/actions/auto-dispute.ts`, `src/services/openai-vision.ts`, `src/components/invoices/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito y rol en el negocio

Ingesta automatizada de facturas de proveedores. El usuario sube PDF/JPG, GPT-4o vision extrae los datos (proveedor, items, totales, IVA), el usuario los revisa y mapea a ingredientes maestros, y al confirmar se actualizan stock, historial de precios, gastos operativos y se aprenden aliases para futuras facturas.

## 2. Viaje del usuario

1. Entra a `/invoices`. Ve 3 tabs:
   - **Subir**: dropzone para arrastrar archivos.
   - **Revisión**: facturas pendientes (status `processing` o `review_required`).
   - **Histórico**: facturas `completed`.
2. **Subir:**
   - `InvoicesCsvImportPanel`: permite importar cabeceras históricas desde CSV para marcar facturas ya revisadas como `completed` sin OCR. Si hay errores o duplicados internos, permite descargar incidencias como CSV.
   - Arrastra archivos (PDF, JPG, PNG).
   - Click "Procesar N Facturas".
   - Por cada archivo: upload a Supabase Storage → crea fila `invoices` con `status='processing'` → llama OpenAI Vision → guarda resultado en `scanned_data` → status pasa a `review_required` (o `error`).
   - Progreso visible: "Subiendo…" → "Analizando (IA)…" → ✓ o ✗.
3. **Revisión:**
   - Lista de facturas pendientes con badge rojo animado.
   - Click "Revisar" → navega a `/invoices/[id]/review`.
4. **Página de review (`/invoices/[id]/review`):**
   - Split view: PDF a la izquierda (iframe), formulario a la derecha.
   - Campos: `invoice_number`, `date`, `supplier_id` (dropdown — o crear nuevo), `total_amount`.
   - Tabla de items (extraídos por OCR):
     - Descripción, qty, unit, price.
     - Mapeo: dropdown para asociar a un `master_ingredient` existente, "crear nuevo" o "ignorar".
     - Conversión: si es pack ("Caja de 12"), se mapea `pack_size=12`.
     - Sparkline de precio histórico del ingrediente.
   - Bulk actions: seleccionar varias filas y aplicar mismo mapping o conversión.
   - Click "Guardar" → `updateInvoice(invoiceId, data)`.
5. **Histórico:**
   - Tabla read-only con `status='completed'`. Columnas: fecha, nº factura, proveedor, total, badge verde.

## 3. Flujo técnico de datos

**Subir factura (`processInvoice`):**

1. Verifica créditos OCR del restaurante (`restaurants.ocr_credits` > 0).
2. Upload archivo a Supabase Storage (bucket `invoices`).
3. INSERT en `invoices` con `status='processing'`, `file_url`, `idempotency_key`.
4. Llama `openai-vision.ts` con la imagen/PDF. GPT-4o extrae JSON con `invoice_number`, `supplier`, `items[]`, `total_amount`, `tax`, `date`.
5. Guarda `scanned_data` (JSONB) y pasa `status='review_required'` (o `error` si OCR falla).
6. Descuenta 1 crédito OCR.

**Importar cabeceras CSV (`importInvoicesCsv`):**

1. El cliente pega un CSV con `date`, `supplier_id` o `supplier_name`, `invoice_number`, `total_amount` y opcionalmente `tax_amount`.
2. `validateInvoicesCsvImport({ csvText })` revalida el parser en servidor, resuelve `restaurant_id` con `getUserRestaurant()`, cruza proveedores contra `suppliers` del restaurante y detecta duplicados exactos.
3. `importInvoicesCsv({ csvText })` repite todo el preflight antes de escribir e inserta filas en `invoices` con `status='completed'` y `scanned_data.source='csv_import'`.
4. Este flujo **solo crea cabeceras históricas**. No crea `invoice_items`, no genera `stock_movements`, no actualiza `inventory_stock` y no inserta `operating_expenses`.
5. `ImportIssuesDownloadButton` exporta errores de archivo, filas inválidas y duplicados internos del preview para corregir el CSV fuera de la app.

**Revisar y guardar (`updateInvoice`):**

1. Valida que `supplier_id` esté presente.
2. Por cada item mapeado:
   - Si es "nuevo": crea `master_ingredient` (`createAndMapIngredient`).
   - Inserta/actualiza `supplier_aliases` (alias_name → master_ingredient_id) con `confidence_score`.
   - Inserta `supplier_items` (name_on_invoice, sku, last_price, pack_size, master_ingredient_id).
   - Calcula `unit_price` normalizado: `line_total / (quantity * pack_size)`.
   - Inserta `invoice_items` con datos definitivos.
   - Compara precio con histórico:
     - Si cambio > 1% → insert en `price_history`.
     - Si cambio > 10% → `createAlert` (price spike).
   - Actualiza `master_ingredients.current_avg_price`.
   - Inserta `stock_movements` tipo `PURCHASE` + `increment_inventory_stock` para sumar al inventario.
3. Marca `invoices.status='completed'`.
4. Inserta gasto en `operating_expenses` con categoría PROVEEDORES_COMIDA o PROVEEDORES_BEBIDA según tag, monto = `total_amount`, fecha = factura.
5. `revalidatePath('/invoices')`, `revalidatePath('/invoices/[id]/review')`, también `/financial-control` y `/stock`.

**Auto-dispute** (`auto-dispute.ts`): detección de discrepancias y generación de email/disputa hacia el proveedor (feature parcial).

## 4. Reglas de negocio y restricciones

- **Estados de factura** (enum estricto):
  - `uploading` → archivo en proceso de subida.
  - `processing` → OCR en curso.
  - `review_required` → OCR terminado, esperando revisión humana.
  - `completed` → factura cerrada. En OCR+review implica mapeo confirmado y datos volcados a stock/gastos; en CSV de cabeceras implica solo histórico revisado. **No editable.**
  - `error` → OCR falló. Usuario debe reintentar.
- **OCR completo:** las facturas que deben afectar stock, precio de ingredientes, aliases y gastos operativos pasan por GPT-4o + review humana.
- **CSV de cabeceras:** existe como flujo limitado para histórico/checklist. Solo marca facturas ya revisadas como `completed`; no sustituye la review cuando se necesita impacto en stock/gastos.
- **CSV incidencias:** la descarga de incidencias no escribe datos ni comprueba BD; solo convierte el preview local en un CSV de ayuda para corrección.
- **Créditos:** cada OCR consume 1 crédito. Sin créditos, no se puede subir.
- **`supplier_id` obligatorio** al guardar review.
- **Mapeo opcional por item:** se puede ignorar líneas (`mappingValue='ignore'`). No afectan stock.
- **Precio spike:** alerta visible al usuario, no bloquea guardado.
- **Pack size:** si la factura dice "Caja de 12" y precio total 24€, el sistema guarda `unit_price = 24 / 12 = 2€` por unidad de venta.
- **Aliases:** se aprenden con `confidence_score = 1.0` en primer mapeo manual. Próximas facturas del mismo proveedor con misma `description` se pre-mapearán.
- **Idempotency:** `idempotency_key` previene crear 2 facturas del mismo upload si el cliente reintenta.

## 5. Dependencias e implicaciones cruzadas

- **Tablas (lectura/escritura):** `invoices`, `invoice_items`, `ingestion_buffer`, `supplier_aliases`, `supplier_items`, `suppliers`, `master_ingredients`, `inventory_stock`, `stock_movements`, `price_history`, `operating_expenses`, `restaurants.ocr_credits`.
- **Otras páginas afectadas:**
  - `/stock` — se actualiza tras confirmar.
  - `/suppliers/[id]` — `supplier_items` cambia.
  - `/purchasing/analytics` — datos de proveedor y precio refrescan.
  - `/financial-control` — gasto creado automáticamente.
  - `/notifications` — alertas de spike.
  - `/admin/billing` — créditos OCR consumidos visibles.
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — cadena de tablas implicadas en confirmación.
  - [T06](./T06-server-actions-comunes.md) — patrón con idempotency.
- **API route relacionada:** `src/app/api/invoices/` (uploads, posiblemente endpoints internos).

## 6. Casos límite y errores conocidos

- **OCR vacío o erróneo:** factura queda en `error`. Usuario debe reintentar o cargar otra imagen.
- **Sin créditos:** el upload falla con mensaje "Sin créditos". Comprar/recargar desde admin.
- **Proveedor no existe:** se ofrece "crear nuevo" inline.
- **Ingrediente similar pero no idéntico:** la sugerencia busca por nombre case-insensitive. Si hay "Tomate" y la factura dice "Tomates", lo sugerirá. El usuario debe confirmar.
- **Stock no inicializado:** si es primera compra de un ingrediente, se crea `inventory_stock` row.
- **Tag de COGS:** sin tag, el gasto va a `PROVEEDORES_COMIDA` por default (revisar). Para vinos/alcohol debería ser `PROVEEDORES_BEBIDA`.
- **Importar CSV con proveedor inexistente:** se bloquea; el proveedor debe existir en `/suppliers`.
- **Importar CSV con proveedor ambiguo por nombre:** se bloquea; usar `supplier_id`.
- **Importar CSV de factura ya existente:** se bloquea si coincide proveedor, número, fecha e importe.
- **Doble click en "Guardar":** sin debounce; idempotency_key mitiga duplicados.
- **Edición post-completado:** el formulario muestra "✅ Procesada" pero no permite editar. Si necesitas corregir, hay que eliminar y resubir, o intervenir en BD.
- **PDF multipágina:** GPT-4o vision puede no leer todas las páginas según el modelo configurado. Revisar `openai-vision.ts`.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Leer todo `review-invoice.ts` (es la action más densa del proyecto).
- Confirmar el flujo de `idempotency_key` y de RLS multi-tenant.
- Si tocas OCR: leer `src/services/openai-vision.ts` y revisar costes API.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/invoices.ts` — upload + OCR.
- `src/app/actions/review-invoice.ts` — confirmación.
- `src/app/actions/auto-dispute.ts` — disputas.
- `src/services/openai-vision.ts` — prompts y modelo.
- `src/components/invoices/*` — UI dropzone y review.
- `src/app/actions/stock-actions.ts` — `addStockMovement` / `increment_inventory_stock`.
- `src/app/actions/financial-control.ts` — para que el gasto inyectado tenga formato esperado.
- `src/types/schema.ts` — `InvoiceSchema`, `InvoiceStatusSchema`.

**Qué probar manualmente:**
- Subir factura PDF → ver progreso → confirmar que llega a `review_required`.
- Subir imagen JPG → mismo flujo.
- Subir archivo no soportado (texto plano) → debe rechazar.
- Revisar factura con todos los items mapeados → verificar:
  - `inventory_stock.current_qty` aumenta.
  - `master_ingredients.current_avg_price` se actualiza.
  - Si cambio > 10% → alerta creada.
  - `operating_expenses` tiene una fila nueva con `category=PROVEEDORES_COMIDA`.
  - `invoices.status=completed`.
- Subir 2 veces el mismo archivo (con mismo idempotency) → solo 1 factura creada.
- Revisar factura con item ignorado → stock NO se afecta para ese item.
- Crear nuevo ingrediente desde dentro del review.
- Revisar factura sin proveedor → error de validación.

**Cambios delicados:**
- Cambiar el cálculo de `unit_price`: afecta retroactivamente la siguiente comparación con histórico.
- Cambiar el umbral de spike (10%): impacto en volumen de alertas.
- Cambiar el modelo OpenAI: revisar costes y formato del JSON de salida.
- Eliminar una factura `completed`: los `stock_movements` quedan pero el `inventory_stock.current_qty` no se revierte automáticamente. Documentar / implementar reverso si se pide.
