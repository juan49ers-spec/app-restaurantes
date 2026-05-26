# 📘 Guía de Usuario - Control Financiero
## *Para dueños de restaurantes que no son expertos en finanzas*

---

## 📋 ÍNDICE
1. [Pestaña FACTURACIÓN (Ingresos)](#1-pestaña-facturación-ingresos)
2. [Pestaña GASTOS] (#2-pestaña-gastos)
3. [Glosario de Términos] (#3-glosario-de-términos)

---

## 1. PESTAÑA FACTURACIÓN (INGRESOS) 💰

### 🎯 ¿Qué es esta pestaña?
Aquí registras **todo el dinero que ENTRA en tu restaurante** cada día: ventas por tarjetas, efectivo, pedidos a domicilio, etc.

### 📊 Qué ves al entrar (Interfaz)

```
┌─────────────────────────────────────────────────────────┐
│  📱 FACTURACIÓN  GASTOS  IMPUESTOS  RESULTADOS  │
└─────────────────────────────────────────────────────────┘
```

### 🔹 COLUMNA IZQUIERDA - "Resumen del Mes"

#### **Widget 1: Rendimiento Mensual** 📊
```
┌─────────────────────────────┐
│  📈 Rendimiento Mensual   │
│  ─────────────────────      │
│  Facturación Neta: 12.450€ │
│  ↑ 15.3% vs mes anterior     │  ← ¡Subió 15%! (Bien)
│  ↓ 8% ⇒ Bajó                │  ← ¡Bajó! (Mal)
└─────────────────────────────┘
```

**¿Qué significa cada número?**
- **Facturación Neta**: El dinero real que entra (sin contar IVA)
- **Flechas**: Comparación con el mes pasado
  - 🟢 Flecha hacia ARRIBA (↑) = ¡Bien! Vendiste más
  - 🔴 Flecha hacia ABAJO (↓) = ¡Ojo! Vendiste menos

**¿Cómo usarlo?**
1. Mira el número grande → "¿Estoy bien o mal?"
2. Si ves 🔴 → "¿Por qué bajó?" (¿Cerrado por vacaciones? ¿Día lluvioso?)
3. Si sube → "¡Genial, vamos por más!"

---

#### **Widget 2: Objetivo Mensual** 🎯
```
┌─────────────────────────────┐
│  🎯 Objetivo Mensual      │
│  ─────────────────────      │
│  Progreso: 67%            │
│  ████████░░░░░░░░░      │  ← Barra de progreso
│  Faltan 5.550€ para meta │
└─────────────────────────────┘
```

**¿Qué significa?**
- **Progreso**: Cuánto has vendido vs tu meta
- **Barra**: Se llena según vendes
- **Faltan**: Cuánto falta para llegar a tu objetivo

**¿Cómo usarlo?**
1. "¿Llevo 67% de mi objetivo? ¿Bien o mal?"
   - ✅ Día 20 con 67% → ¡Muy bien! Vas adelante
   - ⚠️ Día 28 con 40% → ¡Cuidado! Vas retrasado
2. Si vas retrasado: "¿Necesito hacer promociones?"

**¿Cómo cambiar tu meta?**
1. Click en botón **"Configurar"** (esquina superior derecha)
2. Pon tu objetivo mensual (ej: 20.000€)
3. Click en "Guardar"

---

#### **Widget 3: Desglose Diario** 📅
```
┌───────────────────────────────────────┐
│  📅 Resumen de Ventas Diarias   │
│  ────────────────────────────────   │
│  📊 Ver gráfico de barras          │
│  15 Oct  ████ 450€              │
│  16 Oct  ██████ 850€             │
│  17 Oct  ████ 500€              │
│  ────────────────────────────────   │
│  🔴 días cerrados: 5, 12         │
└───────────────────────────────────────┘
```

**¿Qué significa?**
- Cada barra = UN día
- 🔴 Barras rojas = Días cerrados (no abriste)
- 🟢 Barras verdes = Días con ventas
- **ALTURA** de la barra = Cuánto vendiste ese día

**¿Cómo usarlo?**
1. Identifica días extraños
   - Ej: "¡Uy! El día 12 vendí mucho menos"
   - "¿Hubo un evento? ¿Se rompió la TPV?"
2. Detecta patrones
   - "Los fines de semana vendo más que entre semana"
   - "Los lunes siempre son flojos"

**Click en cualquier barra →** Ve el detalle completo de ese día

---

### 🔹 COLUMNA DERECHA - "Registrar Ventas del Día"

#### **Formulario de Cierre Diario** ✏️

**🎯 PROPÓSITO**: Anotar cuánto vendiste HOY

**PASO 1: Fecha**
```
┌──────────────────┐
│ Fecha: 2024-10-20│ ← Por defecto es HOY
└──────────────────┘
```
- ✅ Normalmente no necesitas cambiarlo
- 🔄 Si estás registrando días pasados, cámbialo

---

**PASO 2: Ventas del día (Facturación)**

```
┌───────────────────────────────────────────────┐
│ 💰 VENTAS DEL DÍA                     │
│ ────────────────────────────────────────   │
│  Base Imponible 10%:  450€            │
│  IVA 10%:            45€            │
│  ────────────────────────────            │
│  Base Imponible 21%:  800€            │
│  IVA 21%:           168€            │
│  ────────────────────────────            │
│  Total Facturación:     1.463€        │
└───────────────────────────────────────┘
```

**¿Qué pongo?**
1. **Base Imponible** = El precio sin IVA
   - Ejemplo: Un plato vale 10€
   - Si lleva 10% IVA → Base 10 = 9,09€
   - Si lleva 21% IVA → Base 21 = 8,26€

2. **¿Cómo sé si es 10% o 21%?**
   - 🍷🥗 Comida y bebidas (Casi siempre → 10%)
   - 🍺🍷 Alcohol (Normalmente → 21%)
   - ❔ ¿No estás seguro? → Pregunta a tu asesor

**EJEMPLO PRÁCTICO**:
```
Ayer vendiste:
- 5 platos de 10€ cada uno → 50€ (10% IVA)
  → Base 10: 45,45€ | IVA 10%: 4,55€

- 3 cervezas de 5€ cada una → 15€ (21% IVA)
  → Base 21: 12,40€ | IVA 21%: 2,60€

TOTAL: Base 10: 45,45 | IVA: 7,15€ | Base 21: 12,40€
```

---

**PASO 3: Canales de venta** (Opcional)

```
┌─────────────────────────────┐
│  ¿Cómo te pagaron?        │
│  ───────────────────────   │
│  ☑ Dentro del local       │  ← Comer en el restaurante
│  ☐ Para llevar            │
│  ☐ Delivery              │
└─────────────────────────────┘
```

**¿Sirve para algo?**
- Para saber qué canal vende más
- Ejemplo: "El 80% de mi facturación es para llevar → Necesito más espacio"

---

**PASO 4: Guardar** 💾

```
┌──────────────────────────┐
│  [💾 GUARDAR DÍA]    │
└──────────────────────────┘
```

**Click en "Guardar Día"**:
1. ✅ Guarda la información
2. ✅ Actualiza todos los gráficos automáticamente
3. ✅ Muestra mensaje: "¡Día guardado correctamente!"

---

### 🎯 RESUMEN - FLUJO DIARIO RECOMENDADO

**🌅 ABRES EL RESTAURANTE:**
1. No toques nada (la fecha ya está en HOY)

**📊 ANTES DE ABRIR (Opcional):**
1. Mira el Widget de "Rendimiento Mensual"
2. "¿Voy bien o mal comparado con el mes pasado?"

**⏰ CIERRAS EL DÍA:**
1. Click en "Registrar Ventas del Día"
2. Mira la TPV → Anota los totales de 10% y 21%
3. Rellena canales (si quieres)
4. Click en "💾 GUARDAR DÍA"

**✅ LISTO:**
- Tus datos están guardados
- Los gráficos se actualizan solos
- ¡A dormir! 😴

---

### ⚠️ PREGUNTAS FRECUENTES

**❓ ¿Puedo registrar días pasados?**
✅ Sí. Cambia la fecha y rellena los datos

**❓ ¿Qué pasa si me equivoco?**
✅ Edita cualquier día ya registrado
1. Click en la barra del día que quieres cambiar
2. Modifica los valores
3. Click en "Actualizar"

**❓ ¿Tengo que hacerlo TODOS los días?**
⚠️ Mejor sí, pero no te preocupes:
- Si olvidaste un día → Pónlo aprox. "Fue un día normal, pongamos 800€"
- Es mejor tener 80% aproximado que 0% de precisión

---

## 2. PESTAÑA GASTOS 💸

### 🎯 ¿Qué es esta pestaña?
Aquí registras **todo el dinero que SALE** de tu restaurante: alquiler, nóminas, proveedores, etc.

### 📊 Qué ves al entrar

```
┌─────────────────────────────────────────────────────────┐
│  💰 FACTURACIÓN  GASTOS  IMPUESTOS  RESULTADOS  │
└─────────────────────────────────────────────────────────┘

     ┌───────────────────────────────────┐
     │  + AÑADIR GASTO              │ ← Botón grande
     └───────────────────────────────┘
```

### 🔹 SECCIÓN 1: Widget de Inteligencia de Gastos

```
┌───────────────────────────────────────────────┐
│  📈 Análisis de Gastos                 │
│  ────────────────────────────────────────   │
│  Gasto Total: 8.234€                   │
│  ↓ 12% vs mes anterior  (¡MAL!)        │
│  ────────────────────────────────────────   │
│  Peso sobre Ventas: 34.5%              │
│  Objetivo: <66%                        │
└───────────────────────────────────────────────┘
```

**¿Qué significa?**
- **Gasto Total**: Todo lo que has gastado este mes
- **↓ 12%**: Gastaste un 12% MÁS que el mes pasado
  - 🔴 Flecha ABAJO = ¡Mal! Gastaste más
  - 🟢 Flecha ARRIBA = ¡Bien! Ahorraste
- **Peso sobre Ventas**: De cada 100€ que vendes, 34.50€ se van en gastos
- **Semáforo**:
  - 🟢 VERDE = Estás dentro de lo razonable (<66%)
  - 🔴 ROJO = Estás gastando demasiado (>66%)

**💡 INSIGHT AUTOMÁTICO**:
```
El gasto total ha variado un +12% respecto al mes anterior.
Las partidas con mayor aumento han sido Proveedores Bebida (+450€) 
y Mantenimiento (+320€).
El coste de personal representa un 34% de las ventas (Obj: 33%).
```
**¿Cómo usarlo?**
1. Lee el insight → "¿Tengo un problema?"
2. Si ves 🔴 → "Necesito reducir gastos"
3. Click en "✏️ Editar nota" para poner tus propias observaciones

---

### 🔹 SECCIÓN 2: Gráfico de Distribución

```
┌───────────────────────────────────────┐
│  📊 Distribución de Gastos         │
│          🍕 35%                   │
│        ╱────╲                    │
│      ╱        ╲                  │
│    ╱    28%    ╲               │ ← Click en una sección
│   ╱              ╲              │    para ver desglose
│  ╱─────────────────╲            │
│  🧀 20%  ⚙️ 17%  👷 15%      │
└───────────────────────────────────────┘
```

**¿Qué significa?**
- Cada color = una categoría de gasto
- El tamaño del segmento = cuánto dinero gastas en eso
- **Click en un segmento** → Ve el detalle

**EJEMPLO**:
- Click en 🍕 "Proveedores Comida" (35%)
  - Muestra: Carne, Pescado, Fruta, Verdura...
  - "¡Uy! Gasto 450€ en carne este mes"

---

### 🔹 SECCIÓN 3: Tabla de Gastos Detallada

```
┌───────────────────────────────────────────────────────────────┐
│  🔍 Buscar gastos...                   [Detallada Compacta]│
│  ───────────────────────────────────────────────────────────   │
│  [Todas] [Personal] [Materia Prima] [Operaciones]       │
│  ───────────────────────────────────────────────────────────   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Categoría     Importe      Peso     Ratio     Variación│ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │👷 Personal     2.450€      30%      30%    ↓ 5%   │ │
│  │ └─ Nóminas     2.000€                               │ │
│  │ └─ Seguridad   450€                                 │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │🍕 Materia P    2.850€      35%      35%    ↑ 12%  │ │
│  │ └─ Carne       1.200€                               │ │
│  │ └─ Pescado     850€                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

**¿Cómo usar la tabla?**

**1. FILTROS** (Encabezado)
```
🔍 Buscar gastos...
```
- Escribe para buscar proveedor o concepto
- Ej: "Escribo 'frutería' → Ve solo gastos de frutería"

```
[Todas] [Personal] [Materia Prima] [Operaciones]
```
- Click en categorías para filtrar
- Ej: Click solo en [Personal] → Ves solo nóminas, seguros...

**2. VISTA DETALLADA vs COMPACTA**
```
[Detallada] [Compacta]
```
- **Detallada**: Muestra todos los datos
- **Compacta**: Solo lo esencial, más rápido de leer

**3. COLUMNAS**

| Columna | ¿Qué significa? | ¿Cómo lo uso? |
|---------|----------------|----------------|
| **Categoría** | Tipo de gasto | Click en ▼ para ver gastos individuales |
| **Importe** | Cuánto pagaste | Rojo = Negativo = Ahorro en existencias |
| **Peso** | % del total gastado | Barra visual del tamaño |
| **Ratio** | % sobre tus ventas | 🟢 Bien (≤33%) | 🔴 Mal (>33%) |
| **Variación** | vs mes anterior | ↑ Subió | ↓ Bajó |
| **6M** | Gráfico de 6 meses | Tendencia (¿sube o baja?) |

**4. ACCIONES EN LÍNEA**

Cada gasto tiene botones:
```
┌─────────────────────────────────────┐
│  ✏️  🗑️                    │
│  20/10/24                     │
│  Nómina Octubre - 2.000€    │
└─────────────────────────────────────┘
```
- **✏️ Lápiz** → Editar este gasto
- **🗑️ Papelera** → Borrar este gasto

---

### 🔹 SECCIÓN 4: Añadir Nuevo Gasto

```
┌───────────────────────────────────────┐
│  + AÑADIR GASTO                │
└───────────────────────────────────────┘
```

**Click en "+ AÑADIR GASTO"**

**PASO 1: Elige la categoría**
```
┌─────────────────────────────┐
│  Categoría: [Selecciona ▼]│
│  ┌─────────────────────┐   │
│  │ 👷 Personal        │   │
│  │ 🍕 Materia Prima   │   │
│  │ ⚙️ Operaciones     │   │
│  │ 💰 Financiero      │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**PASO 2: Rellena los datos**

**DATOS OBLIGATORIOS:**
```
┌─────────────────────────────┐
│  Fecha: 2024-10-20       │
│  Importe: [€]             │
│  Proveedor: [Escribe...]   │
└─────────────────────────────┘
```

**DATOS ADICIONALES (si quieres):**
```
☑ Modo Fiscal (Desglosar IVA/IRPF)
```
- Activa esto si es una factura con IVA
- Rellena:
  - Base Imponible: 500€
  - Tipo IVA: [4%] [10%] [21%]
  - El sistema calcula solo

**PASO 3: Guardar**
```
┌─────────────────────────────┐
│  [💾 GUARDAR GASTO]    │
└─────────────────────────────┘
```

---

### 🎯 RESUMEN - FLUJO DE GASTOS

**📅 FRECUENCIA RECOMENDADA:**
1. **Diaria** → Anota gastos pequeños (caja menuda)
2. **Semanal** → Revisa proveedores importantes
3. **Mensual** → Revisa nóminas, alquiler, etc.

**⚠️ CONSEJOS PRÁCTICOS:**
1. **Mantén al día**: Anota gastos con frecuencia
   - ✅ Anotar el mismo día que haces el gasto
   - ❈ No dejas para "final de mes" (se te olvidará)
2. **Sé específico**: Usa el campo "Proveedor"
   - ✅ "Frutería López - 120€ naranjas"
   - ❌ "120€" (¿De qué fue?)
3. **Revisa semáforo**: Mantén ratios en verde
   - Si Personal > 35% → "Tengo demasiado personal"
   - Si Materia Prima > 35% → "Mis márgenes son bajos"

---

### 🔹 SECCIÓN EXTRA: Exportar

```
┌─────────────────────────────┐
│  [📥 EXPORTAR]          │
└─────────────────────────────┘
```

**¿Para qué sirve?**
- Descargar un archivo con todos tus gastos
- Compatible con Excel
- Para enviar a tu asesor/gestor

**¿Cómo usarlo?**
1. Click en "📥 EXPORTAR"
2. Se descarga `gastos_2024-10.csv`
3. Abre con Excel o Google Sheets

---

## 3. GLOSARIO DE TÉRMINOS 📚

| Término | Explicación Simple | Ejemplo |
|---------|------------------|---------|
| **Facturación** | El dinero que entra por ventas | Vendiste 1.500€ hoy |
| **Gastos** | El dinero que sale (pagos) | Pagaste 500€ de alquiler |
| **Base Imponible** | El precio sin IVA | Un plato de 12€ puede tener 10€ base + 2€ IVA |
| **IVA** | Impuesto que se suma al precio | 10% o 21% según el producto |
| **Neto** | La cantidad real después de impuestos | Ingresos - Gastos = Beneficio Neto |
| **Ratio** | Porcentaje que representa algo sobre el total | Gastos 30% de las ventas = De cada 100€, 30€ son gastos |
| **CAPEX** | Inversiones (maquinaria, reformas) | Comprar un horno nuevo |
| **OPEX** | Gastos operativos (periódicos) | Alquiler, luz, nóminas |
| **MoM** | Month over Month (Mes sobre Mes) | Comparación con el mes anterior |
| **Proveedor** | Empresa/Persona que te vende cosas | Frutería, Suministros, Repuestos |
| **Caja Menuda** | Dinero en efectivo para gastos pequeños | comprar leche, pan, pequeños recados |

---

## ❓ PREGUNTAS FRECUENTES

**❓ ¿Qué pasa si me equivoco al introducir datos?**
✅ Puedes editar cualquier día o gasto
1. Click en el día/gasto
2. Modifica lo que necesites
3. Guarda

**❓ ¿Tengo que rellenar todos los campos?**
⚠️ Los **obligatorios** son:
   - Facturación: Base 10%, Base 21%
   - Gastos: Categoría, Importe
   El resto es opcional pero ayuda a tener mejor control

**❓ ¿Puedo borrar algo?**
✅ Sí, click en 🗑️ y confirma
⚠️ Ten cuidado: Los datos borrados no se pueden recuperar

**❓ ¿Cómo sé si mis gastos son razonables?**
✅ Revisa el **semáforo de ratios**:
- 🟢 VERDE (< 33%): Estás bien
- 🔴 ROJO (> 35%): Excesivo, necesitas reducir
- 🟡 AMARILLO (33-35%): En el límite, vigila

**❓ ¿Con qué frecuencia debo usar esto?**
✅ **Ideal:**
- **Facturación**: Todos los días al cerrar
- **Gastos**: Cada vez que pagues algo
- **Revisión**: 1 vez a la semana

---

## 💡 CONSEJOS FINALES

1. **La constancia es clave**: Dedica 5 minutos cada día
2. **No te compliques**: Usa las categorías por defecto
3. **Revisa los semáforos**: Te alertan de problemas
4. **Exporta tus datos**: Haz copia de seguridad mensual
5. **No dejes para luego**: La memoria falla, anota al momento

---

## 🆘 NECESITAS AYUDA?

Si tienes dudas:
1. Revisa esta guía
2. Prueba a explorar (no se rompe nada)
3. Si sigues perdido, contacta con soporte

---

**Versión**: 1.0  
**Última actualización**: Octubre 2024
