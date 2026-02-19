# Conexión Supabase - Instrucciones de Implementación

## 🚀 Resumen

Se ha creado la infraestructura completa para conectar el módulo RESULTADOS con Supabase.

## 📋 Archivos Creados

### 1. Base de Datos
- **Migración SQL**: `migrations/20250212_monthly_results_module.sql`
  - Tabla `operating_expenses` - Gastos operativos
  - Tabla `monthly_results` - Snapshots mensuales
  - Funciones RPC: `calculate_monthly_results()`, `close_month()`
  - RLS (Row Level Security) configurado
  - Índices optimizados

### 2. Server Actions
- **Acciones**: `src/app/actions/resultados.ts`
  - CRUD de gastos
  - Cálculo de resultados
  - Cierre de mes
  - Dashboard data unificada

### 3. Tipos TypeScript
- **Tipos**: `src/types/resultados.ts` (actualizado)
  - `MonthlyResult` - Estructura completa
  - `OperatingExpense` - Gastos operativos

### 4. UI Components
- **Skeleton**: `src/components/financial-control/ResultadosSkeleton.tsx`
  - Estado de carga profesional

## 🔧 Pasos para Implementar

### Paso 1: Ejecutar Migración SQL

```bash
# Conectar a Supabase CLI
supabase login

# Ejecutar migración
supabase db push

# O ejecutar SQL manualmente en el SQL Editor de Supabase
```

**Contenido de la migración**: `migrations/20250212_monthly_results_module.sql`

Esta migración crea:
- ✅ Tabla `operating_expenses` con todas las categorías
- ✅ Tabla `monthly_results` con 30+ campos
- ✅ Funciones RPC para cálculos automáticos
- ✅ RLS para seguridad por restaurante
- ✅ Índices optimizados para queries frecuentes

### Paso 2: Verificar Conexión

```typescript
// En el Dashboard, reemplazar MOCK_DATA por:

import { getResultsDashboardData } from "@/app/actions/resultados"

// En el componente:
const { data, error } = await getResultsDashboardData(
    restaurantId,
    year,
    month
)
```

### Paso 3: Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUJO DE DATOS                          │
└─────────────────────────────────────────────────────────────┘

1. USUARIO registra en FACTURACIÓN
   └─► sales_periods / sales_items

2. USUARIO registra en GASTOS  
   └─► operating_expenses

3. SISTEMA calcula automáticamente
   └─► calculate_monthly_results() [RPC]
   └─► Agrega ventas + gastos
   └─► Calcula ratios y break-even

4. USUARIO ve en RESULTADOS
   └─► Datos en tiempo real (calculados)
   └─► Histórico de 12 meses
   └─► Diagnósticos automáticos

5. USUARIO cierra mes
   └─► close_month() [RPC]
   └─► Guarda snapshot en monthly_results
   └─► Congela datos (is_closed = true)
```

## 📊 Estructura de Datos

### Tabla: operating_expenses

```sql
- id: uuid PK
- restaurant_id: uuid FK
- expense_date: date
- month_year: text (YYYY-MM)
- category: enum
  * personal
  * materia_prima
  * suministros
  * mantenimiento
  * marketing
  * gastos_varios
  * inversiones
  * financiaciones
- description: text
- amount: numeric
- provider: text
- invoice_number: text
- details: jsonb
```

### Tabla: monthly_results

```sql
- Campos de identificación (id, restaurant_id, month_year, etc.)
- Ingresos (ingresos_netos, ingresos_extra, total_ingresos)
- Personal desglosado (sueldos, SS, IRPF)
- Materia Prima desglosada (comida, bebida, variación)
- Otros gastos (suministros, mantenimiento, marketing)
- Inversiones y financiaciones
- Resultados (bruto, neto, margen %)
- Ratios (personal %, materia %, gastos fijos %)
- Break-even (punto, día, alcanzado)
- Comparativas (vs mes ant., vs año ant.)
- Metadatos (is_closed, closed_at, notas)
```

## 🎯 Server Actions Disponibles

### Gestión de Gastos
```typescript
getOperatingExpenses(restaurantId, monthYear)
createOperatingExpense(expense)
updateOperatingExpense(id, updates)
deleteOperatingExpense(id)
```

### Resultados
```typescript
getMonthlyResult(restaurantId, year, month)
getMonthlyResultsHistory(restaurantId, limit)
calculateMonthlyResults(restaurantId, year, month) // Tiempo real
closeMonth(restaurantId, year, month) // Guardar snapshot
isMonthClosed(restaurantId, year, month)
```

### Dashboard Unificado
```typescript
getResultsDashboardData(restaurantId, year, month)
// Retorna: { currentMonth, history, expenses, isClosed }
```

### Análisis
```typescript
getExpensesByCategory(restaurantId, monthYear)
getYearlyComparison(restaurantId, year)
```

## 🔒 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS activado. Un usuario solo puede:
- Ver datos de sus restaurantes
- Modificar sus propios datos
- No acceder a datos de otros usuarios

### Políticas

```sql
-- Ejemplo de política
CREATE POLICY "Users can view their own results" 
ON monthly_results FOR SELECT 
USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
))
```

## 🧮 Funciones RPC

### calculate_monthly_results()
Calcula resultados agregando datos de:
- `sales_periods` / `sales_items` (ingresos)
- `operating_expenses` (gastos)

Retorna un objeto `monthly_results` completo.

### close_month()
Guarda un snapshot calculado en `monthly_results`:
- Ejecuta `calculate_monthly_results()`
- Marca `is_closed = true`
- Guarda `closed_at` y `closed_by`
- Inserta o actualiza registro

## 📈 Queries Optimizadas

### Índices Creados

```sql
-- Para búsquedas por restaurante y mes
CREATE INDEX idx_expenses_restaurant_month 
ON operating_expenses(restaurant_id, month_year);

