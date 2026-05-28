# 14 — Staff (Equipo)

**Rutas:** `/staff/employees`, `/staff/schedule`, `/staff/policies`
**Archivos clave:** `src/app/staff/employees/page.tsx`, `src/app/staff/schedule/page.tsx`, `src/app/staff/policies/page.tsx`, `src/app/actions/staff.ts`, `src/app/actions/staff-directory.ts`, `src/app/actions/staff-scheduling.ts`, `src/app/actions/staff-import.ts`, `src/app/actions/staff-actions.ts`, `src/app/actions/staff-optimization.ts`, `src/app/actions/policy-actions.ts`, `src/components/staff/`
**Transversales relacionados:** [T02](./T02-base-de-datos.md), [T04](./T04-financial-math.md)

## 1. Propósito y rol en el negocio

Gestión integral de RRHH: directorio de empleados (con tarifas según Convenio Hostelería ES 2024-25), planificación de turnos con cálculo automático de coste laboral, y biblioteca de políticas internas (higiene, seguridad, estándares de servicio).

## 2. Viaje del usuario

### `/staff/employees`
1. Tabla de empleados con filtros por rol y estado.
2. `EmployeesCsvImportPanel` permite importar empleados desde CSV seleccionando un archivo `.csv` o pegando el contenido, con plantilla, preview, descarga de incidencias y comprobación de duplicados.
3. **Crear** → `EmployeeForm`:
   - Nombre, apellidos, teléfono, contacto emergencia.
   - Rol (enum: MANAGEMENT, KITCHEN_HEAD, KITCHEN_STAFF, FLOOR_MANAGER, FLOOR_STAFF, BAR_STAFF, CLEANING, ADMIN, OTHER).
   - `system_access_level`: ADMIN/MANAGER/STAFF/NONE (en BD; no aplicado a auth todavía).
   - Tipo de contrato: INDEFINIDO/TEMPORAL/PRACTICAS/AUTONOMO/OTRO.
   - Horas semanales contractuales (40 default).
   - Modo retribución: HOURLY/SALARIED/MIXED.
   - Tarifa horaria + salario base mensual.
   - Color (para visualizar turnos).
3. **Editar/desactivar** (soft via `status`).

### `/staff/schedule`
1. Calendario semanal (`ShiftBoard`) — empleados × días.
2. `ShiftsCsvImportPanel` permite importar turnos desde CSV seleccionando un archivo `.csv` o pegando el contenido para preparar costes laborales de periodos históricos o planificados.
3. **Drag & drop** (@dnd-kit) para asignar turnos.
4. **Crear turno** → `ShiftForm`:
   - Fecha, hora inicio, hora fin, descanso (minutos).
   - Tipo: DESAYUNO/ALMUERZO/CENA/EVENTO/OTRO.
   - Cálculo automático: `estimated_cost = horas * hourly_rate`.
5. **Forecast diario:** combina turnos planificados + ventas históricas → status `OPTIMAL`/`OVERSTAFFED`/`UNDERSTAFFED`.
6. **Vista de eficiencia:** `getStaffEfficiency` muestra `moneyLostToOverstaffing`, sugerencias con confianza 1-5 estrellas.

### `/staff/policies`
1. Tabla buscable de políticas. CRUD.
2. Campos: título, descripción, categoría (`OPERATIONS`, `HR`, `SAFETY`, `HYGIENE`, `SERVICE_STANDARDS`, `OTHER`), `is_required`, `is_published`.

## 3. Flujo técnico de datos

**Lectura:**
- `getEmployees()` — resuelve el restaurante activo en servidor con `getUserRestaurant()`.
- `getShifts(weekStart, weekEnd)` — turnos del rango.
- `getStaffingForecast(date)` — combina `shifts` + `daily_sales` históricos.
- `getStaffEfficiency()` — análisis de sobre-plantilla con sugerencias.
- `getPolicies()`.
- `validateShiftsCsvImport({ csvText })` — preflight server-side del CSV de turnos. Revalida parser, resuelve `restaurant_id`, cruza `employee_id`/`employee_name` contra `employees` del restaurante, calcula coste estimado con tarifa actual y detecta duplicados existentes por pareja exacta empleado-fecha-hora.
- `validateEmployeesCsvImport({ csvText })` — preflight server-side del CSV de empleados. Revalida parser, resuelve `restaurant_id` y detecta empleados existentes por email o nombre completo normalizado.
- `EmployeesCsvImportPanel` y `ShiftsCsvImportPanel` reutilizan `CsvFileInput`. Cambiar archivo o editar el textarea reinicia mensajes y preflight para evitar importar un CSV distinto al ya comprobado. El input compartido rechaza archivos no `.csv` y CSVs demasiado grandes antes de leerlos en navegador.

