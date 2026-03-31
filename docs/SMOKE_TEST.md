# Smoke Test Post Deploy

Usa este flujo para validar una entrega en produccion.

## 1) Salud de servicios

```bash
APP=whatsapp-api-ws-wbkwmt
BASE=/etc/dokploy/compose/$APP/code/docker-compose.yml

docker compose -f "$BASE" -p "$APP" ps
```

## 2) Verificacion de esquema (migraciones auth)

```bash
docker compose -f "$BASE" -p "$APP" exec -T db sh -lc '
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('\''email_verification'\'','\''trusted_devices'\'')
ORDER BY table_name;

SELECT column_name
FROM information_schema.columns
WHERE table_name = '\''api_users'\''
  AND column_name = '\''email_verified'\'';
"
'
```

## 3) Logs backend sin errores de esquema

```bash
docker compose -f "$BASE" -p "$APP" logs --since=20m backend \
| grep -Ei "42703|42P01|email_verified|trusted_devices" \
|| echo "sin errores de esquema"
```

## 4) Flujo auth modal-only

- Abrir `/login` y confirmar redirect a `/?auth=login`.
- Abrir `/register` y confirmar redirect a `/?auth=register`.
- Login correcto -> acceso a `/dashboard`.
- Navegar a `/dashboard/settings`, `/dashboard/admin`, `/dashboard/logs` sin rebotes.

## 5) Estado de sesion

- Hard refresh en dashboard/settings.
- Cerrar sesion, volver a iniciar, repetir navegacion.
- Si hay rebote, limpiar `localStorage` y repetir.

## 6) Validacion Multi-Engine (Fase Orchestrator)

- Ejecutar migracion de engine modes en backend:
  - `cd Backend`
  - `npm run migrate:engine-modes`
- Verificar configuracion de engine por sesion (JWT):
  - `GET /sessions/:sessionId/engine`
  - `GET /sessions/available-engines`
  - `PUT /sessions/:sessionId/engine` con `engineType=baileys`
  - `GET /sessions/:sessionId/health`
  - `GET /sessions/:sessionId/metrics?limit=20`
- Enviar mensajes por endpoints API (`/messages/text`, `/messages/image`, `/messages/video`) y confirmar respuesta `success: true`.
- Confirmar que rutas legacy (`/messages/reaction`, `/messages/reply`, `/messages/presence`) siguen operando.
- Cambiar a `engineType=puppeteer` y validar respuesta controlada (sin crash del backend).
- Intentar switch de engine en sesion `CONNECTED` y validar bloqueo con `409` (requiere estado `DISCONNECTED`).

## Criterio de PASS

- Servicios arriba.
- Sin errores `42703` o `42P01` en logs recientes.
- Login y rutas protegidas estables.
- Sin loops de redireccion.
- Endpoints de engine config/health operativos.
- Endpoint de metrics operativo y devolviendo muestras recientes.
- Mensajeria core operando via orquestador con fallback seguro.
