# 🔧 Solución: Coste por Hora no Reconocido en Turnos

## Problema

Al crear o editar turnos en el configurador de horarios, el **coste estimado aparece como 0.00€** y muestra una advertencia: **"Sin coste/hora configurado"**.

## Causa

Este problema ocurre porque el campo `hourly_rate` (coste por hora) no existe en la base de datos o los empleados tienen este campo en 0.

## Solución Paso a Paso

### Paso 1: Ejecutar la Migración SQL

1. **Ve a Supabase:** https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **SQL Editor** → **New Query**
4. **Copia y pega este SQL:**

```sql
-- Add hourly_rate column (cost per hour for the company)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0.00;

-- Add monthly_base_salary column (base monthly salary)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS monthly_base_salary NUMERIC(12, 2);

-- Add contract_type column (type of employment contract)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'INDEFINIDO'
CHECK (contract_type IN ('INDEFINIDO', 'TEMPORAL', 'PRACTICAS', 'AUTONOMO', 'OTRO'));

-- Add contract_hours_weekly column (weekly contract hours)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS contract_hours_weekly INTEGER DEFAULT 40;

-- Add color_code column (for UI/display purposes)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS color_code VARCHAR(7) DEFAULT '#3b82f6';
```

5. **Click en "Run"**

### Paso 2: Actualizar los Empleados con sus Costes

Después de ejecutar la migración, necesitas asignar el coste por hora a cada empleado:

1. **Ve a:** Personal → Empleados
2. **Haz clic en un empleado**
3. **Edita el campo "Coste/Hora (Empresa)"**
4. **Ejemplo de costes:**
   - Camarero: 12.50 €/hora
   - Cocinero: 15.00 €/hora
   - Jefe de Cocina: 18.00 €/hora
   - Ayudante: 10.50 €/hora

5. **Guarda los cambios**

### Paso 3: Verificar

1. **Ve a:** Personal → Horarios
2. **Crea un nuevo turno**
3. **Selecciona el empleado**
4. **Verifica que el coste se calcula correctamente**

## Resultado Esperado

Después de seguir estos pasos:
- ✅ El coste por hora se calculará automáticamente
- ✅ La "Inversión Estimada" mostrará el valor correcto
- ✅ Ya no aparecerá la advertencia

## Ejemplo Práctico

### Datos de Turno:
- **Empleado:** Juan Pérez (Cocinero)
- **Coste/Hora:** 15.00 €
- **Horario:** 09:00 - 17:00 (8 horas)
- **Descanso:** 60 minutos

### Cálculo:
```
Horas totales: 8 horas
Descanso: 1 hora
Horas trabajadas: 7 horas

Coste = 7 horas × 15.00 €/hora = 105.00 €
```

## ¿Necesitas Ayuda?

Si después de ejecutar la migración sigues teniendo problemas:

1. **Verifica que la migración se ejecutó correctamente:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'employees'
     AND column_name = 'hourly_rate';
   ```

2. **Recarga la aplicación:** Ctrl+Shift+R

3. **Limpia la caché del navegador**

## Documentación Relacionada

- `supabase/migrations/20250218_add_employee_fields.sql` - Script de migración
- `supabase/MIGRATION_GUIDE.md` - Guía detallada de migración
- `docs/employee-fix-session.md` - Documentación de la sesión de corrección
