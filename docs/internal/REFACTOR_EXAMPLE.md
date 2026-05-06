# EJEMPLO DE REFACTORIZACIÓN SEGURA

## Problema Detectado: `dashboard.ts` tiene números mágicos

### ANTES (Código con ofuscación):
```typescript
// Línea 131: ¿Por qué 1.2?
amount = avgDaily * (isWeekend ? 1.2 : 1.0)

// Línea 101: ¿Por qué 50?
const inflationImpact = priceSpikeAlerts.length * 50
```

### PASO 1: Crear archivo de constantes (BAJO RIESGO)

**Archivo:** `src/lib/financial-constants.ts`
```typescript
/**
 * Factores de ajuste para proyecciones financieras
 * Basado en análisis históricos de ventas
 */

export const PROJECTION_FACTORS = {
    WEEKEND_MULTIPLIER: 1.2,  // +20% en fines de semana
    WEEKDAY_MULTIPLIER: 1.0,   // Sin ajuste
} as const

export const INFLATION_ESTIMATES = {
    PER_ALERT_IMPACT_EUR: 50,  // Estimado: cada alerta = €50 impacto
} as const

export const EXPENSE_RATIOS = {
    DEFAULT_COGS_PCT: 0.30,     // 30% para Coste de Bienes
    DEFAULT_LABOR_PCT: 0.35,   // 35% para Personal
    DEFAULT_FIXED_PCT: 0.35,     // 35% para Gastos Fijos
} as const
```

### PASO 2: Smoke test ANTES del cambio

```bash
# Ejecutar para verificar que funciona antes
node scripts/smoke-test.js
```

### PASO 3: Cambiar el código (UNO A LA VEZ)

```typescript
// ANTES
amount = avgDaily * (isWeekend ? 1.2 : 1.0)

// DESPUÉS
import { PROJECTION_FACTORS } from '@/lib/financial-constants'
amount = avgDaily * (isWeekend ? PROJECTION_FACTORS.WEEKEND_MULTIPLIER : PROJECTION_FACTORS.WEEKDAY_MULTIPLIER)
```

### PASO 4: Verificar después del cambio

```bash
# Ejecutar smoke test
node scripts/smoke-test.js

# Typecheck
npm run typecheck

# Build
npm run build
```

### PASO 5: Probar manualmente

1. Abrir dashboard
2. Verificar que los números se ven iguales
3. Revisar consola por errores

### PASO 6: Commit si todo OK

```bash
git add .
git commit -m "refactor(constants): extract magic numbers to named constants"
```

---

## Problema: Función demasiado larga

### Función: `getExpenseDashboardData()` en `financial-control.ts`

### ESTRATEGIA: Extraer subfunciones pequeñas

#### ANTES:
```typescript
export async function getExpenseDashboardData(...) {
    // 580 líneas de código...
}
```

#### DESPUÉS (por fases):

**Fase 1: Extraer helper para agrupar gastos**
```typescript
/**
 * Agrupa gastos por categoría
 */
function groupExpensesByCategory(expenses: OperatingExpense[]) {
    const groups: Record<string, OperatingExpense[]> = {}
    expenses.forEach(exp => {
        if (!groups[exp.category]) {
            groups[exp.category] = []
        }
        groups[exp.category].push(exp)
    })
    return groups
}

// En la función principal:
const currentGroups = groupExpensesByCategory(currentExpenses)
const prevGroups = groupExpensesByCategory(prevExpenses)
```

**Fase 2: Extraer cálculo de ratios**
```typescript
/**
 * Calcula ratios de Personal y COGS respecto a ventas
 */
function calculateRatios(
    categoryTotals: CategoryTotal[],
    totalNetSales: number
) {
    const personalCategories = ['NOMINAS_LIQUAS', 'SEGURIDAD_SOCIAL', 'EN_MANO_PERSONAL']
    const cogsCategories = ['PROVEEDORES_COMIDA', 'PROVEEDORES_BEBIDA', 'VARIACION_EXISTENCIAS']

    const personalTotal = categoryTotals
        .filter(cat => personalCategories.includes(cat.category))
        .reduce((sum, cat) => sum + cat.amount, 0)
    
    const cogsTotal = categoryTotals
        .filter(cat => cogsCategories.includes(cat.category))
        .reduce((sum, cat) => sum + cat.amount, 0)

    return {
        personalRatio: totalNetSales > 0 ? (personalTotal / totalNetSales) * 100 : 0,
        cogsRatio: totalNetSales > 0 ? (cogsTotal / totalNetSales) * 100 : 0,
        personalTotal,
        cogsTotal
    }
}
```

**Fase 3: Verificar cada extracción**
```bash
# Después de cada extracción:
npm run typecheck
npm run build
```

---

## Test de Comparación (Opcional pero Recomendado)

```typescript
/**
 * EJEMPLO: Validar que refactorización no cambió resultados
 */
import { captureBeforeSnapshot, compareWithSnapshot } from '@/scripts/refactor-safety-check'

// 1. ANTES de refactorizar: Descomentar para capturar
// captureBeforeSnapshot('getExpenseDashboardData', { restaurantId, currentMonth }, result)

// 2. DESPUÉS de refactorizar: Descomentar para comparar
// const matches = compareWithSnapshot('getExpenseDashboardData', newResult)
// if (matches === false) {
//     console.error('Refactorización cambió comportamiento')
//     throw new Error('Invalid refactor')
// }
```

---

## Resumen del Plan de Refactorización

### 🟢 Prioridad ALTA (Bajo Riesgo)
1. ✅ Extraer constantes para números mágicos
2. ✅ Renombrar variables confusas (`d`, `cat`, `s`)
3. ✅ Extraer funciones helper pequeñas

### 🟡 Prioridad MEDIA (Medio Riesgo)
4. Dividir funciones largas en subfunciones
5. Remover duplicación de código
6. Añadir tipos donde hay `any`

### 🔴 Prioridad BAJA (Alto Riesgo - Para después)
7. Reestructurar componentes monolíticos
8. Cambiar arquitectura de estado
9. Optimizaciones de performance

---

## ¿Empezamos con los de 🟢 Prioridad ALTA?

Estos cambios:
- ✅ Son reversibles (git revert)
- ✅ No cambian lógica, solo nombres
- ✅ Mejoran legibilidad
- ✅ Se pueden probar fácilmente

¿Procedemos?
