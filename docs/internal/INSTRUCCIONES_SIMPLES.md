# 🚀 INSTRUCCIONES SIMPLES - PASO A PASO

## 🔰 Si no sabes qué hacer, sigue ESTOS pasos exactamente:

---

## ✅ **PASO 1: Ejecutar el diagnóstico automático**

Copia y pega esto en tu terminal:

```bash
node scripts/diagnosticar-ocr.js
```

**¿Qué hace?** Verifica TODO automáticamente y te dice qué está mal.

**Resultado:** Te dirá si Chandra funciona, si Ollama funciona, si el servidor está corriendo, etc.

---

## ✅ **PASO 2: Abrir el navegador en la URL correcta**

Copia y pega esto en tu navegador:

```
http://localhost:3000/login
```

**Inicia sesión** con tu email y contraseña.

---

## ✅ **PASO 3: Ir a la página de facturas**

Después de iniciar sesión, copia y pega esto en el navegador:

```
http://localhost:3000/invoices/new
```

---

## ✅ **PASO 4: Arrastrar una factura**

1. Toma una factura (PDF o imagen)
2. Arrástrala al recuadro grande
3. Suelta la factura
4. Espera 5-30 segundos
5. Verás los resultados

---

## 🔍 **Si no funciona, haz ESTO:**

### **Opción A: Ver lo que pasa en la consola**

1. **Presiona F12** en tu navegador
2. **Haz clic en la pestaña "Console"**
3. **Arrastra una factura**
4. **Copia TODO lo que aparece** y pégalo aquí

### **Opción B: Ejecuta el diagnóstico**

```bash
node scripts/diagnosticar-ocr.js
```

Copia y pega el resultado aquí.

---

## 📋 **Lo que necesito saber:**

1. **¿Qué aparece cuando ejecutas `node scripts/diagnosticar-ocr.js`?**

2. **¿Qué aparece en la consola del navegador (F12 → Console) cuando arrastras una factura?**

3. **¿Qué error ves exactamente?**

---

## 🎯 **RESUMEN - Solo haz ESTO:**

```bash
# 1. Ejecutar diagnóstico
node scripts/diagnosticar-ocr.js

# 2. Abrir navegador
http://localhost:3000/login

# 3. Iniciar sesión

# 4. Ir a facturas
http://localhost:3000/invoices/new

# 5. Arrastrar factura
```

**Y dime qué pasó.**

---

## 💡 **EXTRA: Si quieres ver los logs del servidor**

En la terminal donde corre `npm run dev`, busca líneas como:

```
[Invoice Upload API] Called
[Upload] User: xxx
[OCR] Intentando proveedor: chandra
```

Copia y pega esos logs aquí.

---

## 🆘 **Si aún no sabes qué hacer:**

Dime exactamente esto:

1. **¿Ves la página de login?** (Sí/No)
2. **¿Puedes iniciar sesión?** (Sí/No)
3. **¿Ves la página de facturas?** (Sí/No)
4. **¿Puedes arrastrar una factura?** (Sí/No)
5. **¿Qué pasa después de arrastrar la factura?** (Se queda cargando / Aparece error / Dice "procesando" pero nada más)

**Con esa información te ayudo.**
