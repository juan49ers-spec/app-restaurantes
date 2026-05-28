# Cierre Fase 33 — Importación asistida

## Objetivo

Hacer más seguro y claro el primer paso de todos los importadores CSV: seleccionar archivo.

## Cambios aplicados

- `CsvFileInput` valida extensión/tipo antes de leer el archivo.
- Rechaza archivos que no sean `.csv`.
- Limita el tamaño por defecto a 1 MB.
- Muestra estado accesible (`role="status"`) con archivo cargado o error.
- `FinancialCsvImportPanel` usa ahora el input compartido, igual que recetas, ventas por receta, empleados, turnos y facturas.

## Seguridad

- Esta validación es solo una primera barrera UX/performance.
- Las actions siguen reparseando y revalidando en servidor.
- `restaurant_id` sigue resolviéndose server-side en todos los importadores.

## Tests

- `tests/components/CsvFileInput.test.tsx` cubre archivo válido, archivo no CSV y límite de tamaño.
- Se ejecutaron tests de todos los paneles CSV principales para comprobar que el cambio compartido no rompe los flujos existentes.

## Resultado

El consultor recibe feedback inmediato si intenta subir un archivo incorrecto o demasiado grande, sin leer contenido innecesario en el navegador y sin relajar la defensa server-side.
