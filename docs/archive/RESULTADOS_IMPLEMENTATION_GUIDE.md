# MÓDULO RESULTADOS - GUÍA DE IMPLEMENTACIÓN

## 📋 RESUMEN

Este módulo implementa un sistema completo de **RESULTADOS FINANCIEROS** para un restaurante con:

- **Cuenta de Resultados Inteligente** con benchmarks y comparativas
- **Desarrollo de Negocio Pro** con predicciones y análisis YoY
- **Motor de Diagnóstico** con 5 reglas de negocio automáticas
- **Conexión completa a Supabase** con persistencia de datos
- **Sistema de Cierre de Mes** con snapshot automático

---

## ✅ ESTADO ACTUAL

### COMPLETADO
- ✅ Arquitectura del módulo implementada
- ✅ Componentes Pro optimizados
- ✅ Motor de diagnóstico funcional
- ✅ Schema de base de datos creado
- ✅ Server actions implementados
- ✅ TypeScript types definidos
- ✅ Scripts de migración preparados
- ✅ Documentación completa
- ✅ Commits guardados en git

### PRÓXIMOS PASOS
1. ⏳ **Ejecutar migración SQL** en Supabase (manual)
2. ⏳ **Insertar datos de prueba** (manual)
3. ⏳ **Conectar frontend** a datos reales (actualizar ResultadosDashboard)
4. ⏳ **Probar funcionalidad** (cerrar mes, ver resultados)

---

## 🚀 PASO 1: EJECUTAR MIGRACIÓN SQL

### Opción A: Usar el script de Bash (Linux/Mac)

```bash
./scripts/run-migration.sh
```

### Opción B: Manual en Supabase

1. Abre tu panel de Supabase: `https://tmacnsrtrfwbcqcpizcl.supabase.co`

2. En el menú lateral, ve a **SQL Editor**

3. Copia TODO el contenido de: `migrations/MIGRACION_COMPLETA_SQL.sql`

4. Pega el contenido en el SQL Editor

5. Ejecuta el SQL (botón **Run** o **Ctrl+Enter**)

6. Verifica que se creen:
   - ✅ Tablas: `operating_expenses`, `monthly_results`
   - ✅ Funciones: `calculate_monthly_results`, `close_month`, `update_updated_at_column`
   - ✅ Índices y RLS policies

### Opción C: Usar el script de TypeScript

```bash
pnpm exec ts-node scripts/test-migration.ts
```

**Nota**: Este script verificará que la migración se ejecutó correctamente.

---

## 📊 PASO 2: INSERTAR DATOS DE PRUEBA

### 1. Obtener tu Restaurant ID

Ejecuta este query en el SQL Editor de Supabase:

```sql
SELECT id FROM restaurants LIMIT 1;
```

Guarda el ID de tu restaurante (por ejemplo: `a1b2c3d4-...`)

### 2. Insertar Gastos de Prueba

```sql
-- Personal
INSERT INTO operating_expenses (restaurant_id, expense_date, month_year, category, amount, description) VALUES
('TU_RESTAURANT_ID', '2026-01-15', '2026-01', 'personal', 12000, 'Sueldos enero'),
('TU_RESTAURANT_ID', '2026-01-15', '2026-01', 'personal', 3000, 'Comisiones'),
('TU_RESTAURANT_ID', '2026-01-15', '2026-01', 'personal', 1500, 'Seguridad social'),

-- Materia Prima
('TU_RESTAURANT_ID', '2026-01-10', '2026-01', 'materia_prima', 9500, 'Compra proveedor A'),
('TU_RESTAURANT_ID', '2026-01-05', '2026-01', 'materia_prima', 4200, 'Bebidas proveedor B'),
('TU_RESTAURANT_ID', '2026-01-08', '2026-01', 'materia_prima', 2800, 'Despensa A');

-- Suministros
('TU_RESTAURANT_ID', '2026-01-20', '2026-01', 'suministros', 1800, 'Factura eléctrica'),
('TU_RESTAURANT_ID', '2026-01-22', '2026-01', 'suministros', 650, 'Suministros limpieza'),
('TU_RESTAURANT_ID', '2026-01-25', '2026-01', 'suministros', 420, 'Papel y oficina');

-- Mantenimiento
('TU_RESTAURANT_ID', '2026-01-12', '2026-01', 'mantenimiento', 1200, 'Reparación nevera'),
('TU_RESTAURANT_ID', '2026-01-14', '2026-01', 'mantenimiento', 800, 'Mantenimiento aire acondicionado');

-- Marketing
('TU_RESTAURANT_ID', '2026-01-18', '2026-01', 'marketing', 1500, 'Publicidad Facebook'),
('TU_RESTAURANT_ID', '2026-01-19', '2026-01', 'marketing', 900, 'Impresión flyers');
```

### 3. Cerrar Mes

```sql
SELECT close_month('TU_RESTAURANT_ID', 2026, 1);
```

### 4. Verificar Resultados

```sql
SELECT * FROM monthly_results WHERE restaurant_id = 'TU_RESTAURANT_ID' AND month_year = '2026-01';
```

---

## 🧪 PASO 3: PROBAR LA CONEXIÓN

### Test 1: Verificar tablas y funciones

