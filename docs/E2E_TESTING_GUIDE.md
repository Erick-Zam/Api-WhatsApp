# Phase 3d: End-to-End Testing (e2e) - Comprehensive Guide

## Objetivo
Validar que todos los flows de pagination funcionan correctamente bajo diversas condiciones, incluyendo edge cases, rapid interactions, y scenarios de error.

## Suite de Tests Disponibles

### 📋 Test Groups (Categorized)

1. **Edge Cases** - Condiciones límite
   - Empty chat list handling
   - Single chat in list
   - Boundary items in pagination

2. **Pagination Core** - Funcionalidad principal
   - Load more chats on scroll
   - Prevent chat duplication
   - Maintain scroll position during load

3. **Session & State** - Gestión de estado
   - Preserve selected chat during pagination
   - Refresh without losing selection
   - Multi-session switching

4. **Message Pagination** - Carga de historial
   - Load older messages on scroll up
   - Display date separators
   - Message grouping by date

5. **Performance** - Rendimiento bajo carga
   - Rapid session switches (3+ switches)
   - Debounce scroll requests
   - Responsiveness under rapid actions

6. **Loading States** - UX Visual
   - Skeleton loaders during pagination
   - Shimmer effect on message loading
   - Loading indicators

7. **Error Handling** - Recuperación de errores
   - Network error graceful handling
   - Failed pagination load recovery

## Ejecutar Tests Localmente

### Prerequisitos

```bash
# Asegurar que Backend esté corriendo
cd Backend
npm run dev

# En otra terminal, asegurar que Frontend está corriendo
cd frontend
npm run dev
```

### Ejecución Básica

```bash
cd frontend

# Ejecutar todos los tests e2e
npm test

# Ejecutar solo pagination tests
npm test -- pagination.e2e.ts

# Ejecutar test específico
npm test -- pagination.e2e.ts -g "should handle empty chat list"

# Ejecutar con UI interactivo (útil para debugging)
npm test -- --ui
```

### Opciones Avanzadas

```bash
# Ejecutar con trace detallado
npm test -- --trace on

# Ejecutar en modo headed (ver navegador)
npm test -- --headed

# Ejecutar un grupo específico
npm test -- pagination.e2e.ts -g "Edge Cases"

# Ejecutar con timeout aumentado (para desarrollo lento)
npm test -- --timeout 60000

# Generar reporte HTML
npm test -- --reporter html

# Ver reporte HTML generado
npx playwright show-report
```

## Interpretación de Resultados

### ✅ Test Exitoso
```
✓ should load more chats on scroll (2.3s)
```
- El test completó sin errores
- El tiempo mostrado es el tiempo de ejecución

### ❌ Test Fallido
```
× should load more chats on scroll (2.3s)
  Error: Timeout 5000ms while waiting for locator
```
- El test detectó un problema
- Revisar el mensaje de error para detalles

### ⊘ Test Skipped
```
⊘ should handle empty chat list gracefully (skipped)
```
- El test fue saltado (verificar condiciones previas)

## Debugging de Tests Fallidos

### Información en Caso de Fallo

1. **Screenshots y Videos**
   - Automáticamente guardados en `test-results/`
   - Muestran exactamente qué estaba en pantalla en el fallo

2. **Traces (Registros detallados)**
   - Se generan con `--trace on`
   - Se pueden ver en: `npx playwright show-trace`

3. **Console Output**
   - El test muestra logs de los assertions que fallaron
   - Revisa qué locator no fue encontrado

### Procedimiento de Debugging

```bash
# 1. Ejecutar test fallido en modo headed (ver navegador)
npm test -- pagination.e2e.ts -g "test name" --headed

# 2. Si necesitas pausar/depurar:
# Agregar en test: await page.pause(); 
# Ejecutar con --headed para interactuar

# 3. Ejecutar con traces
npm test -- pagination.e2e.ts --trace on

# 4. Ver trace interactivo
npx playwright show-trace trace*.zip

# 5. Ver reporte HTML completo
npm test -- --reporter html && npx playwright show-report
```

## Escenarios de Validación

### Scenario 1: Pagination Básica
✅ **Esperado:**
- Al scrollear al 80% del chat rail, se cargan más chats
- No hay duplicados
- Scroll position se mantiene

