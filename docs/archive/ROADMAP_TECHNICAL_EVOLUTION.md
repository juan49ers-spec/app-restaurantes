# Hoja de Ruta de Evolución Técnica - ControlHub Pro

## Contexto Actual (Febrero 2026)

### Stack Tecnológico Real
- **Framework**: Next.js 16.1.6 (App Router) con Server Actions
- **Lenguaje**: TypeScript 5 (strict mode)
- **Base de Datos**: Supabase (PostgreSQL + RLS)
- **Estilos**: Tailwind CSS 4
- **UI**: Radix UI + Shadcn
- **Testing**: Vitest (287 tests, 94.46% cobertura)
- **Charts**: Recharts

### Estado de Calidad
| Métrica | Valor | Estado |
|---------|-------|--------|
| Tests Unitarios | 287 | ✅ |
| Cobertura | 94.46% | ✅ |
| Errores TypeScript | 7 | ⚠️ |
| Errores ESLint | 151 | ❌ |

### Problemas Principales
1. **Uso extensivo de `any`** en Server Actions, componentes y librerías
2. **Variables no usadas** en imports, parámetros y catch blocks
3. **Documentación desactualizada** (ARCHITECTURE.md menciona Vite, pero es Next.js)

---

## FASE 1: Estabilización y Calidad (Semanas 1-3)

### Objetivo
Eliminar la deuda técnica crítica y establecer una base sólida de tipos y documentación.

---

### 1.1 Seguridad de Tipos Crítica (Día 1-3)

#### 1.1.1 Eliminar `any` en Server Actions Críticos
**Prioridad**: ALTA | **Tiempo**: 4 horas | **Responsable**: Backend Dev

**Archivos a refactorizar**:
- `src/app/actions/safe-action.ts` (línea 40)
- `src/app/actions/resultados.ts` (catch blocks)
- `src/app/actions/stock-actions.ts` ( líneas 13, 21)
- `src/app/actions/waste-actions.ts` (línea 161)

**Acción Específica**:
```typescript
// ❌ ANTES
catch (error: any) {
    console.error("Error:", error);
    return { success: false, error: error.message };
}

// ✅ DESPUÉS
catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred";
    return { success: false, error: message };
}
```

**Criterio de Aceptación**:
- [ ] 0 usos de `any` en catch blocks de Server Actions
- [ ] Type guards implementados para errores
- [ ] Todos los actions pasan `npm run typecheck`

**Comando de Verificación**:
```bash
npm run typecheck
rg "catch \([^)]*any" src/app/actions/
```

---

#### 1.1.2 Tipado Estricto en Componentes de Charts
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Frontend Dev

**Archivos a refactorizar**:
- `src/components/analytics/BCGMatrixChart.tsx` (línea 34)
- `src/components/dashboard/SpendTrendChart.tsx` (línea 73)
- `src/components/financial-control/ExpensesDashboard.tsx` (líneas 38, 40, 61)
- `src/components/shared/CostEvolutionChart.tsx` (líneas 9, 85)

**Acción Específica**:
```typescript
// ❌ ANTES
const CustomTooltip = ({ active, payload, label }: any) => {
    // ...
}

// ✅ DESPUÉS
import { TooltipProps } from 'recharts';

type ChartData = {
    date: string;
    value: number;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{label}</p>
                <p className="value">{payload[0].value}</p>
            </div>
        );
    }
    return null;
};
```

**Criterio de Aceptación**:
- [ ] 0 usos de `any` en componentes de Recharts
- [ ] Tipos importados desde `recharts` (TooltipProps, Props, etc.)
- [ ] Componentes tienen tipos de datos explícitos

**Comando de Verificación**:
```bash
rg ": any" src/components/ --type tsx -A 2 -B 2
```

---

#### 1.1.3 Refactorizar `lib/export-utils.ts`
**Prioridad**: ALTA | **Tiempo**: 2 horas | **Responsable**: Backend Dev

**Archivo**: `src/lib/export-utils.ts`

**Problemas**:
- Líneas 90, 143, 297: uso de `any` en interfaces

**Acción Específica**:
```typescript
// ❌ ANTES
interface DailyStats {
    date: string;
    cogs?: number;
    revenue?: number;
    [key: string]: string | number | boolean | undefined;
}

// ✅ DESPUÉS
interface DailyStats {
    date: string;
    cogs?: number;
    revenue?: number;
    [key: string]: string | number | boolean | undefined;
    totalSales?: number;
    laborCost?: number;
    otherExpenses?: number;
}
```

**Criterio de Aceptación**:
- [ ] 0 usos de `any` en `export-utils.ts`
- [ ] Interfaces tienen propiedades explícitas
- [ ] Funciones de exportación (PDF/Excel) funcionan correctamente

**Comando de Verificación**:
```bash
npm run typecheck
rg ": any" src/lib/export-utils.ts
```

---

### 1.2 Limpieza de Linting (Día 4-5)

#### 1.2.1 Eliminar Variables No Usadas
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Full-stack Dev

**Archivos afectados**: 30+ archivos con imports o variables no usadas

**Acción Específica**:
```typescript
// ❌ ANTES
import { useState, useEffect } from 'react';
import { Euro, Dollar } from 'lucide-react';

const Component = () => {
    const [state, setState] = useState(null);  // No usado
    return <div>...</div>;
}

// ✅ DESPUÉS
import { useState } from 'react';
import { Euro } from 'lucide-react';

const Component = () => {
    return <div>...</div>;
}
```

**Archivos Prioritarios**:
- `src/components/ingredients/IngredientsTable.tsx` (imports no usados)
- `src/components/recipes/RecipeBuilder.tsx` (useState, useEffect no usados)
- `src/components/suppliers/SupplierTable.tsx` (imports no usados)
- `src/app/purchasing/analytics/page.tsx` (variable mappings no usada)

**Criterio de Aceptación**:
- [ ] Menos de 20 advertencias de ESLint
- [ ] 0 errores de ESLint
- [ ] Todos los imports usados o removidos

**Comando de Verificación**:
```bash
npm run lint | tee lint_report.txt
```

---

#### 1.2.2 Arreglar Catch Blocks No Usados
**Prioridad**: MEDIA | **Tiempo**: 2 horas | **Responsable**: Full-stack Dev

**Archivos afectados**:
- `src/components/invoices/ValidationInbox.tsx` (3 errores)
- `src/app/admin/invoice-validation/page.tsx` (error en línea 64)

**Acción Específica**:
```typescript
// ❌ ANTES
try {
    await fetchData();
} catch (error) {
    console.error("Error fetching data");
}

// ✅ DESPUÉS
try {
    await fetchData();
} catch (error) {
    console.error("Error fetching data:", error);
    // O usar underscore para indicar que es intencional
}
```

**Criterio de Aceptación**:
- [ ] 0 errores de catch blocks no usados
- [ ] Todos los errores logueados apropiadamente

**Comando de Verificación**:
```bash
rg "catch \([^)]*\) \{" src/ -A 1
```

---

### 1.3 Corregir Errores de TypeScript (Día 6)

#### 1.3.1 Arreglar Type Mismatches
**Prioridad**: ALTA | **Tiempo**: 2 horas | **Responsable**: Frontend Dev

**Errores Actuales** (7 totales):
1. `src/components/financial-control/ExpenseIntelligenceWidget.tsx:101` - `ProgressProps`
2. `src/components/financial-control/ExpensesDashboard.tsx:103` - Type mismatch en `category`

