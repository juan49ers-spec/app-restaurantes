# Informe de Fase 0 - Saneamiento antes de informes

Fecha: 2026-05-25
Estado: completada con bloqueos externos documentados.

## 1. Objetivo de la fase

Preparar la app para crecer hacia una gestion profesional de restaurantes y futuros informes fiables, eliminando atajos criticos que podian contaminar datos, romper multi-restaurante o generar conclusiones falsas.

Esta fase no crea todavia el modulo de informes. Su funcion es limpiar la base.

## 2. Cambios realizados

### 2.1 Seguridad multi-restaurante en Finanzas

Archivos:

- `src/app/actions/financial-control.ts`
- `src/app/actions/resultados.ts`
- `src/components/financial-control/ResultadosDashboard.tsx`

Antes:

- Algunas actions usaban `restaurant_id` recibido desde formularios cliente.
- `insertMonthlyTestData()` podia caer en `restaurantId || "1"`.
- `closeMonth()` recibia `restaurantId` desde la UI.

Ahora:

- `upsertDailySales()` resuelve el restaurante activo en servidor.
- `upsertOperatingExpense()` resuelve el restaurante activo en servidor.
- `updateOperatingExpense()` y `deleteOperatingExpense()` filtran por restaurante activo.
- `upsertMonthlyTarget()` resuelve el restaurante activo en servidor.
- `closeMonth()` solo recibe `monthYear`; el restaurante se resuelve en servidor.
- Se elimino el fallback `"1"` en resultados mensuales.

Impacto:

- Menos riesgo de IDOR.
- Menos riesgo de escribir datos en otro restaurante.
- Base mas segura para snapshots e informes.

### 2.2 Correccion de Equipo / Staff

Archivos:

- `src/app/staff/employees/page.tsx`
- `src/app/staff/employees/ClientEmployeesView.tsx`
- `src/app/actions/staff.ts`
- `src/app/actions/staff-actions.ts`
- `src/components/staff/ShiftBoard.tsx`
- `src/components/staff/ShiftForm.tsx`

Antes:

- `/staff/employees` usaba `user.user_metadata?.restaurant_id || "1"`.
- Esto ya habia producido error real: `invalid input syntax for type uuid: "1"`.
- Varias mutations de staff recibian `restaurant_id` desde cliente.
- Habia dos archivos de actions (`staff.ts` y `staff-actions.ts`) con patrones distintos.

Ahora:

- `/staff/employees` usa `getUserRestaurant()`.
- Si no hay restaurante activo, redirige a `/onboarding`.
- `getEmployees()` resuelve el restaurante en servidor.
- `upsertEmployee()`, `toggleEmployeeStatus()` y `deleteEmployee()` ignoran `restaurant_id` del cliente.
- `upsertShift()` y `deleteShift()` resuelven el restaurante en servidor.
- El archivo legacy `staff-actions.ts` tambien fue saneado para no quedar como via insegura.

Impacto:

- La pantalla de equipo ya no depende de `"1"`.
- Las mutaciones de personal quedan alineadas con el protocolo multi-tenant.
- Queda pendiente consolidar `staff.ts` y `staff-actions.ts` en una sola fuente.

### 2.3 Staff Efficiency sin datos falsos

Archivo:

- `src/app/actions/staff-optimization.ts`

Antes:

- El calculo de tendencia usaba `Math.random()`.
- Se consultaba `base_salary_monthly`, pero el schema documentado usa `monthly_base_salary`.

Ahora:

- Se consulta `monthly_base_salary`.
- La tendencia compara contra el periodo anterior de la misma duracion.
- Se elimina el uso de `Math.random()` en el analisis de eficiencia.
- El restaurante activo se resuelve en servidor.

Impacto:

- Los datos de eficiencia dejan de ser simulados.
- Este modulo queda mas cerca de poder alimentar informes profesionales de horarios.

### 2.4 Sidebar movil

Archivo:

- `src/components/layout/Sidebar.tsx`

Antes:

- Radix `SheetContent` no tenia `SheetTitle`, generando warning/error de accesibilidad.

Ahora:

- El drawer movil incluye `SheetTitle` accesible con `sr-only`.

Impacto:

- Mejora accesibilidad.
- Reduce ruido de errores en validacion frontend.

