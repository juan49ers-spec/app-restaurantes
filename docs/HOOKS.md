# ControlHub - Documentación de Hooks

## Índice

1. [Hooks de Datos (useData)](#hooks-de-datos)
2. [Hooks de Inventario](#hooks-de-inventario)
3. [Hooks de Recetas](#hooks-de-recetas)
4. [Hooks de Operaciones Diarias](#hooks-de-operaciones-diarias)
5. [Prefetching](#prefetching)

---

## Hooks de Datos

### `useRestaurant`

Obtiene el restaurante asociado a un ownerId.

```typescript
const { data, isLoading, error } = useRestaurant(ownerId: string | undefined)
```

**Parámetros:**
- `ownerId`: ID del propietario (UUID)

**Retorna:**
- `data`: `Restaurant | null` - Datos del restaurante
- `isLoading`: `boolean` - Estado de carga
- `error`: `Error | null` - Error si ocurre

**Configuración de caché:**
- `staleTime`: 5 minutos
- `gcTime`: 10 minutos

**Ejemplo:**
```typescript
const { data: restaurant, isLoading } = useRestaurant(user?.id);
```

---

### `useUserRestaurants`

Obtiene todos los restaurantes de un propietario.

```typescript
const { data, isLoading, error } = useUserRestaurants(ownerId: string | undefined)
```

**Retorna:**
- `data`: `Restaurant[]` - Lista de restaurantes

**Configuración de caché:**
- `staleTime`: 5 minutos
- `gcTime`: 10 minutos

---

### `useEmployees`

Obtiene los empleados activos de un restaurante.

```typescript
const { data, isLoading, error } = useEmployees(restaurantId: string | undefined)
```

**Retorna:**
- `data`: `Employee[]` - Lista de empleados activos (is_active = true)

**Configuración de caché:**
- `staleTime`: 2 minutos
- `gcTime`: 5 minutos

**Nota:** Solo retorna empleados activos, ordenados por nombre.

---

### `useHourlySales`

Obtiene las ventas por hora de una fecha específica.

```typescript
const { data, isLoading, error } = useHourlySales(
  restaurantId: string | undefined,
  date: string // Formato: YYYY-MM-DD
)
```

**Retorna:**
- `data`: `HourlySales[]` - Ventas por hora

**Configuración de caché:**
- `staleTime`: 1 minuto (datos pueden cambiar frecuentemente)
- `gcTime`: 5 minutos

---

### `useShifts`

Obtiene los turnos de una fecha específica.

```typescript
const { data, isLoading, error } = useShifts(
  restaurantId: string | undefined,
  date: string // Formato: YYYY-MM-DD
)
```

**Retorna:**
- `data`: `Shift[]` - Lista de turnos

**Configuración de caché:**
- `staleTime`: 30 segundos (turnos pueden cambiar durante el día)
- `gcTime`: 2 minutos

---

### `useShiftsRange`

Obtiene turnos en un rango de fechas.

```typescript
const { data, isLoading, error } = useShiftsRange(
  restaurantId: string | undefined,
  startDate: string,
  endDate: string
)
```

**Configuración de caché:**
- `staleTime`: 2 minutos
- `gcTime`: 5 minutos

---

### `useCogs`

Obtiene el Cost of Goods Sold (COGS) de una fecha.

```typescript
const { data, isLoading, error } = useCogs(
  restaurantId: string | undefined,
  date: string
)
```

**Retorna:**
- `data`: `DailyCogs | null` - Datos de COGS

**Configuración de caché:**
- `staleTime`: 2 minutos
- `gcTime`: 5 minutos

---

### `useWeeklyAudit`

Obtiene datos de auditoría de la última semana.

```typescript
const { data, isLoading, error } = useWeeklyAudit(
  restaurantId: string | undefined,
  endDate: string
)
```

**Retorna:**
- `data`: `Array<{date, totalSales, totalLabor, ratio}>` - Datos semanales

**Configuración de caché:**
- `staleTime`: 5 minutos
- `gcTime`: 10 minutos

**Nota:** Calcula automáticamente el ratio laboral para cada día.

---

### `useMonthlyAudit`

Obtiene datos de auditoría de un mes completo.

```typescript
const { data, isLoading, error } = useMonthlyAudit(
  restaurantId: string | undefined,
  year: number,
  month: number // 0-11
)
```

**Configuración de caché:**
- `staleTime`: 10 minutos (datos mensuales son estables)
- `gcTime`: 30 minutos

---

## Hooks de Inventario

### `useInventoryItems`

Obtiene todos los items de inventario.

```typescript
const { data, isLoading, error } = useInventoryItems(restaurantId: string | undefined)
```

**Retorna:**
- `data`: `InventoryItem[]` - Items ordenados por nombre

**Configuración de caché:**
- `staleTime`: 3 minutos
- `gcTime`: 5 minutos

---

### `useStockCounts`

Obtiene los conteos de stock de una fecha.

```typescript
const { data, isLoading, error } = useStockCounts(
  restaurantId: string | undefined,
  date: string
)
```

**Configuración de caché:**
- `staleTime`: 2 minutos
- `gcTime`: 5 minutos

---

### `useWasteRecords`

Obtiene registros de mermas de una fecha.

```typescript
const { data, isLoading, error } = useWasteRecords(
  restaurantId: string | undefined,
  date: string
)
```

**Configuración de caché:**
- `staleTime`: 1 minuto (mermas pueden registrarse frecuentemente)
- `gcTime`: 3 minutos

---

## Hooks de Recetas

### `useDishes`

Obtiene todos los platos/recetas.

```typescript
const { data, isLoading, error } = useDishes(restaurantId?: string)
```

**Configuración de caché:**
- `staleTime`: 5 minutos (recetas no cambian frecuentemente)
- `gcTime`: 10 minutos

---

### `useDishIngredients`

Obtiene los ingredientes de un plato.

```typescript
const { data, isLoading, error } = useDishIngredients(dishId: string | undefined)
```

**Configuración de caché:**
- `staleTime`: 5 minutos
- `gcTime`: 10 minutos

---

## Hooks de Operaciones Diarias

### `useDailySales`

Obtiene las ventas diarias consolidadas.

```typescript
const { data, isLoading, error } = useDailySales(
  restaurantId: string | undefined,
  date: string
)
```

**Configuración de caché:**
- `staleTime`: 1 minuto
- `gcTime`: 5 minutos

---

### `useDailyCogs`

Obtiene el COGS diario.

```typescript
const { data, isLoading, error } = useDailyCogs(
  restaurantId: string | undefined,
  date: string
)
```

**Configuración de caché:**
- `staleTime`: 2 minutos
- `gcTime`: 5 minutos

---

## Prefetching

### `usePrefetch`

Hook para precargar datos anticipadamente.

```typescript
const {
  prefetchDashboardData,
  prefetchAdjacentDates,
  prefetchInventoryData,
  prefetchEmployeeData,
  prefetchInitialData
} = usePrefetch()
```

### `prefetchDashboardData`

Precarga datos del dashboard para una fecha.

```typescript
prefetchDashboardData(restaurantId: string, date: string)
```

**Precarga:**
- Ventas por hora
- Turnos
- COGS

---

### `prefetchAdjacentDates`

Precarga datos de fechas adyacentes (anterior y siguiente).

```typescript
prefetchAdjacentDates(restaurantId: string, currentDate: string)
```

**Uso típico:** En el selector de fechas del Header.

---

### `prefetchInventoryData`

Precarga datos de inventario.

```typescript
prefetchInventoryData(restaurantId: string)
```

**Precarga:**
- Items de inventario
- Platos/recetas

---

### `prefetchEmployeeData`

Precarga datos de empleados.

```typescript
prefetchEmployeeData(restaurantId: string)
```

---

### `prefetchInitialData`

Precarga completa al iniciar la app.

```typescript
prefetchInitialData(restaurantId: string, date: string)
```

**Precarga:**
- Dashboard actual
- Inventario
- Empleados
- Fechas adyacentes

---

## Mutaciones

### `useCreateRestaurant`

Crea un nuevo restaurante.

```typescript
const mutation = useCreateRestaurant()

// Uso
await mutation.mutateAsync({ name: string, ownerId: string })
```

**Invalida:** `['restaurants']`

---

### `useUpsertDailySales`

Guarda o actualiza ventas diarias.

```typescript
const mutation = useUpsertDailySales(restaurantId: string, date: string)

// Uso
await mutation.mutateAsync(data: DailySales)
```

**Invalida:** `['dailySales', restaurantId, date]`

---

### `useUpsertDailyCogs`

Guarda o actualiza COGS diario.

```typescript
const mutation = useUpsertDailyCogs(restaurantId: string, date: string)

// Uso
await mutation.mutateAsync(data: DailyCogs)
```

**Invalida:** `['dailyCogs', restaurantId, date]`

---

## Notas Importantes

### Estrategia de Caché

Los hooks están configurados con diferentes tiempos de caché según la volatilidad de los datos:

- **Datos estáticos** (restaurantes, recetas): 5-10 minutos
- **Datos semi-estáticos** (empleados, inventario): 2-3 minutos
- **Datos dinámicos** (ventas, turnos): 30 segundos - 1 minuto
- **Datos históricos** (auditoría mensual): 10-30 minutos

### Manejo de Errores

Todos los hooks retornan un objeto `error` que puede usarse para mostrar mensajes al usuario:

```typescript
const { data, error, isLoading } = useRestaurant(ownerId);

if (error) {
  return <ErrorMessage error={error} />;
}
```

### Estado de Carga

Use `isLoading` para mostrar estados de carga:

```typescript
const { data, isLoading } = useEmployees(restaurantId);

if (isLoading) {
  return <LoadingSpinner />;
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Dashboard con datos del día

```typescript
function Dashboard() {
  const { activeRestaurant } = useSessionStore();
  const { selectedDate } = useUIStore();
  
  const { data: sales } = useHourlySales(activeRestaurant?.id, selectedDate);
  const { data: shifts } = useShifts(activeRestaurant?.id, selectedDate);
  const { data: employees } = useEmployees(activeRestaurant?.id);
  
  // Calcular métricas...
}
```

### Ejemplo 2: Navegación con prefetching

```typescript
function DateSelector() {
  const { prefetchAdjacentDates } = usePrefetch();
  const { activeRestaurant } = useSessionStore();
  const { selectedDate } = useUIStore();
  
  useEffect(() => {
    if (activeRestaurant?.id && selectedDate) {
      prefetchAdjacentDates(activeRestaurant.id, selectedDate);
    }
  }, [activeRestaurant?.id, selectedDate]);
  
  // Renderizar selector...
}
```

### Ejemplo 3: Formulario con mutación

```typescript
function SalesForm() {
  const { activeRestaurant } = useSessionStore();
  const { selectedDate } = useUIStore();
  const mutation = useUpsertDailySales(activeRestaurant?.id || '', selectedDate);
  
  const handleSubmit = async (data: DailySales) => {
    try {
      await mutation.mutateAsync(data);
      toast.success('Guardado exitosamente');
    } catch (error) {
      toast.error('Error al guardar');
    }
  };
  
  // Renderizar formulario...
}
```
