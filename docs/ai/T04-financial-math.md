# T04 — Librería de cálculo financiero y Menu Engineering

> Transversal. Cualquier número que aparezca en pantalla relacionado con margen, food cost, prime cost, IVA, BCG, simulación o proyección sale de aquí. Revisar antes de tocar cálculos.

## Archivos

| Archivo | Qué expone |
|---------|------------|
| `src/lib/financial-math.ts` | `calculateFinancialProjection()` — modelo multiplicativo de proyección con palancas (precio, volumen, eficiencia, costos fijos) y impactos para Waterfall. |
| `src/lib/menu-engineering.ts` | `MenuEngineeringCalculator.analyze()` y `.getStats()` — clasificación BCG. |
| `src/lib/financial-constants.ts` | Constantes target/inflación/factores. |
| `src/lib/financial-utils.ts` | Helpers para dashboard de gastos (top categorías, vs target, insight summaries). |
| `src/lib/fiscal-utils.ts` | Trimestres fiscales ES, próximos vencimientos (modelos 303/111), `formatCurrency` con locale `es-ES`. |
| `src/lib/recipe-utils.ts` | `formatRecipeIngredient()` — normaliza ingrediente/sub-receta + yield. |
| `src/lib/financial-theme.ts` | Paleta de colores y estilos para gráficos. |

## Constantes que mandan

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `WEEKEND_MULTIPLIER` | 1.2 | Proyección +20% en viernes/sábado. |
| `DEFAULT_COGS_PCT` | 30% | Estimación COGS si no hay dato. |
| `DEFAULT_LABOR_PCT` | 35% | Estimación personal si no hay dato. |
| `DEFAULT_FIXED_PCT` | 35% | Estimación gastos fijos. |
| `COGS_TARGET_PCT` | 33% | Objetivo materia prima. |
| `PERSONAL_TARGET_PCT` | 33% | Objetivo coste personal. |
| `PRIME_COST_MAX_PCT` | 60% | Máximo combinado personal + COGS. |
| `PER_ALERT_IMPACT_EUR` | 50 € | Impacto estimado por alerta de spike. |

Si el restaurante tiene `monthly_targets`, esos pisos overridean los defaults para ese mes (no las constantes del archivo, sino la comparación visual).

## Modelo de proyección (`calculateFinancialProjection`)

Aplicación de palancas (ajustes) sobre una base:

```
revenue_after = baseRevenue * (1 + priceIncrease) * (1 + volumeChange)
revenue_after = revenue_after + menuEngineeringDelta   // menu impact ANTES del volumen NO; ver código
cogs_after    = (baseRevenue * cogsBasePct) * (1 - cogsReduction) * (1 + volumeChange)
labor_after   = labor_fixed_portion + labor_variable_portion * (1 + volumeChange) - laborSavings
fixed_after   = baseFixed + fixedCostAdj  // adj puede ser negativo (ahorro) o positivo (gasto)
profit_after  = revenue_after - cogs_after - labor_after - fixed_after
```

**Reglas críticas:**
- **Labor = 50% fijo + 50% variable.** Modelo estándar hospitality. Solo la mitad escala con volumen.
- **COGS = 100% variable.** Sin componente fijo.
- **Signos en `fixedCostAdj`:** negativo = ahorro, positivo = gasto extra. Para el waterfall se invierte el signo al mostrarlo como impacto sobre el profit.
- **Filtro en waterfall:** impactos con `Math.abs(impacto) < 1` se ocultan para legibilidad.

## Menu Engineering (matriz BCG)

`MenuEngineeringCalculator.analyze(items)` clasifica cada ítem en uno de los 4 cuadrantes:

```
Ejes:
  X (popularidad): quantity_sold vs avgQuantity = totalSold / N_items
  Y (rentabilidad): contribution_margin vs avgCM = totalContribution / totalSold (ponderado)

Clasificación:
  qty >= avgQty && cm >= avgCM → STAR        (alto volumen, alto margen)
  qty >= avgQty && cm <  avgCM → PLOWHORSE   (alto volumen, bajo margen)
  qty <  avgQty && cm >= avgCM → PUZZLE      (bajo volumen, alto margen)
  qty <  avgQty && cm <  avgCM → DOG         (bajo volumen, bajo margen)
```