**Acción Específica**:
```typescript
// ❌ ANTES - Error en línea 101
<Progress 
    value={75} 
    className="w-full"
    indicatorClassName="bg-primary"
/>

// ✅ DESPUÉS
<Progress 
    value={75} 
    className="w-full"
/>

// ❌ ANTES - Error en línea 103
type ExpenseCategory = string;

// ✅ DESPUÉS
type ExpenseCategory = 
    | "NOMINAS_LIQUIDAS"
    | "SEGURIDAD_SOCIAL"
    | "EN_MANO_PERSONAL"
    // ... resto de categorías
    | "OTROS";
```

**Criterio de Aceptación**:
- [ ] 0 errores de TypeScript
- [ ] `npm run typecheck` pasa sin errores
- [ ] Build de producción exitoso

**Comando de Verificación**:
```bash
npm run typecheck | tee typecheck_report.txt
```

---

### 1.4 Documentación y Arquitectura (Día 7)

#### 1.4.1 Actualizar README.md
**Prioridad**: MEDIA | **Tiempo**: 2 horas | **Responsable**: Tech Lead

**Acciones Específicas**:
1. Corregir stack: "Next.js 15" → "Next.js 16.1.6"
2. Agregar sección de Server Actions
3. Actualizar comandos de desarrollo
4. Agregar diagrama de arquitectura real

**Estructura Propuesta**:
```markdown
# ControlHub Pro

## Stack Tecnológico
- Next.js 16.1.6 (App Router)
- TypeScript 5 (strict)
- Supabase (PostgreSQL + Auth)
- Tailwind CSS 4
- Radix UI + Shadcn

## Arquitectura
- Server Actions para mutaciones
- Client Components para UI interactiva
- RLS en Supabase para seguridad

## Scripts
npm run dev          # Desarrollo
npm run build        # Producción
npm run typecheck    # Verificar tipos
npm run lint         # Verificar código
npm test             # Tests unitarios
```

**Criterio de Aceptación**:
- [ ] README.md refleja el stack actual
- [ ] Comandos documentados funcionan
- [ ] Sección de arquitectura incluye diagrama

---

#### 1.4.2 Actualizar ARCHITECTURE.md
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Tech Lead

**Acciones Específicas**:
1. Remover referencias a Vite (es Next.js)
2. Actualizar diagrama de flujo de datos (Server Actions)
3. Documentar estructura real de carpetas
4. Agregar sección de Server Actions

**Criterio de Aceptación**:
- [ ] ARCHITECTURE.md coincide con la realidad del proyecto
- [ ] Server Actions documentados
- [ ] Diagramas actualizados

---

#### 1.4.3 Crear Diagrama de Base de Datos
**Prioridad**: ALTA | **Tiempo**: 2 horas | **Responsable**: Backend Dev

**Archivo Nuevo**: `docs/db-schema.md`

**Contenido**:
```markdown
# Esquema de Base de Datos - ControlHub

## Tablas Principales

### monthly_results
- id: UUID (PK)
- restaurant_id: UUID (FK)
- year: integer
- month: integer
- ingresos_netos: numeric
- personal_total: numeric
- materia_prima_total: numeric
- resultado_neto: numeric

### operating_expenses
- id: UUID (PK)
- restaurant_id: UUID (FK)
- expense_date: date
- category: text
- amount: numeric
- is_paid: boolean

## Relaciones
- restaurants → monthly_results (1:N)
- restaurants → operating_expenses (1:N)
- monthly_results → operating_expenses (1:N)
```

**Criterio de Aceptación**:
- [ ] Documento creado en `docs/db-schema.md`
- [ ] Todas las tablas principales documentadas
- [ ] Relaciones entre tablas especificadas

---

#### 1.4.4 Documentar Contratos de API
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Backend Dev

**Archivo Nuevo**: `docs/api-contracts.md`

**Contenido**:
```markdown
# Contratos de API - Server Actions

## safe-action<TInput, TOutput>

Tipo genérico para envolver acciones seguras.

```typescript
export type ActionResponse<T> = {
    success: boolean;
    data?: T;
    error?: string;
};
```

## Acciones Principales

### getResultsDashboardData
**Entrada**:
- restaurantId: string
- year: number
- month: number

**Salida**:
```typescript
{
    data: DashboardData | null;
    error: string | null;
}
```

### insertMonthlyResult
**Entrada**:
- restaurantId: string
- data: Partial<MonthlyResult>

**Salida**:
```typescript
{
    success: boolean;
    error: string | null;
}
```
```

**Criterio de Aceptación**:
- [ ] Documento creado en `docs/api-contracts.md`
- [ ] Todas las Server Actions críticas documentadas
- [ ] Tipos de entrada/salida especificados

---

### Resumen Fase 1

| Tarea | Prioridad | Tiempo | Estado |
|-------|-----------|--------|--------|
| Eliminar `any` en Server Actions | ALTA | 4h | ⏳ Pendiente |
| Tipado estricto en Charts | MEDIA | 3h | ⏳ Pendiente |
| Refactorizar `export-utils.ts` | ALTA | 2h | ⏳ Pendiente |
| Eliminar variables no usadas | MEDIA | 3h | ⏳ Pendiente |
| Arreglar catch blocks | MEDIA | 2h | ⏳ Pendiente |
| Corregir errores TypeScript | ALTA | 2h | ⏳ Pendiente |
| Actualizar README.md | MEDIA | 2h | ⏳ Pendiente |
| Actualizar ARCHITECTURE.md | MEDIA | 3h | ⏳ Pendiente |
| Crear diagrama DB | ALTA | 2h | ⏳ Pendiente |
| Documentar API contracts | MEDIA | 3h | ⏳ Pendiente |

**Total Tiempo Estimado**: 26 horas (3.2 días de trabajo)

**Criterio de Éxito Fase 1**:
- [ ] 0 errores de TypeScript
- [ ] Menos de 20 advertencias de ESLint
- [ ] Documentación actualizada
- [ ] Todos los tests pasan (287 tests, 94.46% cobertura)

---

## FASE 2: Integridad de Datos e Ingesta (Semanas 4-6)

### Objetivo
Asegurar que los datos financieros sean 100% fiables, atómicos y resistentes a fallos.

---

### 2.1 Transacciones Atómicas con RPC (Día 1-3)

#### 2.1.1 Crear Función RPC `upsert_invoice_with_items`
**Prioridad**: ALTA | **Tiempo**: 4 horas | **Responsable**: Backend Dev

**Contexto**: Actualmente, las facturas y sus ítems se guardan por separado, lo que puede causar estados inconsistentes.

**Acción Específica**:

Crear archivo `supabase/migrations/20250218_create_invoice_rpc.sql`:

