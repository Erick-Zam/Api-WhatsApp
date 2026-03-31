# Environment Setup

This guide contains the minimum environment configuration for local, staging, and production.

## 1) Create Environment File

From project root:

```bash
cp .env.example .env.local
```

Edit .env.local with your real values.

## 2) Required Variables

```env
NODE_ENV=development

POSTGRES_USER=admin
POSTGRES_PASSWORD=change-me
POSTGRES_DB=whatsapp_saas
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgres://admin:change-me@db:5432/whatsapp_saas

BACKEND_PORT=3001
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=/api
BACKEND_INTERNAL_URL=http://backend:3001

JWT_SECRET=<64-hex>
JWT_REFRESH_SECRET=<64-hex-different>
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

ENCRYPTION_KEY=<64-hex>
BACKUP_ENCRYPTION_KEY=<64-hex-different>
```

## 3) Optional Integration Variables

Use these only if the feature is enabled in your environment.

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=WhatsApp API SaaS

# OAuth
GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/oauth/google/callback

GITHUB_OAUTH_ENABLED=false
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
GITHUB_CALLBACK_URL=http://localhost:3001/auth/oauth/github/callback

MICROSOFT_OAUTH_ENABLED=false
MICROSOFT_CLIENT_ID=<microsoft-client-id>
MICROSOFT_CLIENT_SECRET=<microsoft-client-secret>
MICROSOFT_CALLBACK_URL=http://localhost:3001/auth/oauth/microsoft/callback
```

## 4) Generate Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run the command multiple times to generate distinct values for:

- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- BACKUP_ENCRYPTION_KEY

## 5) Run Local Stack

```bash
docker compose up -d

cd Backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

## 6) Security Recommendations

- Do not commit .env.local.
- Use different secrets for dev, staging, and production.
- Restrict CORS in production to real domains.
- Rotate secrets after incidents or credential exposure.

## 7) Related Docs

- Production secrets: SECRETS_CHECKLIST.md
- Dokploy deployment: DEPLOY_DOKPLOY.md
- Post-deploy validation: SMOKE_TEST.md
    └── ENV_SETUP.md     ← This file
```

---

## ✅ Validation

After creating `.env.local`, the application validates all variables:

### Backend Validation
```javascript
// runs on startup
import config from './config/env.js'
// Throws error if required vars are missing or invalid
```

### Frontend Validation
```typescript
// runs at build time
import { env } from '@/config/env'
// Throws error if NEXT_PUBLIC_* vars are missing
```

---

## 🔒 Security Best Practices

### DO ✅
- Generate strong secrets (use generators above)
- Use different secrets for dev/staging/prod
- Rotate secrets regularly
- Store in secure password manager (1Password, LastPass)
- Use `.env.local` locally (gitignored)
- Use Dokploy/GitHub Secrets in production
- Audit who has access to production variables
- Enable MFA on OAuth apps

### DON'T ❌
- Never commit `.env.local` to Git
- Never share secrets via email/Slack/Discord
- Never use same secret for multiple environments
- Never use weak/predictable secrets
- Never log sensitive variables
- Never expose secrets in Docker logs
- Never hardcode secrets in code

---

## 🚀 Production Deployment

### Dokploy Environment Configuration

In Dokploy dashboard:
1. Go to your service → Environment tab
2. Add each variable from `.env.example`
3. Use STRONG values for:
   - JWT_SECRET
   - ENCRYPTION_KEY
   - BACKUP_ENCRYPTION_KEY
   - POSTGRES_PASSWORD
   - All OAuth secrets

**DO NOT:**
- Leave variables blank
- Use example values
- Copy from development

### Docker Compose in Production
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Or set NODE_ENV
NODE_ENV=production docker-compose up -d
```

---

## 🆘 Troubleshooting

### "DATABASE_URL is not set"
```bash
# Make sure database section in docker-compose.yml 
# matches your DATABASE_URL
# Example:
# postgres://admin:password@db:5432/whatsapp_saas
```

### "JW_SECRET must be as least 32 characters"
```bash
# Generate new secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste into JWT_SECRET in .env.local
```

### "CORS errors: Missing origin"
```bash
# Check CORS_ALLOWED_ORIGINS includes your frontend URL
# development: http://localhost:3000
# production: https://ws.erickvillon.dev
```

### "OAuth: Redirect URI mismatch"
```bash
# Make sure GOOGLE_CALLBACK_URL, GITHUB_CALLBACK_URL, etc
# match exactly what's configured in your OAuth app settings
# ⚠️ http vs https matters!
# ⚠️ trailing slash matters!
# ⚠️ exact port matters!
```

---

## 📞 Support

For issues with environment setup:
1. Check the validation error message
2. Review the relevant section above
3. Generate new secrets if needed
4. Verify OAuth redirect URIs are exact matches

