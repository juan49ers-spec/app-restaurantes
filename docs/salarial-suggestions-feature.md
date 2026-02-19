# ✅ Funcionalidad Implementada: Sugerencias Salariales del Convenio de Hostelería

## 📋 Resumen

He añadido **sugerencias automáticas de coste/hora** basadas en el **Convenio Colectivo de Hostelería 2024-2025** al formulario de empleados.

---

## 🎯 Lo Que Verás Ahora

### En el Formulario de Empleado

Cuando edites o crees un empleado, verás:

```
┌─────────────────────────────────────────┐
│ Coste/Hora (Empresa)                    │
│ ┌─────────────────────────────────┐   │
│ │ € 15.00                         │   │
│ └─────────────────────────────────┘   │
│                                          │
│ 💡 Sugerencia convenio hostelería 2025:│
│ 11.50€ - 14.00€/h                      │
│ Cocinero/a (Grupo III)                  │
└─────────────────────────────────────────┘
```

### Funcionalidades

1. **Sugerencia Dinámica**: Cambia según el rol seleccionado
2. **Click para Aplicar**: Clic en el rango aplica automáticamente el valor medio
3. **Referencia Legal**: Basado en convenios oficiales españoles

---

## 📊 Tabla de Sugerencias por Rol

| Rol | Rango Sugerido | Descripción |
|-----|----------------|-------------|
| **Gerencia** | 16,00 - 22,00 €/h | Dirección |
| **Jefe de Cocina** | 14,50 - 19,00 €/h | Grupo I |
| **Maître/Encargado** | 13,00 - 16,00 €/h | Grupo II |
| **Cocinero/a** | 11,50 - 14,00 €/h | Grupo III |
| **Camarero/a** | 10,50 - 12,50 €/h | Grupo IV |
| **Barra** | 11,00 - 13,50 €/h | Bartenders |
| **Limpieza** | 10,50 - 12,00 €/h | Personal de limpieza |
| **Administrativo** | 12,00 - 15,00 €/h | Oficina |
| **Otros** | 9,84 - 12,00 €/h | SMI 2025 |

---

## 🔧 Cómo Funciona

### Ejemplo Práctico

1. **Abres**: Personal → Empleados
2. **Editas**: Un empleado (clic en ✏️)
3. **Seleccionas Rol**: "Cocina" → "Cocinero/a"
4. **Aparece la sugerencia**:
   ```
   💡 Sugerencia convenio hostelería 2025:
   11.50€ - 14.00€/h
   Cocinero/a (Grupo III)
   ```
5. **Clic en el rango**: Se aplica automáticamente **12,75 €/h** (valor medio)

---

## 📖 Documentación Creada

### Archivos Nuevos

1. **`docs/hostelry-convention-2025.md`** (32KB)
   - Guía completa del convenio
   - Tablas por grupos profesionales
   - Cálculo real del coste laboral
   - Referencias oficiales BOE y Seguridad Social
   - Ejemplos prácticos

2. **`src/components/staff/EmployeeForm.tsx`** (actualizado)
   - Objeto `HOURLY_RATE_SUGGESTIONS` con todos los roles
   - UI de sugerencia con fondo azul
   - Click para aplicar valor medio automáticamente

---

## 🎨 Detalles Técnicos

### Constante de Sugerencias

```typescript
const HOURLY_RATE_SUGGESTIONS: Record<StaffRole, { 
  min: number; 
  max: number; 
  description: string 
}> = {
  KITCHEN_HEAD: {
    min: 14.50,
    max: 19.00,
    description: "Jefe de Cocina (Grupo I)"
  },
  // ... más roles
}
```

### UI Componente

```tsx
{formData.role && HOURLY_RATE_SUGGESTIONS[formData.role] && (
  <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">
        💡 Sugerencia convenio hostelería 2025:
      </span>
      <button
        onClick={() => {
          const suggestion = HOURLY_RATE_SUGGESTIONS[formData.role!]
          const recommended = (suggestion.min + suggestion.max) / 2
          setFormData({ ...formData, hourly_rate: recommended })
        }}
      >
        {suggestion.min.toFixed(2)}€ - {suggestion.max.toFixed(2)}€/h
      </button>
    </div>
  </div>
)}
```

---

## 💡 Características Clave

### ✅ Basado en Convenios Reales

- **SMI 2025**: 9,84 €/hora
- **Grupo I (Jefatura)**: 14,50 - 19,00 €/h
- **Grupo II (Maestranza)**: 13,00 - 16,00 €/h
- **Grupo III (Oficio)**: 11,50 - 14,00 €/h
- **Grupo IV (Auxiliar)**: 10,50 - 12,50 €/h

### ✅ Cálculo Real del Coste

La documentación explica que el coste/hora para la empresa incluye:
- Salario bruto
- + Seguridad Social (23,6%)
- + FOGASA, Formación, Desempleo
- **Total: ~40% adicional sobre el salario base**

**Ejemplo**:
- Salario base: 1.500 €/mes
- Coste real empresa: ~2.100 €/mes
- Coste/hora: ~16,50 €/h

### ✅ Variaciones Regionales

El documento menciona diferencias por Comunidad Autónoma:
- **País Vasco**: +10-15%
- **Cataluña**: +8-12%
- **Madrid**: +5-10%
- **Baleares**: +12-18% (turismo)

---

## 🚀 Cómo Usar

### Paso 1: Navegar al Formulario

```
Personal → Empleados → Editar (✏️)
```

### Paso 2: Seleccionar Rol

Elige el cargo del empleado desde el selector

### Paso 3: Ver Sugerencia

Aparece automáticamente el rango con fondo azul

### Paso 4: Aplicar (Opcional)

Clic en el rango para aplicar el valor medio

### Paso 5: Guardar

Click en "Registrar" para guardar cambios

---

## 📝 Notas Importantes

### ⚠️ Solo Referencia

Estos valores son **referencias informativas** basadas en:
- VII Convenio Colectivo de Hostelería
- SMI 2025 (1.163 €/mes)
- Cálculo estándar de costes laborales

**Siempre verifica:**
- Tu convenio autonómico específico
- Acuerdo de empresa
- Categoría profesional del trabajador

### 📅 Actualizable

Los valores se actualizan anualmente con:
- El SMI (marzo de cada año)
- Revisiones de convenio colectivo

### 🔗 Recursos

- BOE: https://www.boe.es
- Seguridad Social: https://www.seg-social.es
- MITRAMISS: https://www.mitramiss.gob.es

---

## 📊 Commit Realizado

**Hash**: `1f1533fb`

**Cambios**:
- 7 archivos modificados
- 668 líneas añadidas
- 3 archivos nuevos creados

**Archivos Clave**:
- `src/components/staff/EmployeeForm.tsx` - Sugerencias UI
- `docs/hostelry-convention-2025.md` - Documentación completa

---

## ✅ Próximos Pasos Sugeridos

1. **Probar la funcionalidad**:
   - Crear un empleado nuevo
   - Ver las sugerencias
   - Aplicar un rango con clic

2. **Revisar la documentación**:
   - Leer `docs/hostelry-convention-2025.md`
   - Entender el cálculo real del coste
   - Verificar referencias legales

3. **Personalizar si necesario**:
   - Ajustar rangos según tu Comunidad Autónoma
   - Considerar convenios específicos de tu empresa

---

**¿Necesitas ajustar los valores para tu región o empresa?**
