# ControlHub - Arquitectura del Proyecto

## Resumen Ejecutivo

ControlHub es una aplicación de gestión financiera para restaurantes construida con React, TypeScript y Supabase. Sigue una arquitectura moderna con separación clara de responsabilidades, optimización de rendimiento y accesibilidad.

## Stack Tecnológico

### Frontend
- **React 19** - UI Library
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Estilos utilitarios
- **Radix UI** - Componentes primitivos accesibles
- **TanStack Query** - Gestión de estado del servidor
- **Zustand** - Gestión de estado del cliente
- **Recharts** - Visualización de datos

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL - Base de datos
  - Auth - Autenticación
  - Realtime - Actualizaciones en tiempo real
  - Storage - Almacenamiento de archivos

### Testing
- **Vitest** - Framework de testing
- **Playwright** - Tests E2E
- **@testing-library/react** - Tests de componentes

## Estructura de Carpetas

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI reutilizables
│   ├── analytics/      # Componentes de análisis
│   ├── cash/           # Componentes de caja
│   └── suppliers/      # Componentes de proveedores
├── hooks/              # Custom React Hooks
├── services/           # Lógica de negocio
├── store/              # Estado global (Zustand)
├── repositories/       # Acceso a datos
├── types/              # Definiciones de tipos
├── lib/                # Utilidades y configuraciones
├── constants/          # Constantes
└── docs/               # Documentación
```

## Arquitectura de Datos

### Flujo de Datos

```
UI Component
    ↓
Custom Hook (useData)
    ↓
Repository (Supabase)
    ↓
Supabase Client
    ↓
PostgreSQL + RLS
```

### Patrón Repository

Los repositories abstraen el acceso a datos:

```typescript
// repositories/supabaseRepository.ts
export class SupabaseEmployeeRepository implements IEmployeeRepository {
  async getAll(restaurantId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, restaurant_id, name, hourly_rate, role, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data;
  }
}
```

### Caché con TanStack Query

Configuración de caché por tipo de dato:

| Tipo de Dato | staleTime | gcTime | Descripción |
|--------------|-----------|--------|-------------|
| Restaurantes | 5 min | 10 min | Datos estáticos |
| Empleados | 2 min | 5 min | Cambian ocasionalmente |
| Ventas | 1 min | 5 min | Datos dinámicos |
| Turnos | 30 seg | 2 min | Muy dinámicos |
| Inventario | 3 min | 5 min | Semi-estáticos |

## Optimizaciones de Rendimiento

### 1. Code Splitting

Componentes cargados con lazy loading:

```typescript
const Dashboard = lazy(() => import('./components/Dashboard'));
const ShiftManager = lazy(() => import('./components/ShiftManager'));
// ... etc
```

### 2. Bundle Optimization

Chunks manuales en Vite:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'recharts': ['recharts'],
        'jspdf': ['jspdf', 'jspdf-autotable'],
        'radix-ui': ['@radix-ui/*'],
      }
    }
  }
}
```

### 3. Prefetching Inteligente

Sistema de prefetching basado en navegación:

```typescript
// usePrefetch.ts
const prefetchAdjacentDates = useCallback((restaurantId, currentDate) => {
  // Prefetch día anterior y siguiente
  prefetchDashboardData(restaurantId, prevDate);
  prefetchDashboardData(restaurantId, nextDate);
}, []);
```

### 4. Optimización de Imágenes

Componente OptimizedImage con lazy loading:

```typescript
<OptimizedImage
  src={imageUrl}
  alt="Descripción"
  loading="lazy"
  decoding="async"
/>
```

## Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas:

```sql
-- Política para restaurantes
CREATE POLICY "Owners manage own restaurants" 
ON public.restaurants 
FOR ALL 
USING (owner_id = auth.uid());

-- Función helper para verificar acceso
CREATE FUNCTION is_owner_of(target_restaurant_id UUID) 
RETURNS BOOLEAN 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants 
    WHERE id = target_restaurant_id 
    AND owner_id = auth.uid()
  );
$$;
```