### 2.5 Objetivo mensual a cero

Archivo:

- `src/app/financial-control/client.tsx`

Antes:

- Si el objetivo mensual era `0`, la UI podia mostrar "Objetivo superado".

Ahora:

- `0` se trata como "sin meta configurada".
- La UI invita a configurar una meta en lugar de celebrar un falso objetivo.

Impacto:

- Evita mensajes financieros engañosos.

## 3. Documentacion actualizada

Archivos:

- `docs/ai/04-financial-control.md`
- `docs/ai/14-staff.md`

Actualizaciones:

- Se documento que las actions ignoran `restaurant_id` enviado por cliente.
- Se documento el comportamiento de objetivo mensual a cero.
- Se documento que staff efficiency ya no debe usar datos aleatorios.
- Se documento que `staff.ts` y `staff-actions.ts` siguen duplicados y deben consolidarse.

No se modifico `docs/ai/T10-ai-insights.md` porque hay una contradiccion con el codigo: la doc lista `ai-insights.ts`, pero el archivo no existe. Segun el protocolo del repo, el codigo gana y esa decision debe tratarse de forma explicita en una fase posterior.

## 4. Verificaciones ejecutadas

### TypeScript

Comando:

```bash
npm run typecheck
```

Resultado:

- Pasa correctamente.

### Build

Comando:

```bash
npm run build
```

Resultado:

- La compilacion de Next y TypeScript pasa.
- El build falla despues, en prerender de `/_global-error`, con `Cannot read properties of null (reading 'useContext')`.
- Este fallo parece externo a los cambios de Fase 0 y relacionado con la configuracion/layout global.

Warnings observados:

- `NODE_ENV` no estandar.
- Next infiere una raiz de workspace superior por multiples lockfiles.
- `middleware` esta deprecado en favor de `proxy`.
- Warnings de keys en metadata/head.

### Lint

Comando:

```bash
npm run lint
```

Resultado:

- ESLint no llega a revisar codigo.
- Falla por configuracion con `Converting circular structure to JSON` relacionado con `eslint-plugin-react` y ESLint 9.

### Rutas locales

Comprobaciones HTTP:

- `GET /financial-control` responde `200`.
- `GET /staff/employees` responde `200`.
- `GET /` responde `200`.

### Busqueda de patrones criticos

Se comprobo que en los archivos tocados ya no aparecen:

- fallback `"1"` para `restaurant_id`.
- `base_salary_monthly` en staff optimization.
- `Math.random()` en staff optimization.

Quedan `Math.random()` en seeds/demo y en asignacion visual de color de empleados, no en calculos de informes.

## 5. Riesgos pendientes

### P1 - Consolidar actions duplicadas de staff

Hay dos capas:

- `src/app/actions/staff.ts`
- `src/app/actions/staff-actions.ts`

Ambas fueron saneadas, pero tener dos fuentes aumenta riesgo de divergencia.

Recomendacion:

- En Fase 1 o antes del informe horario, elegir una capa oficial y retirar la otra.

### P1 - Resolver build global

El build falla en `/_global-error`, aunque TypeScript y compilacion pasan.

Recomendacion:

- Abrir tarea tecnica separada para revisar layout/global-error/provider tree.

### P1 - Arreglar lint config

ESLint falla por configuracion, no por codigo.

Recomendacion:

- Ajustar config para ESLint 9 o fijar version compatible.

### P1 - Schema drift de proveedores

No se corrigio en esta fase:

- `price_history` sigue teniendo discrepancias entre actions y migraciones.

Recomendacion:

- Atacarlo antes de construir rankings de proveedores en informes.

### P2 - Formula oficial de Menu Engineering

No se corrigio en esta fase:

- Hay contradiccion entre formula de action, libreria y docs.

Recomendacion:

- Resolver antes de construir informe de rentabilidad de carta.

## 6. Conclusion clara

Fase 0 quita deuda critica de seguridad y fiabilidad en los modulos base de finanzas y personal. La app esta mejor preparada para crecer como sistema de gestion de restaurantes.

Todavia no es momento de crear informes finales. El siguiente paso correcto es Fase 1: modelo de informes y snapshots, pero antes o en paralelo conviene resolver el build global y la configuracion de lint para tener una tuberia de calidad estable.
