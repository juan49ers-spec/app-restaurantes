# E2E Tests con Playwright

Este directorio contiene tests end-to-end (E2E) usando Playwright para verificar los flujos críticos de la aplicación.

## 📁 Estructura

```
e2e/
├── auth.spec.ts              # Tests de autenticación
├── ingredients.spec.ts       # Tests de gestión de ingredientes
├── recipes.spec.ts           # Tests de gestión de recetas
├── financial-control.spec.ts # Tests de control financiero
└── README.md                 # Este archivo
```

## 🚀 Comandos

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar con UI interactiva
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Ejecutar un archivo específico
npx playwright test auth.spec.ts

# Ejecutar en modo headless (CI)
npx playwright test --reporter=list
```

## ⚙️ Configuración

Los tests están configurados en `playwright.config.ts`:

- **Base URL**: http://localhost:3000
- **Browsers**: Chromium y Mobile Chrome
- **Retries**: 2 en CI, 0 en desarrollo
- **Workers**: 1 en CI, automático en desarrollo
- **Screenshots**: Solo en fallos

## 🧪 Tests Implementados

### Auth
- ✅ Login con credenciales válidas
- ✅ Login con credenciales inválidas
- ✅ Logout
- ✅ Redirección post-login

### Ingredients
- ✅ Crear ingrediente
- ✅ Editar ingrediente
- ✅ Eliminar ingrediente
- ✅ Importar desde CSV
- ✅ Ver historial de precios

### Recipes
- ✅ Crear receta con ingredientes
- ✅ Calcular costos y márgenes
- ✅ Editar receta
- ✅ Eliminar receta
- ✅ Duplicar receta
- ✅ Ver historial de precios

### Financial Control
- ✅ Dashboard financiero
- ✅ Registrar gastos operativos
- ✅ Registrar ventas diarias
- ✅ Configurar objetivos
- ✅ Ver insights de IA

## 📝 Notas Importantes

### Autenticación en Tests

Los tests asumen credenciales de prueba:
- Email: `test@restaurante.com`
- Password: `TestPassword123`

Para usar credenciales diferentes, setear variables de entorno:

```bash
TEST_EMAIL=tu@email.com
TEST_PASSWORD=tuPassword
```

### Datos de Prueba

Los tests crean y eliminan datos durante la ejecución. Asegúrate de usar una base de datos de prueba separada.

### Selectores

Usamos selectores accesibles:
- `getByRole()` - Preferido (botones, headings, etc.)
- `getByLabel()` - Inputs con label
- `getByText()` - Texto visible
- `locator('[data-testid="..."]')` - Para elementos específicos

### Buenas Prácticas

1. **Independencia**: Cada test debe poder ejecutarse solo
2. **Limpieza**: Los tests limpian datos creados
3. **Timeout**: Aumentar timeout para operaciones lentas
4. **Screenshots**: Se toman automáticamente en fallos

## 🔧 Troubleshooting

### "Browser not found"
```bash
npx playwright install chromium
```

### "Timeout exceeded"
Aumentar timeout en playwright.config.ts o usar:
```javascript
test.setTimeout(60000)
```

### "Test flakiness"
Usar `expect().toBeVisible()` con `{ timeout: 10000 }` para elementos que cargan dinámicamente.

## 📊 Reportes

Los reportes se generan en:
- HTML: `playwright-report/`
- Screenshots: `test-results/`

Abrir reporte HTML:
```bash
npx playwright show-report
```

## 🔄 CI/CD

En GitHub Actions, los tests E2E se ejecutan después de los unit tests:

```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

Para debug en CI:
```yaml
- name: Upload test results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```