**Validar:**
```bash
npm test -- pagination.e2e.ts -g "should load more chats on scroll"
npm test -- pagination.e2e.ts -g "should not duplicate chats"
npm test -- pagination.e2e.ts -g "should maintain scroll position"
```

### Scenario 2: Edge Cases
✅ **Esperado:**
- Lista vacía muestra mensaje "No chats found"
- Chat único se puede seleccionar
- Items en límite se cargan correctamente

**Validar:**
```bash
npm test -- pagination.e2e.ts -g "Edge Cases"
```

### Scenario 3: Rapid Sessions
✅ **Esperado:**
- Cambiar session 3 veces rápidamente no causa crash
- No hay errores en la consola
- La UI se mantiene responsiva

**Validar:**
```bash
npm test -- pagination.e2e.ts -g "should handle rapid session switches"
```

### Scenario 4: Message History
✅ **Esperado:**
- Scrollear hacia arriba en un chat carga mensajes antiguos
- Hay separadores de fecha (Hoy, Ayer, Fecha)
- Los mensajes están agrupados por día

**Validar:**
```bash
npm test -- pagination.e2e.ts -g "Message Pagination"
```

### Scenario 5: Manejo de Errores
✅ **Esperado:**
- Si red se desconecta, muestra error gracefully
- Botón Retry aparece
- Reconecta cuando red vuelve a estar disponible

**Validar:**
```bash
npm test -- pagination.e2e.ts -g "Error Handling"
```

## CI/CD Integration

### Para Ejecutar en Pipeline (GitHub Actions, etc.)

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm install
      
      - name: Install Playwright
        run: cd frontend && npx playwright install
      
      - name: Run E2E Tests
        run: cd frontend && npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Métricas de Éxito

Para completar **Phase 3d exitosamente**, todos estos tests deben pasar:

| Grupo | Tests | Requisito |
|-------|-------|-----------|
| Edge Cases | 3 | ✅ Todos |
| Pagination Core | 3 | ✅ Todos |
| Session & State | 2 | ✅ Todos |
| Message Pagination | 2 | ✅ Todos |
| Performance | 2 | ✅ Todos |
| Loading States | 2 | ✅ Todos |
| Error Handling | 2 | ✅ Todos |

**Total: 16 tests, todos deben pasar**

## Troubleshooting Común

### ❌ "Timeout waiting for locator"
**Causa:** Element no encontrado en tiempo especificado
**Solución:**
1. Verify que elemento existe en página
2. Increase timeout: `{ timeout: 10000 }`
3. Use `page.pause()` para debug

### ❌ "Session not connected"
**Causa:** Backend no está corriendo o sesión no existe
**Solución:**
1. Verificar Backend está en `npm run dev`
2. Verificar DATABASE_URL configurada correctamente
3. Crear sesión test previamente

### ❌ "Flaky test" (Sometimes passes, sometimes fails)
**Causa:** Timing/Race condition
**Solución:**
1. Increase `page.waitForTimeout()` durations
2. Use `page.waitForSelector()` en lugar de setTimeout
3. Use `page.waitForLoad()`

### ❌ "Screenshot/Trace not found"
**Causa:** Tests ejecutados sin modo `--trace on`
**Solución:**
```bash
npm test -- --trace on --reporter html
```

## Próximos Pasos Después de Validación

✅ **Si todos tests pasan:**
1. Sistema listo para **Production Deployment**
2. Ejecutar verificación BD final: `npm run db:health`
3. Hacer backup completo
4. Deploy a staging primero

❌ **Si algunos tests fallan:**
1. Review logs y screenshots en `test-results/`
2. Fix issues identificados
3. Re-run tests hasta que todos pasen
4. Commit changes a repositorio

## Documentación de Referencia

- **Playwright Docs:** https://playwright.dev
- **Test API:** https://playwright.dev/docs/api/class-test
- **Locators:** https://playwright.dev/docs/locators
- **Assertions:** https://playwright.dev/docs/test-assertions

---

**Última actualización:** Abril 6, 2026
**Fase:** 3d - End-to-End Testing
**Tests Incluidos:** 16 E2E tests en 7 categorías
**Estado de Implementación:** ✅ Completa
