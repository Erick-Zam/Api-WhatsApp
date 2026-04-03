# Auditoria tecnica de estabilidad e infraestructura (2026-04-02)

## Resumen ejecutivo

Se identificaron dos causas raiz principales del fallo general:

1. Caida del proceso backend por promesas no manejadas (ERR_UNHANDLED_REJECTION: "auth timeout").
2. Frontend intentando parsear como JSON respuestas 500 en texto plano ("Internal Server Error"), provocando errores de parseo y render.

Impacto observado:

- Errores 500 en endpoints criticos: /api/auth/me, /api/sessions, /api/auth/logs, /api/chats, /api/messages.
- Fallos en la seccion de chats (mensajes no cargan de forma consistente).
- Inestabilidad de infraestructura por logging masivo (bloqueo del event loop, warnings de node-cron).

## Evidencia principal (logs)

- UnhandledPromiseRejection con reason "auth timeout".
- Reinicios de backend seguidos por errores de proxy ECONNRESET/ECONNREFUSED.
- Warnings de node-cron por posible bloqueo de CPU/IO.

## Correcciones implementadas en este ciclo

### 1) Backend resiliente a errores async

Archivos:
- Backend/src/app.js
- Backend/src/whatsapp.js

Cambios:
- Se reemplazaron llamadas import().then(...) sin manejo robusto por await + try/catch en rutas y startup.
- Se agrego middleware global de errores Express con respuesta JSON consistente.
- Se agregaron handlers globales:
  - process.on('unhandledRejection', ...)
  - process.on('uncaughtException', ...)
- Se agregaron .catch en imports dinamicos de apiKeys.
- Se agrego .catch en reconexion diferida setTimeout(() => connectToWhatsApp(...)).

Resultado esperado:
- El backend deja de caerse por rechazos no manejados.
- Menos respuestas 500 por reinicio abrupto del proceso.

### 2) Frontend robusto ante respuestas no JSON

Archivos:
- frontend/src/lib/api/client.ts
- frontend/src/app/dashboard/chats/page.tsx
- frontend/src/app/dashboard/page.tsx

Cambios:
- Cliente API endurecido para:
  - validar content-type,
  - leer body como texto,
  - parsear JSON de forma segura,
  - convertir errores no JSON en mensaje controlado.
- Chats migrado a cliente API robusto para auth/me, sessions, chats, messages y envio de mensajes.
- Dashboard principal endurecido para no romperse al recibir 500 no JSON.

Resultado esperado:
- Se eliminan errores de parseo tipo Unexpected token 'I'.
- UI mantiene estado controlado aunque falle el backend.

### 3) Mejora de chats para carga de contactos/nombres

Archivos:
- frontend/src/app/dashboard/chats/page.tsx
- Backend/src/whatsapp.js

Cambios:
- Normalizacion de chats en frontend con fallback de nombre:
  - name -> telefono derivado de JID -> id.
- Manejo estable de lista de chats cuando payload viene incompleto.
- Reduccion de ruido de mensajes status@broadcast en logs.

Resultado esperado:
- Mejor consistencia de nombres de contactos en lista/cabecera.
- Menos fallos visuales por datos incompletos.

### 4) Optimizacion de infraestructura y runtime

Archivo:
- Backend/src/whatsapp.js

Cambios:
- Se redujo logging masivo por defecto en connection.update y messages.upsert.
- Se mantiene modo debug completo bajo variable de entorno DEBUG_WA_UPDATES=true.

Resultado esperado:
- Menor bloqueo de event loop.
- Menor riesgo de warnings de node-cron por carga de logging.

## Validacion ejecutada

- Verificacion de errores en archivos modificados: sin errores de analisis.
- Lint frontend: OK tras ajustes.
- Tests backend: existen fallos previos en pruebas de puppeteerAdapter no relacionados al hotfix de parseo/500.

## Riesgo residual

- Si faltan migraciones en entorno productivo (tablas/columnas auth o auditoria), algunos 500 pueden persistir hasta completar schema.
- El motor Puppeteer mantiene pruebas inestables y requiere estabilizacion separada.

## Siguientes acciones recomendadas (prioridad)

1. Ejecutar migraciones pendientes de auth/auditoria en produccion y staging.
2. Agregar endpoint de health/readiness con checks de DB + estado de sesiones.
3. Implementar pruebas E2E para flujos: auth/me, sessions, chats, messages.
4. Corregir la suite de tests de puppeteerAdapter para reflejar runtime actual.
5. Activar monitoreo de tasa 5xx y reinicios de contenedor con alerta.