```sql
-- Función RPC para upsert de facturas con ítems en una transacción
CREATE OR REPLACE FUNCTION upsert_invoice_with_items(
    p_invoice_id UUID DEFAULT gen_random_uuid(),
    p_restaurant_id UUID,
    p_supplier_id UUID,
    p_invoice_number TEXT,
    p_invoice_date DATE,
    p_total_amount NUMERIC,
    p_tax_amount NUMERIC DEFAULT 0,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(
    success BOOLEAN,
    invoice_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_line_item_id UUID;
BEGIN
    -- Validar que el restaurante pertenece al usuario
    IF NOT EXISTS (
        SELECT 1 FROM restaurants 
        WHERE id = p_restaurant_id 
        AND owner_id = auth.uid()
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Restaurant not found';
        RETURN;
    END IF;

    -- Upsert de la factura
    INSERT INTO invoices (
        id, restaurant_id, supplier_id, invoice_number, 
        invoice_date, total_amount, tax_amount, status
    )
    VALUES (
        p_invoice_id, p_restaurant_id, p_supplier_id, p_invoice_number,
        p_invoice_date, p_total_amount, p_tax_amount, 'PENDING_VALIDATION'
    )
    ON CONFLICT (id)
    DO UPDATE SET
        supplier_id = EXCLUDED.supplier_id,
        invoice_number = EXCLUDED.invoice_number,
        invoice_date = EXCLUDED.invoice_date,
        total_amount = EXCLUDED.total_amount,
        tax_amount = EXCLUDED.tax_amount,
        updated_at = NOW();

    -- Eliminar ítems anteriores para reemplazarlos
    DELETE FROM invoice_items 
    WHERE invoice_id = p_invoice_id;

    -- Insertar nuevos ítems
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO invoice_items (
            id, invoice_id, description, quantity, unit_price, total_price
        )
        VALUES (
            gen_random_uuid(),
            p_invoice_id,
            v_item->>'description',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'total_price')::NUMERIC
        );
    END LOOP;

    -- Retornar éxito
    RETURN QUERY SELECT true, p_invoice_id, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error
        RAISE NOTICE 'Error in upsert_invoice_with_items: %', SQLERRM;
        RETURN QUERY SELECT false, NULL::UUID, SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_invoice_with_items TO authenticated;
```

**Criterio de Aceptación**:
- [ ] Función RPC creada en Supabase
- [ ] Migración aplicada en desarrollo
- [ ] Tests unitarios pasan (ver 2.1.2)
- [ ] Documentación actualizada en `docs/api-contracts.md`

---

#### 2.1.2 Migrar `invoices.ts` a Usar RPC
**Prioridad**: ALTA | **Tiempo**: 3 horas | **Responsable**: Backend Dev

**Archivo**: `src/app/actions/invoices.ts`

**Acción Específica**:
```typescript
// ❌ ANTES - Dos llamadas separadas (no atómicas)
export async function saveInvoiceWithItems(
    invoice: InvoiceInput,
    items: InvoiceItemInput[]
) {
    const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoice);
    
    if (invoiceError) throw invoiceError;
    
    for (const item of items) {
        const { error: itemError } = await supabase
            .from('invoice_items')
            .insert({ ...item, invoice_id: invoiceData.id });
        
        if (itemError) throw itemError; // ⚠️ Estado inconsistente
    }
}

// ✅ DESPUÉS - Una sola llamada atómica
export async function saveInvoiceWithItems(
    invoice: InvoiceInput,
    items: InvoiceItemInput[]
) {
    const { data, error } = await supabase.rpc('upsert_invoice_with_items', {
        p_restaurant_id: invoice.restaurant_id,
        p_supplier_id: invoice.supplier_id,
        p_invoice_number: invoice.invoice_number,
        p_invoice_date: invoice.invoice_date,
        p_total_amount: invoice.total_amount,
        p_tax_amount: invoice.tax_amount,
        p_items: JSON.stringify(items)
    });
    
    if (error) throw error;
    return data;
}
```

**Criterio de Aceptación**:
- [ ] `invoices.ts` usa la función RPC
- [ ] Tests actuales pasan
- [ ] Tests nuevos para casos de edge creados
- [ ] 0 estados inconsistentes posibles

---

#### 2.1.3 Migrar `recipes.ts` a RPC
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Backend Dev

**Archivo**: `src/app/actions/recipes.ts`

**Contexto**: Las recetas y sus ingredientes también se guardan por separado.

**Acción Específica**:

1. Crear función RPC `upsert_recipe_with_ingredients` (similar a 2.1.1)
2. Migrar lógica de guardado en `recipes.ts`
3. Actualizar tests

**Criterio de Aceptación**:
- [ ] Función RPC creada
- [ ] `recipes.ts` migrado
- [ ] Tests pasan

---

### 2.2 Sistema de Idempotencia (Día 4-5)

#### 2.2.1 Agregar `idempotency_key` a Tablas de Ingresos/Gastos
**Prioridad**: ALTA | **Tiempo**: 2 horas | **Responsable**: Backend Dev

**Archivos**:
- `supabase/migrations/20250218_add_idempotency.sql`

**Acción Específica**:
```sql
-- Agregar idempotency_key a operating_expenses
ALTER TABLE operating_expenses 
ADD COLUMN idempotency_key TEXT UNIQUE;

-- Agregar idempotency_key a hourly_sales (si aplica)
ALTER TABLE hourly_sales 
ADD COLUMN idempotency_key TEXT UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_expenses_idempotency 
ON operating_expenses(idempotency_key);

-- Crear índice para sales
CREATE INDEX idx_sales_idempotency 
ON hourly_sales(idempotency_key);
```

**Criterio de Aceptación**:
- [ ] Migración creada y aplicada
- [ ] Índices creados
- [ ] Constraints UNIQUE aplicados

---

#### 2.2.2 Implementar Lógica de Idempotencia en Actions
**Prioridad**: ALTA | **Tiempo**: 4 horas | **Responsable**: Backend Dev

**Archivos**:
- `src/app/actions/financial-control.ts`
- `src/app/actions/stock-actions.ts`

**Acción Específica**:
```typescript
// Helper para generar idempotency key
function generateIdempotencyKey(
    restaurantId: string,
    date: string,
    category: string,
    amount: number
): string {
    return `${restaurantId}-${date}-${category}-${amount}`;
}

// ✅ DESPUÉS - Con idempotencia
export async function upsertExpenseWithIdempotency(
    expense: OperatingExpenseInput
) {
    const idempotencyKey = generateIdempotencyKey(
        expense.restaurant_id,
        expense.expense_date,
        expense.category,
        expense.amount
    );

    const { data, error } = await supabase
        .from('operating_expenses')
        .upsert({
            ...expense,
            idempotency_key: idempotencyKey
        }, {
            onConflict: 'idempotency_key',
            ignoreDuplicates: false
        });

    if (error) throw error;
    return data;
}
```

**Criterio de Aceptación**:
- [ ] Helper `generateIdempotencyKey` creado
- [ ] Actions de gastos implementan idempotencia
- [ ] Actions de ingresos implementan idempotencia
- [ ] Tests para idempotencia creados

---

#### 2.2.3 Middleware para Duplicados en CSV/OCR
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Backend Dev

**Archivo**: `src/lib/services/InvoiceIngestionService.ts`

**Acción Específica**:
```typescript
// ✅ ANTES de procesar cada fila del CSV
async function processCSVRow(row: CSVRow) {
    const idempotencyKey = generateIdempotencyKey(
        this.restaurantId,
        row.date,
        row.invoice_number,
        row.total_amount
    );

    // Verificar si ya existe
    const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single();

    if (existing) {
        console.log(`Duplicate detected: ${idempotencyKey}`);
        return { status: 'skipped', reason: 'duplicate' };
    }

    // Procesar factura
    return await this.processInvoice(row, idempotencyKey);
}
```

**Criterio de Aceptación**:
- [ ] Lógica de detección de duplicados implementada
- [ ] CSV parser usa idempotency keys
- [ ] OCR parser usa idempotency keys
- [ ] Tests para duplicados creados

---

### 2.3 Robustez en la Ingesta (Día 6-7)

#### 2.3.1 Refactorizar Parser de Ingredientes
**Prioridad**: MEDIA | **Tiempo**: 4 horas | **Responsable**: Backend Dev

**Archivo**: `src/lib/services/IngredientParserService.ts`