**Escritura:**
- `upsertEmployee(payload)`, `toggleEmployeeStatus(id)`, `deleteEmployee(id)` — resuelven el restaurante activo en servidor e ignoran cualquier `restaurant_id` enviado por cliente.
- `importEmployeesCsv({ csvText })` — importa empleados en `employees` con `restaurant_id` server-side tras repetir validación y preflight. No crea usuarios de auth ni permisos reales; solo plantilla operativa de equipo.
- `upsertShift(payload)` — resuelve el restaurante activo en servidor; calcula o conserva `estimated_cost` según el flujo actual.
- `importShiftsCsv({ csvText })` — importa filas nuevas en `shifts` con `restaurant_id` server-side tras repetir validación y preflight. No crea empleados; solo usa empleados existentes.
- `deleteShift(id)` — borra solo si el turno pertenece al restaurante activo.
- `upsertPolicy(payload)`, `deletePolicy(id)`.

**Formulario empleado:**
- `EmployeeModal` usa `EmployeeSchema` con `react-hook-form`/`zodResolver`; por compatibilidad de tipos con React Hook Form, el resolver se castea vía `unknown` a `Resolver<EmployeeFormValues>`.
- `wage_type` se observa con `useWatch`, no con `form.watch()` en render, para evitar avisos del React Compiler.

**Organización de actions (Fase 14.3):**
- `staff.ts` es una fachada de compatibilidad que reexporta la API pública histórica.
- `staff-directory.ts` contiene CRUD de empleados (`getEmployees`, `upsertEmployee`, `toggleEmployeeStatus`, `deleteEmployee`).
- `staff-scheduling.ts` contiene turnos y previsión (`getStaffingForecast`, `getShifts`, `upsertShift`, `deleteShift`).
- `staff-import.ts` contiene importación CSV de empleados y turnos con preview/preflight/import.
- Los logs de estas actions usan `createActionLogger()` en lugar de `console.*`.

## 4. Reglas de negocio y restricciones

- **Convenio Colectivo Hostelería 2024-25:** las tarifas sugeridas vienen de `HOURLY_RATE_SUGGESTIONS` (rango mín-máx por rol). UI muestra rango pero no fuerza límites.
- **`estimated_cost` = horas × hourly_rate.** Sin descuentos (SS, IRPF).
- **CSV de turnos:** acepta `employee_id` o `employee_name`; el servidor resuelve siempre contra `employees` del restaurante activo. Si el empleado no existe, está INACTIVE o el nombre es ambiguo, bloquea la importación.
- **Import CSV no crea empleados.** Alta de personal sigue siendo un flujo separado en `/staff/employees`.
- **CSV de empleados sí crea fichas `employees`, pero no crea usuarios de autenticación.** `system_access_level` queda `NONE` por defecto y los permisos reales de app no cambian.
- **Duplicado de empleado CSV:** se bloquea por email existente o por nombre completo normalizado existente en el restaurante activo.
- **Duplicado de turno CSV:** se considera duplicado si ya existe mismo `employee_id`, `date`, `start_time` y `end_time`.
- **`actual_cost`:** se calcula con `actual_start_time` y `actual_end_time` si están informados (time tracking).
- **Conflictos de turnos:** no hay validación de solapamiento (mismo empleado, mismo día, horas superpuestas). Drag-drop permite cualquier cosa.
- **`labor_cost_pct` óptimo:** 35% sobre ventas (target hospitality ES). `staff-optimization.ts` marca sobre-plantilla si > 45%.
- **Tendencia de eficiencia:** `staff-optimization.ts` compara contra el periodo anterior de la misma duración; no debe usar datos aleatorios o simulados en producción.
- **`monthly_targets.labor_target_pct`:** override del target por mes.
- **Sin alertas push de turnos** — solo análisis en pantalla.
- **`employees` vs `staff`:** la tabla `staff` es legacy. La UI usa `employees`.
- Visible en sidebar solo si `active_addons.includes('personal')`.

## 5. Dependencias e implicaciones cruzadas

- **Tablas:** `employees`, `shifts`, `policies`, `daily_sales` (lectura para forecast).
- **Otras páginas afectadas:**
  - `/financial-control` — `labor_cost` (en daily_sales o agregando gastos PERSONAL) es la otra cara de la moneda. Verificar que no se double-cuenta.
  - `/` (dashboard) — labor cost agregado.
  - `/operational` — eficiencia del personal.
  - `/admin/audit` — cambios en `employees` se auditan (trigger).
- **Transversales:**
  - [T02](./T02-base-de-datos.md) — esquema (incluye `staff` legacy).
  - [T04](./T04-financial-math.md) — ratios de labor cost.

