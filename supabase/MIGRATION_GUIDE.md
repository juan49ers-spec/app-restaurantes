# 🗄️ Migración de Base de Datos - Empleados

## Campos Agregados

Esta migración agrega los siguientes campos a la tabla `employees`:

1. **hourly_rate** - Coste por hora (EUR) - Default: 0.00
2. **monthly_base_salary** - Sueldo base mensual (EUR)
3. **contract_type** - Tipo de contrato: INDEFINIDO, TEMPORAL, PRACTICAS, AUTONOMO, OTRO - Default: INDEFINIDO
4. **contract_hours_weekly** - Horas semanales del contrato - Default: 40
5. **color_code** - Color para UI (formato hex) - Default: #3b82f6

## 📋 Pasos para Ejecutar la Migración

### Opción 1: Supabase Dashboard (Recomendado)

1. **Acceder al Dashboard:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **SQL Editor:**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New Query"

3. **Ejecutar la Migración:**
   - Copia el contenido de `supabase/migrations/20250218_add_employee_fields.sql`
   - Pégalo en el editor
   - Haz clic en "Run" o presiona `Ctrl+Enter`

4. **Verificar:**
   - Ve a "Table Editor" → "employees"
   - Verifica que las nuevas columnas aparezcan

### Opción 2: CLI de Supabase

Si tienes el CLI de Supabase instalado:

```bash
# Ejecutar la migración
supabase migration up

# O ejecutar directamente
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20250218_add_employee_fields.sql
```

### Opción 3: psql (Línea de Comandos)

```bash
# Conectar a la base de datos
psql -h db.xxx.supabase.co -U postgres -d postgres

# Ingresar password cuando se solicite

# Copiar y pegar el contenido de la migración
```

## ✅ Verificación

Después de ejecutar la migración, verifica que todo funcionó correctamente:

```sql
-- Verificar las columnas nuevas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('hourly_rate', 'monthly_base_salary', 'contract_type', 'contract_hours_weekly', 'color_code')
ORDER BY ordinal_position;
```

Deberías ver las 5 columnas con sus tipos de datos correctos.

## 🔄 Rollback (Si algo sale mal)

Si necesitas revertir los cambios:

```sql
-- Eliminar las columnas
ALTER TABLE employees DROP COLUMN IF EXISTS hourly_rate;
ALTER TABLE employees DROP COLUMN IF EXISTS monthly_base_salary;
ALTER TABLE employees DROP COLUMN IF EXISTS contract_type;
ALTER TABLE employees DROP COLUMN IF EXISTS contract_hours_weekly;
ALTER TABLE employees DROP COLUMN IF EXISTS color_code;

-- Eliminar los índices
DROP INDEX IF EXISTS idx_employees_contract_type;
DROP INDEX IF EXISTS idx_employees_is_active;
```

## 📝 Notas

- Los campos opcionales (`monthly_base_salary`, `phone`, `email`, etc.) pueden ser NULL
- Los campos con default se llenarán automáticamente para empleados existentes
- Los índices mejoran el rendimiento de consultas frecuentes
- Los comentarios (COMMENTS) ayudan en la documentación de la base de datos

## 🚀 Después de la Migración

Una vez ejecutada la migración:

1. **Recargar la aplicación** (Ctrl+Shift+R)
2. **Probar crear un nuevo empleado**
3. **Probar editar un empleado existente**
4. **Verificar que los campos se guarden correctamente**

¿Necesitas ayuda para ejecutar esta migración?