-- Para histórico ordenado
CREATE INDEX idx_results_restaurant_year_month 
ON monthly_results(restaurant_id, year, month);

-- Para verificar si mes está cerrado
CREATE INDEX idx_results_closed 
ON monthly_results(restaurant_id, month_year, is_closed);
```

## 🔄 Flujo de Trabajo Recomendado

### 1. Configuración Inicial
```bash
# 1. Ejecutar migración SQL
supabase db push

# 2. Verificar tablas creadas
supabase db dump --data-only
```

### 2. Uso Diario
```typescript
// Registrar gasto
await createOperatingExpense({
    restaurant_id: "uuid",
    expense_date: "2026-01-15",
    month_year: "2026-01",
    category: "materia_prima",
    amount: 5000,
    description: "Compra proveedor X"
})

// Ver resultados actuales (calculados en tiempo real)
const { data } = await calculateMonthlyResults(restaurantId, 2026, 1)

// Cerrar mes al finalizar
await closeMonth(restaurantId, 2026, 1)
```

### 3. Consultas Frecuentes

**Obtener últimos 12 meses:**
```sql
SELECT * FROM monthly_results 
WHERE restaurant_id = 'uuid' 
ORDER BY year DESC, month DESC 
LIMIT 12;
```

**Comparativa año vs año:**
```sql
SELECT 
    month_name,
    total_ingresos as actual,
    LAG(total_ingresos) OVER (ORDER BY year, month) as anterior
FROM monthly_results 
WHERE restaurant_id = 'uuid' 
AND year IN (2025, 2026);
```

**Gastos por categoría:**
```sql
SELECT 
    category,
    SUM(amount) as total
FROM operating_expenses 
WHERE restaurant_id = 'uuid' 
AND month_year = '2026-01'
GROUP BY category;
```

## 🚨 Troubleshooting

### Error: "No se encuentra la función RPC"
```bash
# Verificar que las funciones existen
supabase db dump --schema-only | grep "FUNCTION"

# Recrear funciones si es necesario
supabase db reset
```

### Error: "RLS Policy violation"
```bash
# Verificar políticas
supabase db dump --schema-only | grep "POLICY"

# Desactivar RLS temporalmente para debugging (NO EN PROD)
ALTER TABLE monthly_results DISABLE ROW LEVEL SECURITY;
```

### Error: "Columna no existe"
```bash
# Verificar estructura de tabla
supabase db dump --schema-only | grep -A 20 "CREATE TABLE monthly_results"

# Aplicar migración faltante
supabase db push
```

## 📊 Monitoreo

### Queries para Admin

**Últimos meses cerrados:**
```sql
SELECT 
    restaurant_id,
    month_year,
    is_closed,
    closed_at
FROM monthly_results 
WHERE is_closed = true
ORDER BY closed_at DESC
LIMIT 10;
```

**Restaurantes sin datos:**
```sql
SELECT r.id, r.name
FROM restaurants r
LEFT JOIN monthly_results mr ON mr.restaurant_id = r.id
WHERE mr.id IS NULL;
```

**Errores de cálculo:**
```sql
SELECT *
FROM monthly_results
WHERE resultado_neto != (total_ingresos - personal_total - materia_prima_total - suministros - mantenimiento - marketing - gastos_extra - inversiones - financiaciones);
```

## 🎯 Próximos Pasos

1. **Ejecutar migración SQL** en Supabase
2. **Actualizar ResultadosDashboard** para usar `getResultsDashboardData()`
3. **Crear formulario** para registrar gastos en `operating_expenses`
4. **Implementar cierre de mes** con el botón "Cerrar Mes"
5. **Añadir tests** para las funciones RPC

## 📞 Soporte

Si hay problemas con la conexión:
1. Verificar variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. Revisar logs de Supabase
3. Comprobar que las migraciones se aplicaron correctamente

---

**Fecha de creación**: Febrero 2026  
**Autor**: Claude Code (Anthropic)  
**Versión**: 1.0.0