**Contexto**: Actualmente, las unidades de medida no están normalizadas (ej: "kg", "KG", "kilos", "k").

**Acción Específica**:

1. Crear normalizador de unidades:
```typescript
// src/lib/utils/unit-normalizer.ts
export const UNIT_ALIASES: Record<string, string> = {
    // Peso
    'kg': 'kg',
    'kilos': 'kg',
    'kilogramo': 'kg',
    'kilogramos': 'kg',
    'g': 'g',
    'gramo': 'g',
    'gramos': 'g',
    
    // Volumen
    'l': 'l',
    'litro': 'l',
    'litros': 'l',
    'ml': 'ml',
    'mililitro': 'ml',
    'mililitros': 'ml',
    
    // Unidades
    'ud': 'ud',
    'unidades': 'ud',
    'unidad': 'ud',
};

export function normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    return UNIT_ALIASES[normalized] || normalized;
}

export function convertToBaseUnit(
    quantity: number, 
    unit: string
): { quantity: number; unit: string } {
    const normalized = normalizeUnit(unit);
    
    // Convertir a gramos para peso
    if (normalized === 'kg') {
        return { quantity: quantity * 1000, unit: 'g' };
    }
    
    // Convertir a mililitros para volumen
    if (normalized === 'l') {
        return { quantity: quantity * 1000, unit: 'ml' };
    }
    
    return { quantity, unit: normalized };
}
```

2. Usar en parser:
```typescript
// ✅ DESPUÉS
function parseIngredient(line: string): ParsedIngredient {
    const parts = line.split(',');
    const name = parts[0].trim();
    const quantity = parseFloat(parts[1]);
    const rawUnit = parts[2]?.trim() || 'ud';
    
    // Normalizar unidad
    const { quantity: normalizedQty, unit } = convertToBaseUnit(
        quantity, 
        rawUnit
    );
    
    return { name, quantity: normalizedQty, unit };
}
```

**Criterio de Aceptación**:
- [ ] `unit-normalizer.ts` creado con 20+ alias
- [ ] Parser usa normalizador
- [ ] Tests para normalización creados
- [ ] 0 fallos por unidades inconsistentes

---

#### 2.3.2 Sistema de "Sandbox" para Validación
**Prioridad**: MEDIA | **Tiempo**: 5 horas | **Responsable**: Backend Dev

**Contexto**: Antes de persistir datos definitivamente, validar en un entorno temporal.

**Acción Específica**:

1. Crear tabla de staging:
```sql
CREATE TABLE invoice_staging (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    raw_data JSONB NOT NULL,
    parsed_data JSONB,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending', -- pending, validated, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_staging_restaurant_status 
ON invoice_staging(restaurant_id, status);
```

2. Modificar ingestion service:
```typescript
// ✅ PASO 1: Insertar en staging
async function ingestInvoice(rawData: RawInvoiceData) {
    const { data: staging, error } = await supabase
        .from('invoice_staging')
        .insert({
            restaurant_id: rawData.restaurant_id,
            raw_data: rawData,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;

    // ✅ PASO 2: Validar
    const validation = await this.validateInvoice(staging);
    
    if (!validation.isValid) {
        await supabase
            .from('invoice_staging')
            .update({ 
                validation_errors: validation.errors,
                status: 'rejected'
            })
            .eq('id', staging.id);
        
        return { success: false, errors: validation.errors };
    }

    // ✅ PASO 3: Persistir en tablas finales
    await supabase
        .from('invoice_staging')
        .update({ 
            parsed_data: validation.parsedData,
            status: 'validated',
            processed_at: NOW()
        })
        .eq('id', staging.id);

    return await this.finalizeInvoice(staging.id);
}
```

**Criterio de Aceptación**:
- [ ] Tabla `invoice_staging` creada
- [ ] Ingestion service usa sandbox
- [ ] Validaciones implementadas
- [ ] Tests para sandbox creados
- [ ] Dashboard de revisión de staging

---

### Resumen Fase 2

| Tarea | Prioridad | Tiempo | Estado |
|-------|-----------|--------|--------|
| Crear RPC `upsert_invoice_with_items` | ALTA | 4h | ⏳ Pendiente |
| Migrar `invoices.ts` a RPC | ALTA | 3h | ⏳ Pendiente |
| Migrar `recipes.ts` a RPC | MEDIA | 3h | ⏳ Pendiente |
| Agregar `idempotency_key` | ALTA | 2h | ⏳ Pendiente |
| Implementar idempotencia en actions | ALTA | 4h | ⏳ Pendiente |
| Middleware para CSV/OCR | MEDIA | 3h | ⏳ Pendiente |
| Refactorizar parser de ingredientes | MEDIA | 4h | ⏳ Pendiente |
| Sistema de sandbox | MEDIA | 5h | ⏳ Pendiente |

**Total Tiempo Estimado**: 28 horas (3.5 días de trabajo)

**Criterio de Éxito Fase 2**:
- [ ] Todas las operaciones críticas son atómicas
- [ ] 0 estados inconsistentes posibles
- [ ] 0 duplicados en ingesta de datos
- [ ] 100% de validaciones antes de persistencia

---

## FASE 3: Motor Financiero y Inteligencia (Semanas 7-9)

### Objetivo
Implementar lógica de negocio avanzada, reglas versionadas y alertas proactivas.

---

### 3.1 Reglas de Negocio Versionadas (Día 1-3)

#### 3.1.1 Crear Tabla `business_rules`
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Backend Dev

**Archivo**: `supabase/migrations/20250218_create_business_rules.sql`

**Acción Específica**:
```sql
CREATE TABLE business_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'cogs_target', 'labor_target', etc.
    version INTEGER NOT NULL DEFAULT 1,
    value JSONB NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_business_rules_restaurant_type 
ON business_rules(restaurant_id, rule_type);

CREATE INDEX idx_business_rules_active 
ON business_rules(restaurant_id, is_active) WHERE is_active = true;

-- Ejemplo de regla de COGS
INSERT INTO business_rules (restaurant_id, rule_name, rule_type, value, valid_from)
VALUES (
    'default-restaurant-id',
    'COGS Target 2025',
    'cogs_target',
    '{"target_percentage": 30, "warning_threshold": 32, "critical_threshold": 35}'::jsonb,
    '2025-01-01'
);
```

**Criterio de Aceptación**:
- [ ] Tabla creada
- [ ] Índices creados
- [ ] Regla de ejemplo insertada

---

#### 3.1.2 Service para Gestión de Reglas
**Prioridad**: MEDIA | **Tiempo**: 4 horas | **Responsable**: Backend Dev

**Archivo**: `src/lib/services/BusinessRulesService.ts`

**Acción Específica**:
```typescript
interface BusinessRule {
    id: string;
    restaurant_id: string;
    rule_name: string;
    rule_type: 'cogs_target' | 'labor_target' | 'margin_target';
    value: {
        target_percentage: number;
        warning_threshold: number;
        critical_threshold: number;
    };
    valid_from: Date;
    valid_until?: Date;
    is_active: boolean;
}

export class BusinessRulesService {
    async getActiveRule(
        restaurantId: string,
        ruleType: string,
        date: Date = new Date()
    ): Promise<BusinessRule | null> {
        const { data, error } = await supabase
            .from('business_rules')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('rule_type', ruleType)
            .eq('is_active', true)
            .lte('valid_from', date.toISOString())
            .or(`valid_until.is.null,valid_until.gte.${date.toISOString()}`)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;
        return data;
    }

    async createRule(
        restaurantId: string,
        rule: Omit<BusinessRule, 'id' | 'restaurant_id'>
    ): Promise<BusinessRule> {
        // Obtener última versión
        const { data: lastVersion } = await supabase
            .from('business_rules')
            .select('version')
            .eq('restaurant_id', restaurantId)
            .eq('rule_type', rule.rule_type)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        const newVersion = (lastVersion?.version || 0) + 1;

        const { data, error } = await supabase
            .from('business_rules')
            .insert({
                ...rule,
                restaurant_id: restaurantId,
                version: newVersion
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
```

