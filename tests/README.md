## 🧪 TEST SUITE

Tests automatizados para asegurar estabilidad del sistema.

### 🎯 Objetivo

- ✅ Verificar que todos los módulos carguen
- ✅ Validar que los actions funcionen
- ✅ Probar la integración con Supabase
- ✅ Tests de regresión para refactorización

### 📁 Estructura

```
tests/
├── unit/           # Tests unitarios de funciones
├── integration/     # Tests de integración con Supabase
├── e2e/            # Tests end-to-end de flujos completos
└── setup/          # Scripts de configuración
```

---

## 🧪 TEST SUITE

Tests automatizados para asegurar estabilidad del sistema.

### 🎯 Objetivo

- ✅ Verificar que todos los módulos carguen
- ✅ Validar que los actions funcionen
- ✅ Probar la integración con Supabase
- ✅ Tests de regresión para refactorización

### 📁 Estructura

```
tests/
├── unit/           # Tests unitarios de funciones
├── integration/     # Tests de integración con Supabase
├── e2e/            # Tests end-to-end de flujos completos
└── setup/          # Scripts de configuración
```

---

## 📝 PLAN DE IMPLEMENTACIÓN

### FASE 1: Tests Unitarios (Prioridad ALTA)

**1.1 Actions - Financial Control**
- [ ] `getDailySales()` - Crear/actualizar venta diaria
- [ ] `getOperatingExpenses()` - Crear/actualizar gasto
- [ ] `getExpenseDashboardData()` - Obtener dashboard de gastos
- [ ] `getBillingDashboardData()` - Obtener dashboard de facturación
- [ ] `getMonthlyTargets()` - Obtener objetivos mensuales
- [ ] `upsertDailySales()` - Upsert ventas
- [ ] `upsertOperatingExpense()` - Upsert gastos
- [ ] `upsertMonthlyTarget()` - Upsert objetivos

**1.2 Actions - Dashboard**
- [ ] `getFinancialMetrics()` - Métricas financieras
- [ ] `getChartActivity()` - Gráfico de actividad

**1.3 Actions - Resultados**
- [ ] `getFinancialResults()` - Resultados financieros
- [ ] `getMonthlyResults()` - Resultados mensuales
- [ ] `getYearOverYearComparison()` - Comparativa año sobre año

**1.4 Actions - Usuarios**
- [ ] `getCurrentRestaurant()` - Obtener restaurante actual
- [ ] `getRestaurants()` - Listar restaurantes

**1.5 Actions - Stock**
- [ ] `getIngredients()` - Listar ingredientes
- [ ] `getRecipes()` - Listar recetas

**1.6 Actions - Facturación**
- [ ] `getInvoices()` - Obtener facturas
- [ ] `processInvoice()` - Procesar factura con OCR

### FASE 2: Tests de Integración (Prioridad MEDIA)

**2.1 Supabase Client**
- [ ] Conexión exitosa
- [ ] Autenticación funcional
- [ ] CRUD básico (read)

**2.2 Queries Complejas**
- [ ] Joins múltiples tablas
- [ ] Filtros con rangos de fechas
- [ ] Agregaciones con GROUP BY

### FASE 3: Tests E2E (Prioridad BAJA)

**3.1 Flujos de Usuario**
- [ ] Registro → Dashboard → Gastos → Resultados
- [ ] Facturación → Revisión → Completed

**3.2 Flujos de Negocio**
- [ ] Inventario → Recetas → Costing
- [ ] Compras → Stock

### FASE 4: Configuración y Setup

- [ ] Script de seed para datos de prueba
- [ ] Variables de entorno
- [ ] Script de cleanup

---

## 🔧 PLAN DE EJECUCIÓN

### Paso 1: Crear estructura de tests
```bash
mkdir -p tests/{unit,integration,e2e,setup}
touch tests/unit/financial-control.test.ts
touch tests/unit/dashboard.test.ts
touch tests/integration/supabase.test.ts
```

### Paso 2: Implementar tests críticos (Phase 1)
```bash
# Prioridad: Actions de Financial Control
npm test -- tests/unit/financial-control.test.ts
```

### Paso 3: Implementar tests de integración
```bash
# Prioridad: Supabase
npm test -- tests/integration/supabase.test.ts
```

### Paso 4: Ejecutar todos los tests
```bash
npm test
```

### Paso 5: Report de cobertura
```bash
npm test -- --coverage
```

---

## 📊 MÉTRICAS DE ÉXITO

- **Cobertura de código**: ≥ 70%
- **Tests pasando**: 95%+
- **Build sin errores**: 100%
- **Typecheck**: 100%

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Crear estructura de tests
2. ✅ Implementar tests unitarios (actions)
3. ✅ Implementar tests de integración (Supabase)
4. ✅ Tests E2E de flujos completos
5. ✅ Scripts de seed y cleanup
6. ✅ CI/CD configurado

---

## 📚 NOTAS

- Tests usando **Jest** o **Vitest**
- Mock de Supabase para tests unitarios
- Supabase real para integración (con variables de entorno)
- Tests E2E con Playwright para navegador

---

Fecha: 2025-02-13
Estado: 🎯 PLANIFICADO
Próximo paso: Crear estructura de tests
