# Configuración OCR Sistema Completo

Este sistema incluye **4 proveedores de OCR** con fallback automático para máxima fiabilidad.

## Proveedores soportados

### 1. **Chandra API** (RECOMENDADO - TOP)
- **Precisión**: 85.9% (mejor benchmark)
- **Especialidad**: Tablas complejas, handwriting, multilingual
- **Costo**: ~$0.01-0.03 por página
- **Velocidad**: ~2-5 segundos por factura
- **Setup**: 2 minutos
- **Requiere**: GPU o API key

```bash
# Obtener API key en: https://www.datalab.to/
CHANDRA_API_KEY=your_key_here
```

**Pasos para obtener Chandra:**
1. Ir a https://www.datalab.to/
2. Registrarse (gratis con créditos gratuitos)
3. Ir a API Keys → Create new key
4. Copiar la key y pegarla en `.env.local`

### 2. **Gemini 2.0 Flash** (Más rápido y barato)
- **Precisión**: ~80%
- **Costo**: ~$0.001 por imagen
- **Velocidad**: ~1 segundo
- **Setup**: 1 minuto

```bash
# Obtener en: https://ai.google.dev/
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

**Pasos:**
1. Ir a https://ai.google.dev/
2. Crear proyecto en Google Cloud
3. Habilitar Generative Language API
4. Crear API key
5. Añadir a `.env.local`

### 3. **Claude 3.5 Haiku** (Alta precisión)
- **Precisión**: ~82%
- **Costo**: ~$0.0025 por imagen
- **Velocidad**: ~2 segundos

```bash
# Obtener en: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_key_here
```

### 4. **Ollama Local** (Gratis, privacidad total)
- **Precisión**: ~70-75%
- **Costo**: Gratis
- **Requiere**: GPU NVIDIA o CPU decente
- **Modelos recomendados**:
  - `qwen2-vl:7b` (mejor visión)
  - `glm-ocr` (especializado en OCR)
  - `llava:latest`

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo recomendado
ollama pull qwen2-vl:7b

# Configurar
OCR_PROVIDER=ollama
OLLAMA_MODEL=qwen2-vl:7b
OLLAMA_BASE_URL=http://localhost:11434/api
```

## Estrategia de fallback automático

El sistema intenta los proveedores en este orden:

```
1. Chandra API (mejor precisión)
   ↓ (si falla)
2. Gemini Flash (más rápido)
   ↓ (si falla)
3. Claude Haiku (alta precisión)
   ↓ (si falla)
4. Ollama local (gratis, siempre disponible)
   ↓ (si falla)
5. Mock (desarrollo, retorna datos de ejemplo)
```

## Configuración recomendada por caso de uso

### **Para producción (CLIENTE FINAL)**
```env
# Opción A: Máxima precisión (recomendado)
CHANDRA_API_KEY=sk-chandra-xxx
GOOGLE_GENERATIVE_AI_API_KEY=AIza-xxx

# Opción B: Rápido + económico
GOOGLE_GENERATIVE_AI_API_KEY=AIza-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Opción C: Solo local (gratis)
OCR_PROVIDER=ollama
OLLAMA_MODEL=qwen2-vl:7b
```

### **Para desarrollo**
```env
# Sin dependencias externas (usa mock)
# Deja todas las API keys vacías

# O usar Ollama si lo tienes instalado
OCR_PROVIDER=ollama
OLLAMA_MODEL=qwen2-vl:7b
```

## Instalación de dependencias

```bash
# Instalar paquetes necesarios
npm install @ai-sdk/google @ai-sdk/anthropic

# O si usas yarn
yarn add @ai-sdk/google @ai-sdk/anthropic

# Para Ollama (opcional)
# Instalar Ollama en tu máquina:
# - Mac: brew install ollama
# - Linux: curl -fsSL https://ollama.com/install.sh | sh
# - Windows: Descargar de ollama.com
```

## Uso básico

```typescript
import { extractInvoiceData } from '@/lib/invoice-extractor-v2'

// Extraer datos de factura
const result = await extractInvoiceData(
    fileBuffer,
    'image/jpeg',
    'factura-ejemplo.jpg'
)

if (result.success) {
    console.log('Datos extraídos:', result.data)
    console.log('Proveedor usado:', result.provider_used)
    console.log('Confianza:', result.data?.confidence)
} else {
    console.error('Error:', result.error)
}
```

## Testing del sistema

```bash
# Health check de proveedores
curl http://localhost:3000/api/ocr/health

# Procesar factura de prueba
curl -X POST http://localhost:3000/api/invoices/upload \
  -F "file=@test-invoice.pdf"
```

## Costos estimados

| Proveedor | Costo por factura | 100 facturas | 1000 facturas |
|-----------|------------------|--------------|---------------|
| Chandra   | $0.02            | $2           | $20           |
| Gemini    | $0.001           | $0.10        | $1            |
| Claude    | $0.025           | $2.50        | $25           |
| Ollama    | Gratis           | $0           | $0            |

## Soporte y troubleshooting

### Chandra no responde
- Verifica que la API key es correcta
- Revisa los créditos disponibles en https://www.datalab.to/
- Timeout puede aumentar en `chandra-client.ts`

### Ollama devuelve error
- Asegúrate de que Ollama esté corriendo: `ollama serve`
- Verifica que el modelo esté descargado: `ollama list`
- Prueba con: `curl http://localhost:11434/api/generate -d '{"model":"qwen2-vl:7b","prompt":"test"}'`

### Gemini error 403
- Activa la API en Google Cloud Console
- Verifica que la API key tenga permisos
- Habilita billing (aunque tienen créditos gratis)

### Precisión baja
- Para facturas con tablas complejas: usa Chandra
- Para handwriting: usa Chandra
- Para facturas simples: Gemini es suficiente
- Para máxima precisión: configura Chandra + Gemini como fallback

## Recursos

- **Chandra Docs**: https://github.com/datalab-to/chandra
- **Gemini Docs**: https://ai.google.dev/docs
- **Claude Docs**: https://docs.anthropic.com/
- **Ollama Docs**: https://ollama.com/docs
