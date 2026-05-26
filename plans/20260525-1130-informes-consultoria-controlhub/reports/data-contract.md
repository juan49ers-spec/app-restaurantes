# Contrato de datos para informes

Fecha: 2026-05-25

Este documento define que datos debe producir cada informe, de donde salen y que advertencias deben aparecer cuando falte informacion.

## 1. Principios

- El informe publicado se renderiza desde snapshot, no desde tablas vivas.
- Los builders calculan metricas; la IA solo redacta.
- Cada seccion tiene `confidence` y `warnings`.
- El cliente nunca envia `restaurant_id`.
- Las aproximaciones se declaran como warning.
- Las importaciones externas pasan por preview y confirmacion.

## 2. Financial Annual Report

Kind: `financial_annual`

Periodo: año natural o rango custom.

### Seccion `executive_summary`

Datos:

- ingresos netos.
- beneficio neto.
- margen neto.
- EBITDA.
- margen bruto.
- break-even diario.
- dias con venta.
- ticket medio si existe base de transacciones.

Fuentes:

- `monthly_results`
- `daily_sales`
- `operating_expenses`

Warnings:

- meses sin cierre.
- dias sin datos.
- objetivos mensuales ausentes.
- efectivo/tarjeta estimado o no disponible.

### Seccion `pnl`

Datos:

- ingresos.
- COGS.
- margen bruto.
- gastos personal.
- gastos operativos.
- EBITDA.
- impuestos.
- resultado neto.
- comparativa mensual/anual.

Fuentes:

- `monthly_results`
- `operating_expenses`

Warnings:

- categorias no mapeadas.
- datos de impuestos ausentes.
- resultados manuales que no cuadran con gastos/ventas.

### Seccion `revenue_trends`

Datos:

- ingresos por mes.
- variacion mensual.
- media diaria.
- dias fuertes/debiles.
- ventas por canal si existe.

Fuentes:

- `daily_sales`

Warnings:

- faltan dias.
- dias con cero no distinguibles de dias cerrados.
- delivery no separado si no existe canal.

### Seccion `weekday_heatmap`

Datos:

- matriz mes x dia de semana.
- media por dia.
- peso de cada dia sobre total.

Fuentes:

- `daily_sales`

Warnings:

- calendario incompleto.
- dias cerrados no configurados.

### Seccion `expenses`

Datos:

- gastos por categoria.
- ratio sobre ventas.
- objetivo si existe.
- desviacion.

Fuentes:

- `operating_expenses`
- `monthly_targets`
- reglas internas de categoria.

Warnings:

- gasto sin categoria.
- objetivo ausente.
- categorias legacy mezcladas con categorias nuevas.

### Seccion `suppliers`

Datos:

- ranking proveedores.
- gasto alimentacion/bebida.
- concentracion top 5.
- variaciones de precio si existen.

Fuentes candidatas:

- `invoices`
- `invoice_items`
- `suppliers`
- `supplier_items`
- `price_history`

Warnings:

- schema `price_history` inconsistente.
- proveedor no asociado a factura.
- compra sin categoria.

## 3. Financial Monthly Report

Kind: `financial_monthly`

Reutiliza las secciones del anual, pero con foco:

- comparativa contra mes anterior.
- avance contra objetivo.
- detalle diario.
- resumen de cierre.

Requisito:

- Debe integrarse con `closeMonth()` o reemplazarlo con un flujo de cierre que genere snapshot.

## 4. Menu Profitability Report

Kind: `menu_profitability`

### Seccion `coverage`

Datos:

- productos activos.
- productos con escandallo.
- productos sin escandallo.
- cobertura porcentaje.
- productos fuera de carta si el sistema puede detectarlos.

Fuentes:

- `recipes`
- `recipe_ingredients`
- catalogo/menu si existe.

Warnings:

- receta sin ingredientes.
- ingrediente sin coste.
- PVP ausente.

### Seccion `margin_distribution`

Datos:

