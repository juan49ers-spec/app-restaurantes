# 🔧 "Pone en proceso pero no reconoce nada" - SOLUCIÓN

## 📋 **Diagnóstico del problema**

Si el sistema "pone en proceso pero no reconoce nada", significa que:
- ✅ El archivo se subió correctamente
- ✅ El sistema intentó procesarlo
- ❌ El OCR falló o devolvió datos vacíos

## 🔍 **Paso 1: Ver logs del servidor**

**IMPORTANTE: Necesito ver los logs del servidor**

En la terminal donde corre `npm run dev`, busca logs como:

```
[Invoice Upload API] Called
[Upload] User: xxx, File: xxx, Size: xxx
[OCR] Usando Ollama local / Chandra / etc
[OCR] ❌ Error: ...
```

**Copia y pega esos logs aquí**

---

## 🧪 **Paso 2: Test Chandra API**

```bash
npx tsx scripts/test-chandra-connection.ts
```

Esto te dirá si Chandra está funcionando.

**Si falla:**
- Verifica tu API key
- Revisa créditos en https://www.datalab.to/dashboard
- Verifica conexión a internet

---

## 📄 **Paso 3: Test con tu factura real**

```bash
npx tsx scripts/test-ocr-direct.ts "ruta/a/tu/factura.pdf"
```

Esto procesará tu factura y te mostrará:
- ✅ Qué proveedor se usó
- ✅ Qué datos se extrajeron
- ✅ Dónde falló exactamente

---

## 🚨 **Problemas comunes y soluciones**

### Problema 1: "Chandra API key not configured"

**Solución:**
```bash
# Verificar .env.local
cat .env.local | grep CHANDRA
```

Debería mostrar:
```env
CHANDRA_API_KEY=zX18JgFjJbKrxuKvPSHVKbasTLakd5IHs3y9y3cPJzQ
```

**Si no está:**
1. Editar `.env.local`
2. Agregar la línea
3. Reiniciar servidor: `Ctrl + C` luego `npm run dev`

---

### Problema 2: "Ollama connection refused"

**Solución:**
```bash
# Iniciar Ollama
ollama serve

# En otra terminal, verificar
curl http://localhost:11434/api/tags
```

**Si Ollama no está instalado:**
- Sistema usará otros proveedores (Chandra, Gemini)
- O puedes instalar Ollama: `curl -fsSL https://ollama.com/install.sh | sh`

---

### Problema 3: Timeout en Chandra

**Logs muestran:** `Timeout after 30000ms`

**Solución:**
1. Verificar internet
2. Verificar API key válida
3. Revisar créditos en Chandra dashboard
4. El sistema automáticamente usará otro proveedor

---

### Problema 4: "OCR extraction failed" (error genérico)

**Necesito ver el error específico en los logs**

Pero soluciones comunes:

```bash
# 1. Test Chandra conexión
npx tsx scripts/test-chandra-connection.ts

# 2. Test con tu archivo específico
npx tsx scripts/test-ocr-direct.ts "/ruta/a/factura.pdf"

# 3. Verificar proveedores activos
npx tsx scripts/test-ocr-config.ts
```

---

### Problema 5: "No se detectaron items"

**El OCR funciona pero no extrae datos**

**Causas posibles:**
- Imagen borrosa o de baja calidad
- PDF escaneado con mala resolución
- Formato no soportado
- Factura en idioma no soportado

**Soluciones:**
1. **Mejorar calidad de imagen**
   - Rescanear a 300 DPI
   - Buena iluminación
   - Sin sombras/reflejos

2. **Probar con otro archivo**
   ```bash
   npx tsx scripts/test-ocr-direct.ts "./otra-factura.pdf"
   ```

3. **Verificar idioma**
   - Chandra soporta 90+ idiomas
   - Si el factura es en idioma raro, puede fallar

---

## 🔧 **Paso 4: Ver configuración completa**

```bash
npx tsx scripts/test-ocr-config.ts
```

Debería mostrar:

```
📋 Environment Variables:
   CHANDRA_API_KEY: ✅ Configured
   GEMINI_API_KEY: ❌ Missing
   ANTHROPIC_API_KEY: ❌ Missing
   OCR_PROVIDER: ollama

🔍 Providers Health Check:
   Chandra: ✅/❌
   Gemini: ❌
   Anthropic: ❌
   Ollama: ✅/❌
```

---

## 💡 **Solución rápida - Modo MOCK**

Si quieres ver cómo funciona sin OCR real:

```bash
# Editar .env.local
# Comentar todas las API keys:
# CHANDRA_API_KEY=sk-xxx
# OCR_PROVIDER=ollama

# Reiniciar servidor
Ctrl + C
npm run dev
```

El sistema usará **modo mock** (datos de ejemplo) para que veas la UI funcionando.

---

## 📊 **Logs que necesito ver**

Para ayudarte mejor, por favor proporciona:

**1. Logs del servidor (terminal donde corre `npm run dev`)**
```
[Invoice Upload API] Called
[Upload] User: xxx, File: xxx, Size: xxx
[OCR] Intentando proveedor: chandra
[OCR] ❌ Error: ...
```

**2. Resultado de test Chandra**
```bash
npx tsx scripts/test-chandra-connection.ts
```

**3. Resultado de test con tu archivo**
```bash
npx tsx scripts/test-ocr-direct.ts "./tu-factura.pdf"
```

---

## ✅ **Checklist antes de reportar error**

- [ ] Servidor corriendo en http://localhost:3000
- [ ] Usuario autenticado (logueado)
- [ ] Chandra API key en .env.local
- [ ] Ejecuté `npx tsx scripts/test-chandra-connection.ts`
- [ ] Ejecuté `npx tsx scripts/test-ocr-config.ts`
- [ ] Tengo logs del servidor
- [ ] Probé con 2-3 facturas diferentes

---

## 🚀 **Una vez que me pases los logs**

Podré decirte exactamente:
1. Qué proveedor está usando
2. Por qué falla
3. Cómo solucionarlo específicamente

**Mientras tanto, prueba estos comandos y dime qué muestran:**

```bash
# 1. Test Chandra
npx tsx scripts/test-chandra-connection.ts

# 2. Test configuración
npx tsx scripts/test-ocr-config.ts

# 3. Test con tu factura
npx tsx scripts/test-ocr-direct.ts "./ruta/a/tu/factura.pdf"
```

**Copia y pega aquí los resultados.**
