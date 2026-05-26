# Cierre Fase 8 — BCG en informe profesional

Fecha: 2026-05-26

## Objetivo

Incorporar Menu Engineering al informe profesional sin recalcular en la UI, sin aceptar datos del cliente y sin convertir una matriz relativa en una recomendacion automatica.

## Qué se ha construido

- Nueva seccion `menu_engineering` dentro de `ProfessionalRestaurantReport`.
- Nueva fuente trazable `menu_engineering.report`.
- Lectura server-side del ultimo `menu_reports` con `status=ANALYZED` cuyo rango queda contenido en el periodo del informe.
- Metricas BCG profesionales:
  - reporte usado;
  - productos analizados;
  - umbral de popularidad;
  - umbral de margen de contribucion;
  - conteo STAR / PLOWHORSE / PUZZLE / DOG;
  - STAR principal;
  - PUZZLE prioritario.
- Narrativa prudente:
  - STAR como referencia;
  - PUZZLE como producto a revisar comercialmente;
  - PLOWHORSE como producto de volumen con margen a optimizar.
- Integracion en la capa de presentacion y en el capitulo "Carta".
- Persistencia compatible: el snapshot guardado en `professional_report_drafts` conserva la nueva seccion.

## Reglas de seguridad y calidad

- `restaurant_id` se resuelve solo en servidor mediante `getUserRestaurant()`.
- La query de `menu_reports` filtra por `restaurant_id`, `status=ANALYZED`, `date_from >= period.from` y `date_to <= period.to`.
- Si no existe snapshot BCG, la seccion queda `PARTIAL`; no bloquea el informe ni inventa cuadrantes.
- Si existe snapshot pero faltan clasificaciones, la seccion queda `PARTIAL`.
- La UI y la vista imprimible consumen el contrato del informe; no recalculan BCG.

## Tests añadidos

- Motor puro con snapshot BCG completo.
- Motor puro sin snapshot BCG.
- Presentacion profesional con BCG en el capitulo de carta.
- Server action cargando `menu_reports` server-side y filtrando por restaurante activo y periodo.

## Verificacion realizada

- `npx eslint --max-warnings=0`
- `npm run typecheck`
- `npm test` — 30 archivos, 317 tests.
- `npm run build`

Resultado: todo correcto.

## Decisiones conscientes

- No se modifica la seed demo en esta fase para no ampliar una mutacion grande sin test especifico del flujo completo.
- No se genera PDF server-side todavia; la salida sigue siendo HTML imprimible basada en snapshot guardado.
- No se convierte DOG en orden automatica de retirada. El informe mantiene lenguaje consultivo.