- estrella: margen >= 75%.
- saludable: margen >= 60% y < 75%.
- critico: margen < 60%.
- conteo y porcentaje.

Fuentes:

- recetas calculadas.

Warnings:

- rangos configurables pendientes.
- productos sin PVP excluidos del denominador o marcados aparte.

### Seccion `ranking`

Datos por item:

- producto.
- formato.
- coste.
- PVP.
- beneficio.
- margen porcentaje.
- unidades vendidas si existe.
- ventas netas si existe.

Fuentes:

- `recipes`
- ventas por receta.

Warnings:

- formato no mapeado.
- ventas no disponibles.

### Seccion `urgent_actions`

Datos:

- productos criticos.
- causa principal.
- accion recomendada.
- impacto estimado si se puede calcular.

Regla:

- La recomendacion debe indicar si falta subir precio, bajar coste, revisar escandallo o corregir mapeo.

## 5. Staff Schedule Efficiency Report

Kind: `staff_schedule_efficiency`

### Seccion `staffing_heatmap`

Datos:

- dia de semana.
- franja horaria.
- numero de personas.
- horas totales por dia.

Fuentes:

- `shifts`
- `employees`

Warnings:

- turnos sin empleado.
- turnos cruzando medianoche.
- horas invalidas.

### Seccion `labor_cost`

Datos:

- coste real por dia.
- coste semanal.
- coste mensual estimado.
- coste medio por hora.

Fuentes:

- empleados.
- turnos.
- salario mensual o coste hora.

Warnings:

- empleado sin coste.
- salario mensual sin horas contractuales.

### Seccion `sales_vs_labor`

Datos:

- facturacion media por dia.
- ratio personal/ventas.
- objetivo.
- desviacion economica.

Fuentes:

- `daily_sales`
- calculo coste personal.

Warnings:

- dias cerrados no configurados.
- ventas insuficientes para media.

### Seccion `legal_scenario`

Datos:

- coste legal/hora.
- coste semanal legal.
- ratio legal.
- desfase legal.
- oportunidad anual.

Parametros:

- `legal_hourly_cost`.
- `target_labor_ratio`.

Warnings:

- coste legal no configurado.

## 6. External Imports

### FRO Excel

Mapping:

- `ARQUEO`: ventas diarias y medios de pago.
- `INGRESOS EXTRA`: canales externos.
- `PERSONAL`: coste laboral.
- `COMIDA`/`BEBIDA`: COGS o compras.
- `GASTOS OPERATIVOS`, `MARKETING`, `MANTENIMIENTO`: gastos.
- `RESULTADOS`: validacion de P&L.
- `RATIOS`, `EBITDA`: validacion de calculos.
- `DIAS SEMANA`: validacion historica.
- `Ranking comida`/`Ranking bebida`: ventas por producto/categoria.

Validaciones:

- fechas parseables.
- importes numericos.
- formulas rotas.
- duplicados.
- totales por mes.

### PDF Rentabilidad

Uso recomendado:

- Fuente de referencia y fixture de QA.
- No fuente primaria automatica en MVP.

### PDF Horarios

Uso recomendado:

- Fuente de referencia y fixture de QA.
- No fuente primaria automatica en MVP.

## 7. Warnings estandar

Codigos:

- `MISSING_SALES_DAYS`
- `MISSING_MONTHLY_CLOSE`
- `MISSING_TARGET`
- `ESTIMATED_PAYMENT_SPLIT`
- `UNCATEGORIZED_EXPENSE`
- `SCHEMA_MISMATCH`
- `MISSING_RECIPE_COST`
- `MISSING_RECIPE_PRICE`
- `UNMAPPED_MENU_ITEM`
- `MISSING_EMPLOYEE_COST`
- `SHIFT_TIME_INVALID`
- `INSUFFICIENT_HISTORY`
- `EXTERNAL_IMPORT_HAS_FORMULA_ERRORS`

Cada warning debe incluir:

- `code`
- `severity`: `info`, `warning`, `blocking`
- `message`
- `source`
- `affected_count` opcional