### Autenticación

- JWT tokens gestionados por Supabase Auth
- Refresh automático de tokens
- Sesiones persistentes

## Accesibilidad (a11y)

### Cumplimiento WCAG 2.1

- **Nivel A**: Skip links, labels, focus visible
- **Nivel AA**: Contraste de color, redimensionamiento

### Componentes Accesibles

```typescript
// SkipLink para navegación por teclado
<SkipLink />

// FormField con labels y errores asociados
<FormField
  label="Email"
  htmlFor="email"
  required
  error={errors.email}
>
  <Input ... />
</FormField>
```

## Testing

### Estructura de Tests

```
src/
├── services/
│   ├── AuditService.test.ts
│   ├── fraudGuard.test.ts
│   └── cashService.test.ts
└── tests/
    └── auth.spec.ts (E2E)
```

### Cobertura Actual

- **12 tests unitarios** pasando
- Tests de servicios críticos de negocio
- Tests E2E de autenticación

## PWA (Progressive Web App)

### Características

- **Offline**: Service Worker con Workbox
- **Installable**: Manifest configurado
- **Responsive**: Diseño mobile-first
- **Precache**: 58 assets cacheados

### Configuración

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'ControlHub - Gestión de Restaurantes',
    short_name: 'ControlHub',
    // ...
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}']
  }
})
```

## Base de Datos

### Esquema Principal

```
restaurants
├── id (PK)
├── owner_id (FK -> auth.users)
├── name
├── settings (JSON)
└── created_at

employees
├── id (PK)
├── restaurant_id (FK)
├── name
├── hourly_rate
├── role (SALA | COCINA)
└── is_active

hourly_sales
├── id (PK)
├── restaurant_id (FK)
├── date
├── hour
└── net_sales

shifts
├── id (PK)
├── employee_id (FK)
├── date
├── start_time
└── end_time
```

### Índices

Índices críticos para rendimiento:

```sql
-- Búsquedas frecuentes
CREATE INDEX employees_restaurant_id_idx ON employees(restaurant_id);
CREATE INDEX hourly_sales_restaurant_id_date_idx ON hourly_sales(restaurant_id, date);
CREATE INDEX shifts_restaurant_id_date_idx ON shifts(restaurant_id, date);
```

## Convenciones de Código

### Nomenclatura

- **Componentes**: PascalCase (`ExecutiveDashboard.tsx`)
- **Hooks**: camelCase con prefijo `use` (`usePrefetch.ts`)
- **Servicios**: PascalCase con sufijo `Service` (`AuditService.ts`)
- **Tipos**: PascalCase (`HourlyReport`, `CashClosing`)

### Estilos

- Tailwind CSS con clases utilitarias
- Componentes UI en `src/components/ui/`
- Variantes con `cn()` de `class-variance-authority`

### Commits

Formato: `tipo(scope): descripción`

```
feat(audit): add financial loss calculation
fix(auth): resolve login redirect issue
docs(readme): update architecture section
```

## Despliegue

### Requisitos

- Node.js 20+
- Cuenta de Supabase
- Variables de entorno configuradas

### Variables de Entorno

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Build

```bash
npm install
npm run build
```

El build se genera en `/dist` listo para desplegar en:
- Vercel
- Netlify
- GitHub Pages
- Cualquier CDN estático

## Métricas de Rendimiento

### Bundle Size (gzip)

| Chunk | Tamaño | Descripción |
|-------|--------|-------------|
| index | 148 KB | Bundle principal |
| recharts | 119 KB | Gráficos (lazy) |
| jspdf | 136 KB | PDFs (lazy) |
| radix-ui | 37 KB | Componentes UI |

### Lighthouse Scores (Estimado)

- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 90+

## Contribución

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'feat: add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Proyecto privado - Todos los derechos reservados.

## Contacto

Para soporte o consultas: soporte@controlhub.com
