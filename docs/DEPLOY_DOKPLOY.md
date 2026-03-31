# Dokploy Deployment

Short guide to deploy this project using Docker Compose in Dokploy.

## 1) Requirements

- Dokploy running on your server.
- Repository connected to Dokploy (GitHub).
- main branch up to date.

## 2) Create Compose Service

1. In Dokploy, create a service of type Compose.
2. Configure GitHub provider:
   - Repository: Api-WhatsApp
   - Branch: main
   - Compose Path: ./docker-compose.yml
3. Save and run Deploy.

## 3) Suggested Domains

- Frontend: ws.erickvillon.dev -> service frontend, port 3000.
- Backend: ws-api.erickvillon.dev -> service backend, port 3001.
- Do not expose db directly.

## 4) Environment Variables

Configure secrets in Dokploy before final deploy:

- DB: POSTGRES_*, DATABASE_URL
- Auth: JWT_SECRET, JWT_REFRESH_SECRET
- Encryption: ENCRYPTION_KEY, BACKUP_ENCRYPTION_KEY
- OAuth/SMTP if enabled

References: ENV_SETUP.md and SECRETS_CHECKLIST.md.

## 5) Post-Deploy Validation

Run smoke test:

- SMOKE_TEST.md

Expected result:

- db, backend, frontend in healthy/running state.
- No schema errors in logs (42703, 42P01).
- Login and protected routes working without loops.

## 6) Useful Server Commands

```bash
APP=whatsapp-api-ws-wbkwmt
BASE=/etc/dokploy/compose/$APP/code/docker-compose.yml

docker compose -f "$BASE" -p "$APP" ps
docker compose -f "$BASE" -p "$APP" logs --since=20m backend
```