`contribution_margin = selling_price - cost_per_unit` (unitario).

`getStats()` retorna: ingreso total, conteo por cuadrante, margen promedio ponderado, popularidad promedio.

**Implicación:** el sistema NO usa umbrales fijos (ej. 70% popularidad). Usa **promedios del propio reporte**. Una receta puede pasar de STAR a PLOWHORSE solo porque cambió la composición del reporte.

## Recipe utils

`formatRecipeIngredient()` toma una fila de `recipe_ingredients` (con join a `master_ingredients` o `recipes` para sub-receta) y devuelve un objeto UI-friendly con:

- `unit`: `base_unit` si es ingrediente maestro, `u` si es sub-receta.
- `is_sub_recipe`: bool.
- `yield_factor`: si `Math.abs(finalYield - masterYield) > 0.001` se marca como yield custom (override sobre la merma estándar del ingrediente).
- `cost_at_time`: el snapshot guardado al crear esa relación (puede divergir del coste actual del ingrediente).

## Fiscal utils

- `getFiscalQuarterInfo(date)`: devuelve trimestre (Q1-Q4), fecha de cierre y siguiente vencimiento (modelos 303 IVA / 111 IRPF) según calendario AEAT.
- `formatCurrency(value)`: locale `es-ES`, 2 decimales, símbolo €.

## Precisión decimal

- **No usa `decimal.js`.** Todo es `number` (float64).
- En tests usa `toBeCloseTo()` con tolerancia para evitar falsos negativos por errores acumulados.
- En UI: `toFixed(1)` para % y `Intl.NumberFormat('es-ES')` para moneda.
- **Riesgo:** multiplicaciones encadenadas (proyección de revenue con 3-4 palancas) pueden acumular errores de centavo. Aceptable para dashboards, peligroso si se persiste como verdad.

## Gotchas críticos

1. **Sub-recetas:** si el coste de una sub-receta cambia, las recetas padre **no** se actualizan automáticamente. El trigger `update_recipe_costs_trigger` solo dispara en cambios de `master_ingredients.current_avg_price`, no de `recipes.current_cost`. (Posible bug de negocio.)
2. **`master_ingredients.standard_waste_pct`** se guarda como decimal `0..1` (ej. 0.15 = 15%). En CSV import, si viene como porcentaje (15) se divide por 100.
3. **Cálculo de coste de receta:** `current_cost` se cachea en la tabla. Si modificas precios en SQL fuera del flujo normal, asegúrate de disparar el trigger.
4. **Order de palancas en proyección:** revenue se calcula con `(1+price) * (1+volume)`. No es lo mismo que `1 + price + volume`. Cambiar el orden cambia el resultado.
5. **`menuEngineeringDelta`:** se suma a revenue **antes** de aplicar el multiplicador de volumen en algunos contextos. Revisa el código antes de cambiar la fórmula.
6. **Prime cost:** se calcula como `laborCost + costOfGoods`. Si alguno viene de gastos con `amount` negativo (correcciones), el resultado puede ser engañoso.
7. **BCG con cero ventas:** si `totalSold = 0`, el promedio es indefinido. `calculateMatrix` debe rehusarse a clasificar (validar antes).
8. **Labor cost en recetas:** existe `hourly_rate` y `prep_time_minutes` en la tabla, pero no toda la UI lo suma al coste mostrado. Confirmar antes de afirmar márgenes.

## Reglas duras al modificar cálculos

1. **Tests primero.** `financial-math.test.ts` y `menu-engineering.test.ts` cubren los casos canónicos. Si vas a cambiar la fórmula, rompe el test, ajusta la expectativa con cuidado y deja claro en el commit por qué.
2. **No introducir librerías de decimales** sin discutir el impacto en bundle.
3. **Mantener locale `es-ES`** en todo formateo de moneda visible. Mezclar locales en exports/PDFs es una fuente conocida de bugs.
4. **No persistir** el resultado de una proyección como dato real (es always-simulación).
5. **Si añades una palanca nueva** al simulador (ej. "descuento operativo"), asegúrate de meterla en el orden correcto del modelo multiplicativo y de calcular su impacto aislado para el waterfall.