```sql
-- Verificar tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('operating_expenses', 'monthly_results');

-- Verificar funciones
SELECT proname FROM pg_proc WHERE proname IN ('calculate_monthly_results', 'close_month');

-- Verificar índices
SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('operating_expenses', 'monthly_results');

-- Verificar policies
SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('operating_expenses', 'monthly_results');
```

### Test 2: Calcular resultados

```sql
SELECT * FROM calculate_monthly_results('TU_RESTAURANT_ID', 2026, 1);
```

### Test 3: Cerrar mes

```sql
SELECT * FROM close_month('TU_RESTAURANT_ID', 2026, 1);
```

---

## 💻 PASO 4: CONECTAR EL FRONTEND

### Actualizar ResultadosDashboard

1. Abre `src/components/financial-control/ResultadosDashboard.tsx`

2. Reemplaza el MOCK_DATA con el hook `useResultsDashboardData`

```typescript
// Importar
import { useResultsDashboardData } from "@/app/actions/resultados"

// Usar
const { data: dashboardData, error, isLoading } = useResultsDashboardData(
    restaurantId,
    currentYear,
    currentMonth
)
```

### Crear Server Component wrapper

Crea `src/app/financial-control/resultados/page.tsx`:

```typescript
import { ResultadosDashboard } from "@/components/financial-control/ResultadosDashboard"
import { getUserRestaurant } from "@/app/actions/utils"
import { redirect } from "next/navigation"

export default async function ResultadosPage() {
    const restaurantId = await getUserRestaurant()

    if (!restaurantId) {
        redirect("/login")
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    return (
        <ResultadosDashboard
            restaurantId={restaurantId}
            year={currentYear}
            month={currentMonth}
        />
    )
}
```

---

## 🎯 PASO 5: PROBAR LA APLICACIÓN

### 1. Arrancar el servidor

```bash
pnpm dev
```

### 2. Acceder a la página

Ve a: `http://localhost:3000/financial-control/resultados`

### 3. Probar funcionalidades

- ✅ Ver cuenta de resultados con datos reales
- ✅ Ver desarrollo de negocio con predicciones
- ✅ Ver diagnóstico inteligente
- ✅ Cerrar mes (si tienes datos suficientes)
- ✅ Ver histórico de resultados

---

## 📁 ARCHIVOS CRÍTICOS

### Componentes
```
src/components/financial-control/
├── ResultadosDashboard.tsx          # Dashboard principal
├── CuentaResultados.tsx             # Pro version
├── DesarrolloNegocio.tsx            # Pro version
├── ResultadosSkeleton.tsx           # Loading state
└── (otros componentes)
```

### Servidor Actions
```
src/app/actions/
├── resultados.ts                    # 12 funciones de datos
└── utils.ts                         # getUserRestaurant()
```

### Tipos
```
src/types/
└── resultados.ts                    # MonthlyResult, OperatingExpense
```

### Base de Datos
```
migrations/
└── MIGRACION_COMPLETA_SQL.sql       # Schema completo + datos de prueba
```

### Documentación
```
DOCUMENTACION_RESULTADOS.md          # Detalles técnicos
SUPABASE_SETUP.md                    # Guía de instalación
MIGRACION_COMPLETA_SQL.sql           # Migración SQL
```

---

## 🔧 COMANDOS ÚTILES

### Verificar conexión
```bash
pnpm exec ts-node scripts/test-migration.ts
```

### Revisar tablas en Supabase
```sql
-- Ver tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Ver datos
SELECT * FROM operating_expenses LIMIT 10;
SELECT * FROM monthly_results LIMIT 10;
```

### Test RPC functions
```sql
-- Calcular resultados
SELECT calculate_monthly_results('TU_RESTAURANT_ID', 2026, 1);

-- Cerrar mes
SELECT close_month('TU_RESTAURANT_ID', 2026, 1);
```

---

## ⚠️ IMPORTANTE

### Security
- ✅ RLS policies están activadas
- ✅ Solo el owner del restaurante puede acceder a sus datos
- ✅ RPC functions tienen `security definer`

### Errores Comunes

| Error | Solución |
|-------|----------|
| `Function exec_sql does not exist` | Ejecuta la migración SQL manualmente |
| `Relation "operating_expenses" does not exist` | No ejecutaste la migración |
| `Authentication failed` | Asegúrate de estar logueado en la app |

---

## 📞 PRÓXIMOS PASOS

1. **Ejecutar la migración** usando el script o manualmente
2. **Insertar datos de prueba** con tu Restaurant ID
3. **Probar la conexión** con los queries de test
4. **Conectar el frontend** usando `useResultsDashboardData`
5. **Probar todas las funcionalidades** en la UI
6. **Optimizar según necesidades** (agregar más gastos, ajustar categorías)

---

## 📖 DOCUMENTACIÓN ADICIONAL

- **`DOCUMENTACION_RESULTADOS.md`**: Detalles técnicos del módulo
- **`SUPABASE_SETUP.md`**: Guía completa de instalación
- **`MIGRACION_COMPLETA_SQL.sql`**: Schema completo

---

**¿Listo para continuar?** 🚀

Sigue el paso 1: Ejecuta la migración SQL en tu panel de Supabase.
