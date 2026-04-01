# Runbook Fase 4 - Tabla de Approvals (Produccion)

Este documento te da bloques de comandos para ejecutar la migracion de Fase 4 en produccion y habilitar la tabla admin_action_approvals.
La idea es usar las mismas variables reales definidas en `.env` (local y servidor), sin hardcodear credenciales en comandos.

Archivo de migracion objetivo:
- docs/database/migration_fase4_admin_approvals.sql

---

## Bloque 0 - Precheck rapido (local, antes del push)
Ejecuta desde la raiz del repo y valida que estas en modo produccion.

    git pull origin main
    git status
    test -f docs/database/migration_fase4_admin_approvals.sql && echo "OK: migration file found"
    grep "^NODE_ENV=" .env

En PowerShell (Windows):

    git pull origin main
    git status
    if (Test-Path "docs/database/migration_fase4_admin_approvals.sql") { "OK: migration file found" }
    Select-String -Path ".env" -Pattern "^NODE_ENV="

Nota:
- Si trabajas desde `C:\GitHub\Api-WhatsApp`, este runbook asume `C:\GitHub\Api-WhatsApp\.env`.

---

## Bloque 1 - Servidor: detectar contenedor y cargar variables de produccion
Conectate por SSH a tu servidor, valida contenedor y exporta variables desde el `.env` del deploy.

    ssh TU_USUARIO@TU_SERVIDOR
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep whatsapp-api-ws-wbkwmt-db
    set -a
    . /etc/dokploy/compose/whatsapp-api-ws-wbkwmt/code/.env
    set +a
    echo "$NODE_ENV"

Si ya conoces el nombre de contenedor (por tus logs):
- whatsapp-api-ws-wbkwmt-db

Esperado:
- `NODE_ENV=production`
- Variables `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` disponibles en la shell actual.

---

## Bloque 2 - Backup rapido antes de migrar (recomendado)
Crea un backup previo en el servidor.

    mkdir -p /tmp/db-backups
    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -t whatsapp-api-ws-wbkwmt-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /tmp/db-backups/pre_fase4_approvals.sql

---

## Bloque 3 - Ejecutar migracion (opcion A: archivo montado en host)
Si el repo esta en ruta Dokploy como en tus logs:
- /etc/dokploy/compose/whatsapp-api-ws-wbkwmt/code

Comando:

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /etc/dokploy/compose/whatsapp-api-ws-wbkwmt/code/docs/database/migration_fase4_admin_approvals.sql

---

## Bloque 4 - Ejecutar migracion (opcion B: copiar archivo al contenedor)
Usa esta opcion si no quieres depender de la ruta del host.

    docker cp /etc/dokploy/compose/whatsapp-api-ws-wbkwmt/code/docs/database/migration_fase4_admin_approvals.sql whatsapp-api-ws-wbkwmt-db:/tmp/migration_fase4_admin_approvals.sql
    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/migration_fase4_admin_approvals.sql

---

## Bloque 5 - Verificacion post-migracion
Verifica existencia de tabla e indices.

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt admin_action_approvals"

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d+ admin_action_approvals"

Prueba de insercion y lectura:

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "INSERT INTO admin_action_approvals (action_type, status) VALUES ('TEST_APPROVAL', 'PENDING');"

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, action_type, status, requested_at FROM admin_action_approvals ORDER BY requested_at DESC LIMIT 5;"

---

## Bloque 6 - Limpieza del registro de prueba

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM admin_action_approvals WHERE action_type = 'TEST_APPROVAL';"

---

## Bloque 7 - Rollback rapido (si hiciera falta)
Solo para emergencia inmediata.

    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP TABLE IF EXISTS admin_action_approvals;"

Si necesitas rollback total, restaura desde backup:

    cat /tmp/db-backups/pre_fase4_approvals.sql | docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i whatsapp-api-ws-wbkwmt-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

---

## Bloque 8 - Verificar endpoint en backend
Con la tabla creada, prueba endpoint de approvals.

    curl -sS -H "Authorization: Bearer TU_JWT_ADMIN" "$BACKEND_URL/api/admin/approvals?limit=10&offset=0"

Respuesta esperada:
- 200 con arreglo (aunque vacio)
- Si sale 501, la migracion no se aplico en la DB correcta

---

## Notas operativas
- Haz primero Bloque 2 (backup).
- Ejecuta solo una de las opciones de migracion: Bloque 3 o Bloque 4.
- Si el despliegue usa otra DB distinta a la del contenedor esperado, confirma variables de entorno del servicio backend antes de migrar.
- Este runbook es para produccion; no pegues credenciales en el documento ni en el historial de comandos.
