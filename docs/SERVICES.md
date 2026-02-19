# ControlHub - Documentación de Servicios

## Índice

1. [AuditService](#auditservice)
2. [FraudGuard](#fraudguard)
3. [CashService](#cashservice)
4. [ReportService](#reportservice)

---

## AuditService

Servicio para cálculo de auditoría laboral y análisis de eficiencia.

### `calculateHourlyAudit`

Calcula el desglose de costes por hora.

```typescript
static calculateHourlyAudit(
  sales: HourlySales[],
  shifts: Shift[],
  employees: Employee[],
  targetRatio: number = 0.33
): HourlyReport[]
```

**Parámetros:**
- `sales`: Ventas por hora
- `shifts`: Turnos trabajados
- `employees`: Lista de empleados con sus tarifas
- `targetRatio`: Ratio laboral objetivo (default: 0.33 = 33%)

**Retorna:**
Array de reportes por hora con:
- `hour`: Hora del día (0-23)
- `total_sales`: Ventas totales
- `labor_cost`: Coste laboral total
- `labor_ratio`: Ratio laboral (coste/ventas)
- `kitchen_cost`: Coste de cocina
- `room_cost`: Coste de sala
- `status`: 'OPTIMO' | 'ALERTA' | 'CRITICO'

**Ejemplo:**
```typescript
const audit = AuditService.calculateHourlyAudit(
  sales,
  shifts,
  employees,
  0.33
);
```

---

### `calculateFinancialLoss`

Calcula la pérdida financiera por exceso de ratio laboral.

```typescript
static calculateFinancialLoss(
  report: HourlyReport,
  targetRatio: number
): number
```

**Retorna:** Pérdida en euros (0 si no hay pérdida).

**Fórmula:**
```
Coste Ideal = Ventas × Ratio Objetivo
Pérdida = Coste Real - Coste Ideal
```

---

### `generateAIInsights`

Genera insights estratégicos basados en los datos de auditoría.

```typescript
static generateAIInsights(reports: HourlyReport[]): string
```

**Retorna:** Texto con análisis y recomendaciones.

**Incluye:**
- Análisis de horas críticas
- Proyección anual de pérdidas
- Recomendaciones de staffing

---

## FraudGuard

Sistema de detección de anomalías en cierres de caja.

### `analyze`

Analiza un cierre de caja en busca de patrones sospechosos.

```typescript
static analyze(
  current: CashClosing,
  history: CashClosing[],
  tolerance: number
): FraudAlert[]
```

**Parámetros:**
- `current`: Cierre de caja actual
- `history`: Historial de cierres (últimos 30 días)
- `tolerance`: Tolerancia en euros para descuadres

**Retorna:** Array de alertas detectadas.

**Tipos de alertas:**

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| `RECURRING` | medium | Faltas recurrentes en el historial |
| `SEVERE` | critical | Impacto grande (5x tolerancia) |
| `PERFECT` | low | Cuadres perfectos sospechosos (4+ días) |

**Ejemplo:**
```typescript
const alerts = FraudGuard.analyze(
  todayClosing,
  last30DaysClosings,
  5 // €5 de tolerancia
);

if (alerts.length > 0) {
  alerts.forEach(alert => {
    console.log(`${alert.severity}: ${alert.message}`);
  });
}
```

---

## CashService

Utilidades para manejo de efectivo y cierres de caja.

### `calculateRealTotal`

Calcula el total real a partir del desglose de denominaciones.

```typescript
static calculateRealTotal(breakdown: CashDenomination[]): number
```

**Ejemplo:**
```typescript
const total = CashService.calculateRealTotal([
  { value: 50, count: 2, total: 100 },
  { value: 20, count: 3, total: 60 }
]);
// total = 160
```

---

### `getInitialBreakdown`

Obtiene el desglose inicial vacío con todas las denominaciones.

```typescript
static getInitialBreakdown(): CashDenomination[]
```

**Retorna:** Array con 15 denominaciones (7 billetes + 8 monedas) con count=0.

**Denominaciones incluidas:**
- Billetes: 500, 200, 100, 50, 20, 10, 5
- Monedas: 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01

---

### `calculateVariance`

Calcula la diferencia entre sistema y conteo real.

```typescript
static calculateVariance(
  systemAmount: number,
  realAmount: number
): { difference: number; status: 'balanced' | 'shortage' | 'surplus' }
```

---

## ReportService

Generación de reportes PDF.

### `generateDailyReport`

Genera un reporte PDF del día.

```typescript
static async generateDailyReport(
  restaurantName: string,
  date: string,
  stats: {
    totalSales: number;
    totalLaborCost: number;
    laborRatio: string;
    totalLoss: number;
  },
  auditData: HourlyReport[],
  insights: string
): Promise<void>
```

**Características del PDF:**
- Header con logo y datos del restaurante
- Tarjetas de resumen financiero
- Insights de IA
- Tabla detallada por horas
- Colores semáforo (verde/amarillo/rojo)

**Ejemplo:**
```typescript
await ReportService.generateDailyReport(
  'Mi Restaurante',
  '2026-01-23',
  {
    totalSales: 2500,
    totalLaborCost: 875,
    laborRatio: '35%',
    totalLoss: 50
  },
  auditData,
  insights
);
```

**Nota:** Este método carga jsPDF dinámicamente para optimizar el bundle.

---

## Tipos de Datos

### HourlyReport

```typescript
interface HourlyReport {
  hour: number;
  total_sales: number;
  labor_cost: number;
  labor_ratio: number;
  kitchen_cost: number;
  room_cost: number;
  status: 'OPTIMO' | 'ALERTA' | 'CRITICO';
}
```

### CashClosing

```typescript
interface CashClosing {
  id: string;
  restaurant_id: string;
  date: string;
  total_system: number;  // Ventas según TPV
  total_real: number;    // Dinero contado
  difference: number;    // Real - Sistema
  cash_breakdown: CashDenomination[];
  status: 'draft' | 'closed' | 'disputed';
}
```

### FraudAlert

```typescript
interface FraudAlert {
  type: 'RECURRING' | 'SEVERE' | 'PERFECT';
  severity: 'low' | 'medium' | 'critical';
  message: string;
}
```

---

## Ejemplos Completos

### Ejemplo 1: Auditoría completa del día

```typescript
import { AuditService } from './services/AuditService';

function performDailyAudit(
  sales: HourlySales[],
  shifts: Shift[],
  employees: Employee[],
  targetRatio: number
) {
  // 1. Calcular auditoría por hora
  const audit = AuditService.calculateHourlyAudit(
    sales, shifts, employees, targetRatio
  );
  
  // 2. Calcular pérdidas totales
  const totalLoss = audit.reduce((acc, report) => {
    return acc + AuditService.calculateFinancialLoss(report, targetRatio);
  }, 0);
  
  // 3. Generar insights
  const insights = AuditService.generateAIInsights(audit);
  
  return { audit, totalLoss, insights };
}
```

### Ejemplo 2: Cierre de caja con detección de fraude

```typescript
import { CashService } from './services/CashService';
import { FraudGuard } from './services/FraudGuard';

async function processCashClosing(
  closing: CashClosing,
  history: CashClosing[],
  tolerance: number
) {
  // 1. Calcular total real
  const realTotal = CashService.calculateRealTotal(closing.cash_breakdown);
  
  // 2. Calcular diferencia
  const variance = realTotal - closing.total_system;
  
  // 3. Detectar anomalías
  const alerts = FraudGuard.analyze(
    { ...closing, total_real: realTotal, difference: variance },
    history,
    tolerance
  );
  
  // 4. Si hay alertas críticas, notificar
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    notifyManager(criticalAlerts);
  }
  
  return { realTotal, variance, alerts };
}
```

### Ejemplo 3: Generar y enviar reporte por email

```typescript
import { ReportService } from './services/ReportService';

async function generateAndSendReport(
  restaurant: Restaurant,
  date: string,
  auditData: HourlyReport[]
) {
  // Calcular estadísticas
  const stats = {
    totalSales: auditData.reduce((a, b) => a + b.total_sales, 0),
    totalLaborCost: auditData.reduce((a, b) => a + b.labor_cost, 0),
    laborRatio: calculateAverageRatio(auditData),
    totalLoss: calculateTotalLoss(auditData)
  };
  
  const insights = AuditService.generateAIInsights(auditData);
  
  // Generar PDF
  await ReportService.generateDailyReport(
    restaurant.name,
    date,
    stats,
    auditData,
    insights
  );
  
  // El PDF se descarga automáticamente
}
```

---

## Testing

Los servicios incluyen tests unitarios:

```bash
npm test
```

### Tests disponibles:

- `AuditService.test.ts` - Tests de cálculo de auditoría
- `fraudGuard.test.ts` - Tests de detección de fraude
- `cashService.test.ts` - Tests de cálculo de efectivo

### Ejemplo de test:

```typescript
import { describe, it, expect } from 'vitest';
import { AuditService } from './AuditService';

describe('AuditService', () => {
  it('debe calcular ratio laboral correctamente', () => {
    const sales = [{ hour: 12, net_sales: 100 }];
    const shifts = [/* ... */];
    const employees = [/* ... */];
    
    const result = AuditService.calculateHourlyAudit(
      sales, shifts, employees, 0.33
    );
    
    expect(result[0].labor_ratio).toBe(0.45);
  });
});
```
