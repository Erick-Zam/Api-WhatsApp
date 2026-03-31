# Production Secrets Checklist

Use this checklist before your first production deployment.

## 1) Database

- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DB
- POSTGRES_HOST
- POSTGRES_PORT
- DATABASE_URL

## 2) Auth and Tokens

- JWT_SECRET (64 hex chars)
- JWT_REFRESH_SECRET (64 hex chars, different from JWT_SECRET)
- JWT_EXPIRY
- JWT_REFRESH_EXPIRY

## 3) Encryption

- ENCRYPTION_KEY (64 hex chars)
- BACKUP_ENCRYPTION_KEY (64 hex chars, different)

Generate secure values with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4) OAuth Providers (Optional)

### Google

- GOOGLE_OAUTH_ENABLED
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL

### GitHub

- GITHUB_OAUTH_ENABLED
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- GITHUB_CALLBACK_URL

### Microsoft

- MICROSOFT_OAUTH_ENABLED
- MICROSOFT_CLIENT_ID
- MICROSOFT_CLIENT_SECRET
- MICROSOFT_CALLBACK_URL

## 5) Email (Optional but recommended)

- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM_EMAIL
- SMTP_FROM_NAME

## 6) Platform URLs

- FRONTEND_URL
- BACKEND_INTERNAL_URL
- NEXT_PUBLIC_API_URL

## 7) Deployment Safety Rules

- Never commit real secrets to git.
- Use different secrets for each environment.
- Rotate secrets after incidents.
- Restrict CORS to trusted domains in production.

## Related Docs

- Environment setup: ENV_SETUP.md
- Dokploy deployment: DEPLOY_DOKPLOY.md
- Post-deploy checks: SMOKE_TEST.md