**Criterio de Aceptación**:
- [ ] Service creado
- [ ] Método `getActiveRule` implementado
- [ ] Método `createRule` implementado
- [ ] Tests creados

---

#### 3.1.3 Simulaciones "What-If"
**Prioridad**: MEDIA | **Tiempo**: 5 horas | **Responsable**: Full-stack Dev

**Contexto**: Permitir simular escenarios basados en reglas históricas vs proyectadas.

**Acción Específica**:

1. Crear Server Action:
```typescript
// src/app/actions/simulation.ts
export async function runWhatIfSimulation(input: {
    restaurantId: string;
    scenario: 'increase_cogs' | 'decrease_labor' | 'price_increase';
    parameters: Record<string, number>;
    projectionMonths: number;
}) {
    // 1. Obtener datos históricos
    const historicalData = await getHistoricalFinancialData(
        input.restaurantId,
        12 // últimos 12 meses
    );

    // 2. Obtener reglas de negocio activas
    const cogsRule = await businessRulesService.getActiveRule(
        input.restaurantId,
        'cogs_target'
    );

    // 3. Aplicar parámetros de simulación
    const simulatedData = historicalData.map(month => {
        const simulated = { ...month };

        switch (input.scenario) {
            case 'increase_cogs':
                simulated.materia_prima_total *= (1 + input.parameters.cogs_increase);
                break;
            case 'decrease_labor':
                simulated.personal_total *= (1 - input.parameters.labor_decrease);
                break;
            case 'price_increase':
                simulated.ingresos_netos *= (1 + input.parameters.price_increase);
                break;
        }

        // Recalcular métricas derivadas
        simulated.resultado_neto = 
            simulated.ingresos_netos 
            - simulated.personal_total 
            - simulated.materia_prima_total 
            - simulated.suministros 
            - simulated.mantenimiento 
            - simulated.marketing;

        simulated.margen_neto = (simulated.resultado_neto / simulated.ingresos_netos) * 100;

        return simulated;
    });

    // 4. Comparar vs targets
    const comparison = simulatedData.map(month => ({
        month: month.month,
        actual: month.margen_neto,
        target: cogsRule.value.target_percentage,
        variance: month.margen_neto - cogsRule.value.target_percentage,
        status: month.margen_neto >= cogsRule.value.target_percentage ? 'above' : 'below'
    }));

    return {
        success: true,
        data: {
            historical: historicalData,
            simulated: simulatedData,
            comparison
        }
    };
}
```

2. Crear componente de UI:
```typescript
// src/components/simulation/WhatIfSimulator.tsx
'use client';

export function WhatIfSimulator() {
    const [scenario, setScenario] = useState<'increase_cogs' | 'decrease_labor' | 'price_increase'>('increase_cogs');
    const [parameters, setParameters] = useState({ cogs_increase: 0.05 });
    const [simulation, setSimulation] = useState(null);

    const runSimulation = async () => {
        const result = await runWhatIfSimulation({
            restaurantId: 'current',
            scenario,
            parameters,
            projectionMonths: 6
        });
        setSimulation(result.data);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>What-If Simulator</CardTitle>
            </CardHeader>
            <CardContent>
                <Select value={scenario} onValueChange={setScenario}>
                    <option value="increase_cogs">Increase COGS</option>
                    <option value="decrease_labor">Decrease Labor</option>
                    <option value="price_increase">Price Increase</option>
                </Select>

                {scenario === 'increase_cogs' && (
                    <Input 
                        type="number" 
                        value={parameters.cogs_increase}
                        onChange={(e) => setParameters({ cogs_increase: parseFloat(e.target.value) })}
                        placeholder="Increase % (e.g., 0.05 for 5%)"
                    />
                )}

                <Button onClick={runSimulation}>Run Simulation</Button>

                {simulation && (
                    <ComparisonChart 
                        historical={simulation.historical}
                        simulated={simulation.simulated}
                    />
                )}
            </CardContent>
        </Card>
    );
}
```

**Criterio de Aceptación**:
- [ ] Server Action creado
- [ ] Componente de UI creado
- [ ] Gráficos de comparación implementados
- [ ] Tests para simulaciones creados

---

### 3.2 Motor de Alertas Proactivo (Día 4-6)

#### 3.2.1 Sistema de Notificaciones en Tiempo Real
**Prioridad**: ALTA | **Tiempo**: 4 horas | **Responsable**: Full-stack Dev

**Contexto**: Notificaciones por desviaciones de margen > 5% en ítems individuales.

**Acción Específica**:

1. Crear tabla de alertas:
```sql
CREATE TABLE financial_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    alert_type TEXT NOT NULL, -- 'margin_deviation', 'expense_anomaly', etc.
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_restaurant_unread 
ON financial_alerts(restaurant_id, is_read) WHERE is_read = false;

CREATE INDEX idx_alerts_restaurant_severity 
ON financial_alerts(restaurant_id, severity);
```

2. Crear función de verificación de márgenes:
```typescript
// src/lib/services/FinancialAlertsService.ts
export class FinancialAlertsService {
    async checkRecipeMargins(restaurantId: string): Promise<void> {
        // Obtener todas las recetas
        const { data: recipes } = await supabase
            .from('recipes')
            .select('*')
            .eq('restaurant_id', restaurantId);

        // Obtener target de margen
        const targetRule = await businessRulesService.getActiveRule(
            restaurantId,
            'margin_target'
        );

        const targetMargin = targetRule?.value?.target_percentage || 70;

        for (const recipe of recipes || []) {
            const currentMargin = recipe.margin_percentage || 0;
            const deviation = Math.abs(currentMargin - targetMargin);

            if (deviation > 5) {
                // Crear alerta
                await supabase.from('financial_alerts').insert({
                    restaurant_id: restaurantId,
                    alert_type: 'margin_deviation',
                    severity: deviation > 10 ? 'critical' : 'warning',
                    title: `Margen desviado: ${recipe.name}`,
                    description: `El margen actual (${currentMargin.toFixed(1)}%) se desvía ${deviation.toFixed(1)}% del target (${targetMargin}%)`,
                    metadata: {
                        recipe_id: recipe.id,
                        recipe_name: recipe.name,
                        current_margin: currentMargin,
                        target_margin: targetMargin,
                        deviation: deviation
                    }
                });
            }
        }
    }

    async checkExpenseAnomalies(restaurantId: string): Promise<void> {
        // Detectar gastos sin ventas correspondientes
        const { data: recentExpenses } = await supabase
            .from('operating_expenses')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // últimos 7 días
            .eq('category', 'PROVEEDORES_COMIDA');

        // Verificar si hay ventas en ese período
        const { data: recentSales } = await supabase
            .from('daily_sales')
            .select('date, total_sales')
            .eq('restaurant_id', restaurantId)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (recentExpenses && recentExpenses.length > 0 && (!recentSales || recentSales.length === 0)) {
            await supabase.from('financial_alerts').insert({
                restaurant_id: restaurantId,
                alert_type: 'expense_anomaly',
                severity: 'warning',
                title: 'Compras sin ventas registradas',
                description: `Se detectaron ${recentExpenses.length} gastos de comida en los últimos 7 días sin ventas registradas`,
                metadata: {
                    expense_count: recentExpenses.length,
                    total_amount: recentExpenses.reduce((sum, e) => sum + e.amount, 0)
                }
            });
        }
    }
}
```

