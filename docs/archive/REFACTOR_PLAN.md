# PLAN DE REFACTORIZACIÓN SEGURA

## Estrategia: Refactorización Incremental con Tests

### FASE 1: Diagnosticar y Priorizar (HOY)

1. **Crear Tests de Humo (Smoke Tests)**
   - Scripts que verifican funcionalidad crítica
   - Antes de tocar código, capturamos el comportamiento actual
   - Si pasan después → refactor funcionó

2. **Priorizar por impacto/riesgo**
   - 🟢 BAJO RIESGO: Variables mal nombradas, números mágicos
   - 🟡 MEDIO RIESGO: Funciones largas (extraer subfunciones)
   - 🔴 ALTO RIESGO: Arquitectura, cambios en schema

### FASE 2: Tests de Regresión (ANTES DE CADA CAMBIO)

```bash
# Ejecutar antes de cada refactor
npm run typecheck
npm run lint
npm run build
```

### FASE 3: Técnica "Strangler Fig"

**NO eliminamos el código viejo hasta que el nuevo esté probado:**

```typescript
// Ejemplo seguro:
function getExpenseDashboardData(...) {
    // VERSIÓN VIEJA (probada)
    const oldResult = calculateOldWay()
    
    // VERSIÓN NUEVA (en paralelo)
    const newResult = calculateNewWay()
    
    // VALIDAR: ¿Dan lo mismo?
    if (JSON.stringify(oldResult) !== JSON.stringify(newResult)) {
        console.error('Discrepancia detectada')
        return oldResult  // Fall back a lo seguro
    }
    
    return newResult
}
```

### FASE 4: Cambio Uno a la Vez

1. **Cambiar SOLO nombres de variables** → Probar
2. **Luego extraer funciones pequeñas** → Probar
3. **Luego simplificar lógica** → Probar

### FASE 5: Validación Manual

- Abrir la app y probar los flujos afectados
- Verificar que los datos se ven igual
- Revisar consola por errores

## Checklist antes de Commitear

- [ ] Typecheck pasa
- [ ] Lint pasa
- [ ] Build funciona
- [ ] Probé manualmente el flujo afectado
- [ ] Los datos se ven iguales que antes
- [ ] No hay errores en consola

## Propongo empezar por los de BAJO RIESGO

1. Extraer constantes para números mágicos
2. Renombrar variables confusas
3. Extraer funciones pequeñas y probadas

¿De acuerdo?
