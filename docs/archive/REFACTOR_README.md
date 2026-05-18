# 🛡️ GUÍA DE REFACTORIZACIÓN SEGURA

## 📋 Resumen

Esta guía y los scripts asociados aseguran que cualquier refactorización se haga de forma segura, sin romper la aplicación.

## 🎯 Problemas Detectados

1. ✅ **11 usos de `as any`** - Evitan validación de TypeScript
2. ✅ **Números mágicos** - Valores sin explicación (1.2, 50, 0.3, 0.35)
3. ✅ **Funciones muy largas** - 580 líneas en una función
4. ✅ **Variables con nombres confusos** - `d`, `cat`, `s`
5. ✅ **Lógica duplicada** - `groupExpenses()` repetido 3 veces

## 🛠️ Herramientas de Seguridad

### 1. Smoke Test (`npm run smoke-test`)
Verifica que la app esté funcionando:
- ✅ Archivos críticos existen
- ✅ Dependencias OK
- ✅ Schemas Zod válidos
- ✅ TypeScript compila
- ✅ Build funciona

**Ejecutar ANTES de cada cambio:**
```bash
npm run smoke-test
```

### 2. Pre/Post Refactor Scripts
```bash
npm run pre-refactor   # Smoke test antes
npm run post-refactor  # Smoke test + typecheck + build después
```

### 3. Comparación de Snapshots (Opcional)
Para refactorizaciones complejas, compara resultados antes/después:
```typescript
import { captureBeforeSnapshot, compareWithSnapshot } from '@/scripts/refactor-safety-check'

// ANTES
captureBeforeSnapshot('myFunction', input, result)

// DESPUÉS
const matches = compareWithSnapshot('myFunction', newResult)
if (!matches) throw new Error('Refactorización cambió comportamiento')
```

## 📝 Plan de Refactorización

### 🟢 FASE 1: Bajo Riesgo (RECOMENDADO empezar aquí)

**Cambios que NO modifican lógica, solo mejoran legibilidad:**

#### 1.1 Extraer constantes para números mágicos
```typescript
// ARCHIVO NUEVO: src/lib/financial-constants.ts
export const PROJECTION_FACTORS = {
    WEEKEND_MULTIPLIER: 1.2,
    WEEKDAY_MULTIPLIER: 1.0,
} as const

export const INFLATION_ESTIMATES = {
    PER_ALERT_IMPACT_EUR: 50,
} as const
```

#### 1.2 Renombrar variables confusas
```typescript
// ANTES
const d = new Date(start)
const cat = category

// DESPUÉS
const currentDate = new Date(start)
const expenseCategory = category
```

#### 1.3 Extraer funciones helper pequeñas
```typescript
// ANTES
const groups = {}
expenses.forEach(exp => {
    if (!groups[exp.category]) groups[exp.category] = []
    groups[exp.category].push(exp)
})

// DESPUÉS
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
```

**Proceso para cada cambio:**
1. `npm run smoke-test` (verificar que funciona antes)
2. Hacer el cambio
3. `npm run post-refactor` (verificar que funciona después)
4. Probar manualmente la funcionalidad afectada
5. Commit si todo OK: `git commit -m "refactor(constants): extract magic numbers"`

### 🟡 FASE 2: Riesgo Medio (Solo después de Fase 1)

**Cambios que reorganizan código pero mantienen comportamiento:**

#### 2.1 Dividir funciones largas
Extraer subfunciones que devuelvan valores puros (sin efectos secundarios).

#### 2.2 Eliminar duplicación
Mover `groupExpenses()` a un archivo compartido.

#### 2.3 Reemplazar `as any` con tipos apropiados
```typescript
// ANTES
resolver: zodResolver(MonthlyTargetSchema) as any

// DESPUÉS
// Arreglar el schema o usar el tipo correcto
```

### 🔴 FASE 3: Alto Riesgo (Para más adelante)

**Cambios que afectan arquitectura:**
- Reestructurar componentes monolíticos
- Cambiar gestión de estado
- Optimizaciones de performance

## ✅ Checklist Antes de Commitear

- [ ] `npm run smoke-test` pasa
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` pasa
- [ ] Probé manualmente la funcionalidad
- [ ] Los datos se ven iguales que antes
- [ ] No hay errores en consola del navegador
- [ ] El mensaje de commit describe el cambio

## 🔄 Flujo de Trabajo Recomendado

```bash
# 1. Verificar estado actual
npm run smoke-test

# 2. Hacer UN cambio pequeño
# (editar archivo...)

# 3. Verificar que todavía funciona
npm run post-refactor

# 4. Probar manualmente si aplica
# (abrir app, navegar, verificar datos)

# 5. Commit si todo OK
git add .
git commit -m "refactor(scope): description"

# 6. Si falla, revertir fácilmente
git reset --hard HEAD
```

## 📊 Estado Actual

```
✅ Smoke test: PASANDO
✅ Typecheck: PASANDO
✅ Build: PASANDO
⚠️  Code smells: 16 "as any"
📝 Total problemas: 5 categorías
```

## 🚀 ¿Empezamos?

Recomiendo empezar con **Fase 1.1: Extraer constantes para números mágicos**.

Este cambio:
- ✅ Es reversible (git revert)
- ✅ NO cambia lógica, solo nombres
- ✅ Mejora legibilidad inmediatamente
- ✅ Se puede probar fácilmente

¿Procedemos?