**Criterio de Aceptación**:
- [ ] Tabla de alertas creada
- [ ] Service de alertas creado
- [ ] Verificación de márgenes implementada
- [ ] Verificación de anomalías implementada
- [ ] Tests creados

---

#### 3.2.2 Dashboard de Anomalías
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Frontend Dev

**Archivo**: `src/components/alerts/AnomalyDashboard.tsx`

**Acción Específica**:
```typescript
'use client';

export function AnomalyDashboard() {
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

    useEffect(() => {
        loadAlerts();
    }, [filter]);

    async function loadAlerts() {
        const { data } = await supabase
            .from('financial_alerts')
            .select('*')
            .order('created_at', { ascending: false });

        let filtered = data || [];
        if (filter === 'unread') filtered = filtered.filter(a => !a.is_read);
        if (filter === 'critical') filtered = filtered.filter(a => a.severity === 'critical');

        setAlerts(filtered);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Anomalías de Operación</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                    <TabsList>
                        <TabsTrigger value="all">Todas ({alerts.length})</TabsTrigger>
                        <TabsTrigger value="unread">No Leídas ({alerts.filter(a => !a.is_read).length})</TabsTrigger>
                        <TabsTrigger value="critical">Críticas ({alerts.filter(a => a.severity === 'critical').length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter}>
                        {alerts.map(alert => (
                            <AlertItem key={alert.id} alert={alert} />
                        ))}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function AlertItem({ alert }: { alert: FinancialAlert }) {
    const resolveAlert = async () => {
        await supabase
            .from('financial_alerts')
            .update({ is_resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', alert.id);
        // Recargar
    };

    const severityColor = {
        info: 'bg-blue-100 text-blue-800',
        warning: 'bg-yellow-100 text-yellow-800',
        critical: 'bg-red-100 text-red-800'
    }[alert.severity];

    return (
        <div className="flex items-start space-x-3 p-4 border-b">
            <Badge className={severityColor}>{alert.severity}</Badge>
            <div className="flex-1">
                <h4 className="font-medium">{alert.title}</h4>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.created_at).toLocaleString()}
                </p>
            </div>
            {!alert.is_resolved && (
                <Button size="sm" onClick={resolveAlert}>Resolver</Button>
            )}
        </div>
    );
}
```

**Criterio de Aceptación**:
- [ ] Dashboard creado
- [ ] Filtros implementados
- [ ] Acción de resolver funciona
- [ ] Actualizaciones en tiempo real

---

### 3.3 Analítica Avanzada (Día 7-9)

#### 3.3.1 Predicción de Demanda Basada en Estacionalidad
**Prioridad**: BAJA | **Tiempo**: 6 horas | **Responsable**: Data Analyst + Backend Dev

**Contexto**: Usar datos históricos para predecir demanda futura.

**Acción Específica**:

1. Crear función de análisis de estacionalidad:
```typescript
// src/lib/services/DemandForecastService.ts
export class DemandForecastService {
    async analyzeSeasonality(restaurantId: string): Promise<SeasonalityData[]> {
        // Obtener ventas de los últimos 2 años
        const { data: sales } = await supabase
            .from('daily_sales')
            .select('date, total_sales')
            .eq('restaurant_id', restaurantId)
            .gte('date', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString())
            .order('date');

        // Agrupar por día de la semana y mes
        const seasonalityMap: Record<string, number[]> = {};

        for (const sale of sales || []) {
            const date = new Date(sale.date);
            const key = `${date.getDay()}-${date.getMonth()}`; // day-month
            if (!seasonalityMap[key]) seasonalityMap[key] = [];
            seasonalityMap[key].push(sale.total_sales);
        }

        // Calcular promedios
        return Object.entries(seasonalityMap).map(([key, values]) => ({
            dayOfWeek: parseInt(key.split('-')[0]),
            month: parseInt(key.split('-')[1]),
            averageSales: values.reduce((a, b) => a + b, 0) / values.length,
            stdDev: Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0) / values.length),
            sampleSize: values.length
        }));
    }

    async forecastDemand(
        restaurantId: string,
        startDate: Date,
        days: number
    ): Promise<DemandForecast[]> {
        const seasonality = await this.analyzeSeasonality(restaurantId);
        const forecasts: DemandForecast[] = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);

            const key = `${date.getDay()}-${date.getMonth()}`;
            const seasonalData = seasonality.find(s => 
                s.dayOfWeek === date.getDay() && s.month === date.getMonth()
            );

            forecasts.push({
                date: date.toISOString(),
                predictedDemand: seasonalData?.averageSales || 0,
                confidenceInterval: {
                    min: (seasonalData?.averageSales || 0) - (seasonalData?.stdDev || 0),
                    max: (seasonalData?.averageSales || 0) + (seasonalData?.stdDev || 0)
                },
                confidenceLevel: seasonalData?.sampleSize && seasonalData.sampleSize > 10 ? 0.95 : 0.8
            });
        }

        return forecasts;
    }
}
```

2. Crear acción de forecast:
```typescript
// src/app/actions/forecasting.ts
export async function getDemandForecast(input: {
    restaurantId: string;
    startDate: string;
    days: number;
}) {
    const service = new DemandForecastService();
    const forecast = await service.forecastDemand(
        input.restaurantId,
        new Date(input.startDate),
        input.days
    );

    return { success: true, data: forecast };
}
```

3. Crear componente de visualización:
```typescript
// src/components/analytics/DemandForecastChart.tsx
export function DemandForecastChart() {
    const [forecast, setForecast] = useState<DemandForecast[]>([]);

    useEffect(() => {
        loadForecast();
    }, []);

    async function loadForecast() {
        const { data } = await getDemandForecast({
            restaurantId: 'current',
            startDate: new Date().toISOString(),
            days: 30
        });
        setForecast(data);
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="predictedDemand" 
                    stroke="#8884d8" 
                    name="Predicción"
                />
                <Line 
                    type="monotone" 
                    dataKey="confidenceInterval.min" 
                    stroke="#82ca9d" 
                    strokeDasharray="5 5"
                    name="Mínimo"
                />
                <Line 
                    type="monotone" 
                    dataKey="confidenceInterval.max" 
                    stroke="#ffc658" 
                    strokeDasharray="5 5"
                    name="Máximo"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
```

**Criterio de Aceptación**:
- [ ] Service de forecasting creado
- [ ] Análisis de estacionalidad implementado
- [ ] Acción de forecast creada
- [ ] Gráfico de predicción implementado
- [ ] Tests creados

---

### Resumen Fase 3

| Tarea | Prioridad | Tiempo | Estado |
|-------|-----------|--------|--------|
| Crear tabla `business_rules` | MEDIA | 3h | ⏳ Pendiente |
| Service de reglas de negocio | MEDIA | 4h | ⏳ Pendiente |
| Simulaciones What-If | MEDIA | 5h | ⏳ Pendiente |
| Sistema de alertas | ALTA | 4h | ⏳ Pendiente |
| Dashboard de anomalías | MEDIA | 3h | ⏳ Pendiente |
| Forecasting de demanda | BAJA | 6h | ⏳ Pendiente |

**Total Tiempo Estimado**: 25 horas (3.1 días de trabajo)

