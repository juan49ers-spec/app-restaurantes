# 🔧 Solución de Problemas - Sistema OCR

## ❌ "He añadido una factura y no hace nada"

### Posibles causas y soluciones:

### 1. **No estás autenticado** ⚠️ (Más probable)

El sistema requiere autenticación. Verifica:

```bash
# Abre la consola del navegador (F12) y ve a la pestaña Console
# Deberías ver logs como:
# [InvoiceUpload] Files dropped: 1
# [InvoiceUpload] Processing file 0: factura.pdf
```

**Solución:**
1. Ve a http://localhost:3000/login
2. Inicia sesión
3. Luego ve a http://localhost:3000/invoices/new

### 2. **Bucket de Supabase no existe**

```bash
# Ejecutar script de verificación
npx tsx scripts/check-invoices-bucket.ts
```

**Si falla**, crear bucket en Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('invoices', 'invoices', false, 10485760);
```

### 3. **RLS policies faltantes**

Ejecutar en Supabase SQL Editor:

```sql
-- Permitir upload a usuarios autenticados
CREATE POLICY "Allow invoice upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'invoices' 
    AND auth.role() = 'authenticated'
);

-- Permitir ver archivos propios
CREATE POLICY "Allow select own invoices" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'invoices' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir borrar archivos propios
CREATE POLICY "Allow delete own invoices" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'invoices' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. **API key de Chandra no configurada**

Verificar `.env.local`:

```env
# Debe tener esta línea:
CHANDRA_API_KEY=zX18JgFjJbKrxuKvPSHVKbasTLakd5IHs3y9y3cPJzQ
```

Luego reiniciar servidor:

```bash
# Matar proceso actual
Ctrl + C

# Reiniciar
npm run dev
```

### 5. **Errores en la consola del navegador**

Abrir DevTools (F12) → Console y buscar:

- ❌ `404` → Archivo no encontrado
- ❌ `500` → Error del servidor
- ❌ `401` → No autenticado

### 6. **Chandra API no responde**

```bash
# Test health check
curl https://api.datalab.to/v1/health \
  -H "Authorization: Bearer zX18JgFjJbKrxuKvPSHVKbasTLakd5IHs3y9y3cPJzQ"
```

Si falla, verificar:
- API key correcta
- Créditos disponibles en https://www.datalab.to/
- Conexión a internet

## 📊 **Diagnosticar paso a paso**

### Paso 1: Verificar autenticación

```bash
# 1. Ir a http://localhost:3000/login
# 2. Iniciar sesión
# 3. Ir a http://localhost:3000/invoices/new
# 4. Abrir DevTools (F12) → Console
# 5. Deberías ver: "[InvoiceUpload] Files dropped: X"
```

### Paso 2: Verificar bucket de Supabase

```bash
npx tsx scripts/check-invoices-bucket.ts
```

### Paso 3: Verificar endpoint

```bash
# Si estás autenticado, esto debería funcionar
curl -X POST http://localhost:3000/api/invoices/upload \
  -F "file=@test.pdf" \
  -H "Cookie: $(tu-cookie-de-sesion)"
```

### Paso 4: Verificar OCR providers

```bash
npx tsx scripts/test-ocr-config.ts
```

## 🐛 **Logs útiles**

### En la consola del navegador deberías ver:

```
[InvoiceUpload] Files dropped: 1
[InvoiceUpload] Total files: 1
[InvoiceUpload] Processing files: 1
[InvoiceUpload] Processing file 0: factura.pdf
[InvoiceUpload] Uploading factura.pdf...
[InvoiceUpload] Response status: 200
[InvoiceUpload] Success: {invoiceId: "...", provider: "chandra", ...}
```

### Si ves errores:

```
❌ [InvoiceUpload] Upload error: No autenticado
   → Solución: Iniciar sesión en /login

❌ [InvoiceUpload] Upload error: Bucket not found
   → Solución: Crear bucket en Supabase

❌ [InvoiceUpload] Upload error: Permission denied
   → Solución: Configurar RLS policies
```

## 📝 **Test completo de diagnóstico**

```bash
# 1. Verificar bucket
npx tsx scripts/check-invoices-bucket.ts

# 2. Verificar configuración OCR
npx tsx scripts/test-ocr-config.ts

# 3. Verificar logs del servidor
# En la terminal donde corre npm run dev, buscar:
# [Invoice Upload API] Called
# [Upload] User: xxx, File: xxx, Size: xxx
```

## ✅ **Checklist antes de abrir ticket**

- [ ] Estoy autenticado (puedo ver mi email en la UI)
- [ ] El bucket 'invoices' existe en Supabase
- [ ] Las RLS policies están configuradas
- [ ] CHANDRA_API_KEY está en .env.local
- [ ] El servidor se reinició después de configurar .env.local
- [ ] No hay errores rojos en DevTools Console
- [ ] Puedo ver logs [InvoiceUpload] en la consola

## 🚀 **Si todo funciona correctamente**

Deberías ver:

1. Arrastras factura → Aparece en la lista
2. Status cambia: pending → uploading → processing → success
3. Verde con checkmark ✅
4. Botón "Revisar" aparece
5. Click en "Revisar" → Te lleva a `/invoices/[id]/review`

## 📞 **Ayuda adicional**

Si después de todo esto no funciona:

1. **Capturar logs de DevTools Console** (F12 → Console → Copiar todo)
2. **Capturar logs del servidor** (Terminal donde corre npm run dev)
3. **Verificar Supabase Dashboard** → Storage → invoices bucket
4. **Verificar Chandra Dashboard** → Usage logs

Pegar todos los logs en un nuevo issue o pregunta.