## 6. Casos límite y errores conocidos

- **Solapamiento de turnos no detectado:** un empleado puede tener 2 turnos a la vez. Bug de negocio potencial.
- **Cambio de `hourly_rate` no recalcula turnos ya creados:** `estimated_cost` se guardó como snapshot. Hay que re-guardar el turno para refrescar.
- **Empleado desactivado con turnos futuros:** los turnos siguen activos. No se cancelan automáticamente.
- **Importar CSV con empleado inactivo:** se bloquea para evitar planificar costes sobre personal no vigente.
- **Importar CSV de un turno ya existente:** se bloquea antes de escribir. El consultor debe corregir el CSV o editar el turno manualmente.
- **Dos empleados con mismo nombre completo:** la importación por `employee_name` se bloquea. Usar `employee_id` en CSV cuando existan nombres repetidos.
- **Importar empleados con email repetido:** se bloquea antes de escribir. El consultor debe corregir el CSV o editar la ficha existente.
- **Tarifa fuera de rango del convenio:** UI no lo bloquea, solo informa.
- **system_access_level:** se guarda pero la auth real sigue siendo por email (ver [T03](./T03-autenticacion.md)). No se aplica como permiso de la app.
- **Políticas no publicadas (`is_published=false`):** visibles solo para gerencia (en teoría — verificar filtros en UI).
- **`employees.is_active` vs `employees.status`:** dos campos parecidos. Verificar cuál es canónico antes de filtrar.
- **Fachada legacy:** `staff.ts` ya no contiene lógica; reexporta `staff-directory.ts`, `staff-scheduling.ts` y `staff-import.ts` para no romper imports existentes. `staff-actions.ts` queda como compatibilidad legacy y también debe resolver `restaurant_id` en servidor.
- **React Hook Form + React Compiler:** evita leer `form.watch()` directamente durante render en componentes nuevos; usa `useWatch`.

## 7. Al añadir/modificar una función aquí

**Antes de tocar:**
- Confirmar qué campo manda: `is_active` (bool) o `status` (`ACTIVE`/`INACTIVE`). Probable redundancia legacy.
- Mirar `staff-optimization.ts` para entender el algoritmo de eficiencia.
- No reintroducir `restaurant_id` como dato confiable enviado por cliente. Puede seguir presente en formularios por compatibilidad visual, pero la action debe resolverlo en servidor.

**Archivos que suelen cambiar a la vez:**
- `src/app/actions/staff-directory.ts`, `staff-scheduling.ts`, `staff-import.ts`, `staff-actions.ts`, `staff-optimization.ts`, `policy-actions.ts`.
- `src/app/actions/staff.ts` solo debe cambiar si se añaden o retiran reexports públicos.
- `src/components/staff/EmployeeForm.tsx`, `ShiftBoard.tsx`, `ShiftForm.tsx`, `PolicyBoard.tsx`, `ShiftBoardCell.tsx`, `ShiftCard.tsx`.
- `src/components/staff/EmployeesCsvImportPanel.tsx` — importación CSV de plantilla de personal.
- `src/lib/importing/employees-csv.ts` — parser puro de CSV de empleados.
- `src/types/schema.ts` — `EmployeeSchema`, `ShiftSchema`, `PolicySchema`.

**Qué probar manualmente:**
- Crear empleado con tarifa en rango → guardar.
- Asignar turno → ver `estimated_cost` calculado.
- Drag-drop turno entre días → persiste.
- Marcar `actual_start_time`/`actual_end_time` → verificar `actual_cost`.
- Cambiar tarifa de empleado → ver que turnos antiguos no cambian (intencional).
- Eficiencia: forzar sobre-plantilla un día → ver `moneyLostToOverstaffing`.
- Política: crear con categoría HYGIENE → ver en tab correcto.
- Impersonación desde admin → ver datos del restaurante impersonado.

**Si añades validación de solapamiento:**
1. En `upsertShift`, antes del INSERT, query `shifts` del mismo employee/date con horas overlap.
2. Devolver error si conflicto, o avisar y permitir con flag.
3. UI: marcar visualmente en `ShiftBoardCell`.

**Si activas `system_access_level` como permiso real:**
1. Necesitas una tabla `user_employees` (o equivalente) que vincule `auth.uid()` a un `employees.id`.
2. Cambiar la lógica de admin/role en [T03](./T03-autenticacion.md) para considerar este campo.
3. Big change — requiere reflexión de producto.

**Cambios delicados:**
- Eliminar tabla `staff` legacy: revisar todas las queries antes.
- Cambiar la fórmula de `estimated_cost` (incluir SS, IRPF): cambia retroactivamente el coste reportado.