**Criterio de Éxito Fase 3**:
- [ ] Reglas de negocio versionadas implementadas
- [ ] Simulaciones What-If funcionales
- [ ] Alertas proactivas implementadas
- [ ] Dashboard de anomalías operativo
- [ ] Forecasting de demanda disponible

---

## FASE 4: Excelencia Operativa (Semanas 10+)

### Objetivo
Implementar logging estructurado, monitoreo, optimización de UI/UX y mantenimiento simplificado.

---

### 4.1 Logging y Observabilidad (Día 1-3)

#### 4.1.1 Implementar Logging Estructurado
**Prioridad**: ALTA | **Tiempo**: 4 horas | **Responsable**: Backend Dev

**Contexto**: Actualmente, los errores se loguean con `console.error`. Necesitamos logging estructurado para trazar errores en Server Actions.

**Acción Específica**:

1. Instalar Pino:
```bash
npm install pino pino-pretty
```

2. Crear logger:
```typescript
// src/lib/logger.ts
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    } : undefined,
    base: {
        env: process.env.NODE_ENV
    },
    formatters: {
        level: (label) => {
            return { level: label };
        }
    }
});

export function logServerAction<T>(
    actionName: string,
    fn: () => Promise<T>
): Promise<T> {
    return logger.info({ action: actionName, phase: 'start' }, fn());
}
```

3. Usar en Server Actions:
```typescript
// ❌ ANTES
export async function saveRecipe(input: RecipeInput) {
    try {
        const { data, error } = await supabase
            .from('recipes')
            .insert(input);
        
        if (error) {
            console.error("Error saving recipe:", error);
            throw error;
        }
        
        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error:", err);
        return { success: false, error: err.message };
    }
}

// ✅ DESPUÉS
import { logger } from '@/lib/logger';

export async function saveRecipe(input: RecipeInput) {
    const requestId = crypto.randomUUID();
    
    logger.info({ 
        action: 'saveRecipe', 
        requestId,
        phase: 'start',
        input: { name: input.name, restaurant_id: input.restaurant_id }
    });

    try {
        const { data, error } = await supabase
            .from('recipes')
            .insert(input)
            .select()
            .single();

        if (error) {
            logger.error({ 
                action: 'saveRecipe', 
                requestId,
                phase: 'database_error',
                error: error.message,
                code: error.code
            });
            throw error;
        }

        logger.info({ 
            action: 'saveRecipe', 
            requestId,
            phase: 'complete',
            recipeId: data.id
        });

        return { success: true, data };
    } catch (err) {
        logger.error({ 
            action: 'saveRecipe', 
            requestId,
            phase: 'unexpected_error',
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        });
        
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
```

**Criterio de Aceptación**:
- [ ] Pino instalado y configurado
- [ ] Logger estructurado creado
- [ ] Server Actions críticas usan logger
- [ ] Logs incluyen requestId, phase, y contexto

---

#### 4.1.2 Integrar con Axiom (o Similar)
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: DevOps

**Contexto**: Enviar logs a un servicio centralizado para análisis.

**Acción Específica**:

1. Instalar transport:
```bash
npm install pino-axiom
```

2. Configurar para producción:
```typescript
// src/lib/logger.ts
import pino from 'pino';

let logger: pino.Logger;

if (process.env.NODE_ENV === 'production') {
    // Enviar logs a Axiom
    const { multistream } = await import('pino-axiom');
    logger = pino(
        multistream({
            dataset: process.env.AXIOM_DATASET || 'controlhub-logs',
            token: process.env.AXIOM_TOKEN
        })
    );
} else {
    // Desarrollo: usar pino-pretty
    logger = pino({
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard'
            }
        }
    });
}

export { logger };
```

3. Agregar variables de entorno:
```bash
# .env.local
AXIOM_TOKEN=your_axiom_token
AXIOM_DATASET=controlhub-logs
```

**Criterio de Aceptación**:
- [ ] Axiom configurado
- [ ] Logs de producción enviados a Axiom
- [ ] Dashboard en Axiom configurado
- [ ] Alertas de errores críticos configuradas

---

#### 4.1.3 Monitoreo de Performance de Supabase
**Prioridad**: MEDIA | **Tiempo**: 2 horas | **Responsable**: Backend Dev

**Contexto**: Usar Supabase Performance Insights para monitorear consultas lentas.

**Acción Específica**:

1. Habilitar Performance Insights en Supabase Dashboard
2. Crear consultas de monitoreo:
```sql
-- Consultas más lentas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY mean_time DESC
LIMIT 10;

-- Tablas más accedidas
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan + idx_scan DESC;
```

3. Crear dashboard en Supabase:
- Queries lentas (> 100ms)
- Índices faltantes
- Tablas sin vacuum reciente

**Criterio de Aceptación**:
- [ ] Performance Insights habilitado
- [ ] Dashboard de consultas lentas creado
- [ ] Índices optimizados basados en insights
- [ ] 0 consultas > 500ms en hot paths

---

### 4.2 Optimización de UI/UX (Día 4-6)

#### 4.2.1 Virtualización de Tablas Grandes
**Prioridad**: MEDIA | **Tiempo**: 4 horas | **Responsable**: Frontend Dev

**Contexto**: Tablas de ingredientes/gastos pueden tener miles de filas.

**Acción Específica**:

1. Instalar react-window:
```bash
npm install react-window @types/react-window
```

2. Crear componente virtualizado:
```typescript
// src/components/shared/VirtualizedTable.tsx
import { FixedSizeList } from 'react-window';

interface VirtualizedTableProps<T> {
    items: T[];
    height: number;
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualizedTable<T>({
    items,
    height,
    itemHeight,
    renderItem
}: VirtualizedTableProps<T>) {
    return (
        <FixedSizeList
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width="100%"
        >
            {({ index, style }) => (
                <div style={style}>
                    {renderItem(items[index], index)}
                </div>
            )}
        </FixedSizeList>
    );
}
```

3. Usar en tablas existentes:
```typescript
// ❌ ANTES - IngredientsTable.tsx
return (
    <Table>
        <TableBody>
            {ingredients.map(ingredient => (
                <TableRow key={ingredient.id}>
                    <TableCell>{ingredient.name}</TableCell>
                    <TableCell>{ingredient.cost}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

// ✅ DESPUÉS
import { VirtualizedTable } from '@/components/shared/VirtualizedTable';

return (
    <VirtualizedTable
        items={ingredients}
        height={600}
        itemHeight={50}
        renderItem={(ingredient) => (
            <div className="flex p-3 border-b">
                <span className="flex-1">{ingredient.name}</span>
                <span className="w-32">{ingredient.cost.toFixed(2)}€</span>
            </div>
        )}
    />
);
```

**Criterio de Aceptación**:
- [ ] react-window instalado
- [ ] Componente VirtualizedTable creado
- [ ] IngredientsTable usa virtualización
- [ ] OperatingExpensesTable usa virtualización
- [ ] Render time < 100ms para 10,000 filas

---

#### 4.2.2 Modo Offline Básico
**Prioridad**: BAJA | **Tiempo**: 5 horas | **Responsable**: Full-stack Dev

**Contexto**: Permitir consulta rápida de datos frecuentes con persistencia local.

**Acción Específica**:

1. Instalar SWR:
```bash
npm install swr
```

2. Crear hooks con cache local:
```typescript
// src/hooks/useFinancialData.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useFinancialData(restaurantId: string, year: number, month: number) {
    const { data, error, isLoading } = useSWR(
        `/api/financial-data?restaurant=${restaurantId}&year=${year}&month=${month}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000, // 1 minuto
            cache: 'force-cache' // Usar cache local primero
        }
    );

    return {
        data,
        isLoading,
        error: error as Error,
        isOffline: !navigator.onLine
    };
}
```

3. Crear API route para datos financieros:
```typescript
// src/app/api/financial-data/route.ts
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant');
    const year = parseInt(searchParams.get('year') || '0');
    const month = parseInt(searchParams.get('month') || '0');

    // Cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    const data = await getResultsDashboardData(restaurantId, year, month);
    
    return NextResponse.json(data, { headers });
}
```

**Criterio de Aceptación**:
- [ ] SWR instalado
- [ ] Hooks de datos creados
- [ ] Cache headers configurados
- [ ] Offline mode funcional
- [ ] Datos mostrados inmediatamente desde cache

---

### 4.3 Mantenimiento Simplificado (Día 7+)

#### 4.3.1 Scripts de Mantenimiento Automatizado
**Prioridad**: MEDIA | **Tiempo**: 3 horas | **Responsable**: Backend Dev

**Contexto**: Crear scripts para tareas comunes de mantenimiento.

**Acción Específica**:

Crear `scripts/maintenance/`:

1. Script de vacuum y analyze:
```typescript
// scripts/maintenance/vacuum-db.ts
import { createClient } from '@/lib/supabaseServer';

async function vacuumDatabase() {
    const supabase = await createClient();

    console.log('Starting VACUUM ANALYZE...');
    
    const { error } = await supabase.rpc('vacuum_analyze_tables');

    if (error) {
        console.error('Error during VACUUM:', error);
        process.exit(1);
    }

    console.log('VACUUM ANALYZE completed successfully');
}

vacuumDatabase();
```

2. Script de limpieza de logs antiguos:
```typescript
// scripts/maintenance/clean-old-logs.ts
import { createClient } from '@/lib/supabaseServer';

async function cleanOldLogs() {
    const supabase = await createClient();

    console.log('Deleting logs older than 90 days...');

    const { error } = await supabase
        .from('financial_alerts')
        .delete()
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .eq('is_resolved', true);

    if (error) {
        console.error('Error deleting old logs:', error);
        process.exit(1);
    }

    console.log('Old logs deleted successfully');
}

cleanOldLogs();
```

3. Script de health check:
```typescript
// scripts/maintenance/health-check.ts
async function healthCheck() {
    const checks = [
        { name: 'Database', check: checkDatabase },
        { name: 'Auth', check: checkAuth },
        { name: 'Storage', check: checkStorage }
    ];

    console.log('Running health checks...');

    for (const { name, check } of checks) {
        try {
            await check();
            console.log(`✅ ${name}: OK`);
        } catch (error) {
            console.error(`❌ ${name}: FAILED`);
            console.error(error);
            process.exit(1);
        }
    }

    console.log('All health checks passed');
}

async function checkDatabase() {
    const supabase = await createClient();
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    if (error) throw error;
}

// ... otros checks

healthCheck();
```

4. Agregar a package.json:
```json
{
    "scripts": {
        "maintenance:vacuum": "tsx scripts/maintenance/vacuum-db.ts",
        "maintenance:clean-logs": "tsx scripts/maintenance/clean-old-logs.ts",
        "maintenance:health-check": "tsx scripts/maintenance/health-check.ts"
    }
}
```

**Criterio de Aceptación**:
- [ ] Scripts de mantenimiento creados
- [ ] Scripts funcionan correctamente
- [ ] Agregados a package.json
- [ ] Documentados en README

---

#### 4.3.2 GitHub Actions de Mantenimiento
**Prioridad**: BAJA | **Tiempo**: 2 horas | **Responsable**: DevOps

**Contexto**: Automatizar mantenimiento en CI/CD.

**Acción Específica**:

Crear `.github/workflows/maintenance.yml`:
```yaml
name: Maintenance Tasks

on:
  schedule:
    - cron: '0 2 * * 0' # Cada domingo a las 2 AM
  workflow_dispatch:

jobs:
  vacuum:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run VACUUM
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run maintenance:vacuum

  clean-logs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Clean old logs
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run maintenance:clean-logs
```

**Criterio de Aceptación**:
- [ ] Workflow creado
- [ ] Scripts ejecutados exitosamente
- [ ] Programación configurada (cron)
- [ ] Secrets configurados

---

### Resumen Fase 4

| Tarea | Prioridad | Tiempo | Estado |
|-------|-----------|--------|--------|
| Logging estructurado (Pino) | ALTA | 4h | ⏳ Pendiente |
| Integración con Axiom | MEDIA | 3h | ⏳ Pendiente |
| Monitoreo Supabase | MEDIA | 2h | ⏳ Pendiente |
| Virtualización de tablas | MEDIA | 4h | ⏳ Pendiente |
| Modo offline (SWR) | BAJA | 5h | ⏳ Pendiente |
| Scripts de mantenimiento | MEDIA | 3h | ⏳ Pendiente |
| GitHub Actions mantenimiento | BAJA | 2h | ⏳ Pendiente |

**Total Tiempo Estimado**: 23 horas (2.9 días de trabajo)

**Criterio de Éxito Fase 4**:
- [ ] Logging estructurado implementado
- [ ] Logs centralizados en Axiom
- [ ] Performance monitoreada
- [ ] UI optimizada con virtualización
- [ ] Mantenimiento automatizado

---

## Resumen General del Plan

### Timeline Resumido

| Fase | Duración | Horas Estimadas | Estado |
|------|----------|-----------------|--------|
| Fase 1: Estabilización y Calidad | 3 semanas | 26h | 🟡 En Planeación |
| Fase 2: Integridad de Datos | 3 semanas | 28h | ⏳ Pendiente |
| Fase 3: Motor Financiero | 3 semanas | 25h | ⏳ Pendiente |
| Fase 4: Excelencia Operativa | 3+ semanas | 23h | ⏳ Pendiente |

**Total**: 102 horas (~12.7 días de trabajo concentrado)

### Métricas de Éxito

**Antes del Plan (Febrero 2026)**:
- ❌ 151 errores de ESLint
- ❌ 7 errores de TypeScript
- ⚠️ Uso extensivo de `any`
- ⚠️ Documentación desactualizada

**Después del Plan (Mayo 2026)**:
- ✅ 0 errores de ESLint
- ✅ 0 errores de TypeScript
- ✅ Tipado estricto en todo el código
- ✅ Documentación completa y actualizada
- ✅ Integridad de datos garantizada
- ✅ Sistema de alertas proactivo
- ✅ Logging estructurado y monitoreo

### Próximos Pasos Inmediatos

1. **Revisar y aprobar esta hoja de ruta**
2. **Asignar responsables para cada tarea**
3. **Comenzar con Fase 1.1.1** (Eliminar `any` en Server Actions)
4. **Configurar seguimiento de progreso** (GitHub Projects, Jira, etc.)
5. **Reunión semanal de revisión** de avances

---

## Documentación Relacionada

- `README.md` - Visión general del proyecto
- `ARCHITECTURE.md` - Arquitectura técnica
- `docs/api-contracts.md` - Contratos de API (pendiente)
- `docs/db-schema.md` - Esquema de base de datos (pendiente)
- `PROJECT_STATUS.md` - Estado actual del proyecto

---

**Versión**: 1.0  
**Fecha**: 18 de Febrero, 2026  
**Autor**: ControlHub Tech Team  
**Estado**: ✅ Lista para ejecución
