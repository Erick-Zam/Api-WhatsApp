# 🔐 Environment Setup Guide

## Overview

This guide explains how to properly configure environment variables for the **WhatsApp API SaaS** project across all environments (development, staging, production).

---

## ⚡ Quick Start (Development)

### 1. Clone the Repository
```bash
git clone https://github.com/erick-zam/Api-WhatsApp.git
cd Api-WhatsApp
```

### 2. Create Local Environment File
```bash
# Copy the example file
cp .env.example .env.local

# Edit with your values (see sections below)
code .env.local  # or use your preferred editor
```

### 3. Generate Secure Secrets

```bash
# Generate JWT_SECRET (64-character hex string)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate BACKUP_ENCRYPTION_KEY
node -e "console.log('BACKUP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy these values into your `.env.local` file.

### 4. Start Docker Compose
```bash
# Development (default)
docker-compose up -d

# Production (if using prod file)
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Run Backend
```bash
cd Backend
npm install
npm run dev
# Server running on http://localhost:3001
```

### 6. Run Frontend
```bash
cd ../frontend
npm install
npm run dev
# Dashboard running on http://localhost:3000
```

---

## 📋 Environment Variables by Section

### **NODE_ENV**
```
Values: development | staging | production
Default: development

Description: Determines which environment the app is running in.
- development: Debug logs, local database
- staging: Like production but for testing
- production: Optimized, minimal logs, real database
```

---

### **DATABASE CONFIGURATION**

```
POSTGRES_USER=admin
POSTGRES_PASSWORD=your-strong-password
POSTGRES_DB=whatsapp_saas
POSTGRES_HOST=db                    # "db" when using Docker
POSTGRES_PORT=5432

DATABASE_URL=postgres://admin:password@db:5432/whatsapp_saas
```

**Security Notes:**
- ✅ Minimum 16 characters for `POSTGRES_PASSWORD`
- ✅ Never use generic passwords like "password"
- ✅ Generate with: `openssl rand -base64 16` or `node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"`

**In Docker:**
- `POSTGRES_HOST=db` (uses internal Docker network)
- `POSTGRES_PORT=5432` (internal port, not exposed)

**Local Connection (outside Docker):**
- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432` (make sure port is exposed in docker-compose.yml)

---

### **BACKEND SERVER CONFIG**

```
BACKEND_PORT=3001                           # Port Backend listens on
BACKEND_HOST=0.0.0.0                        # Listen on all interfaces
BACKEND_URL=http://localhost:3001           # Dev: local URL
BACKEND_URL=https://ws-api.erickvillon.dev  # Prod: public URL
```

---

### **FRONTEND CONFIG**

```
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000          # Dev
FRONTEND_URL=https://ws.erickvillon.dev     # Prod

NEXT_PUBLIC_API_URL=/api
# This is the API URL exposed to the browser
# Uses Next.js rewrites: /api/* → Backend
# In production: could be https://ws-api.erickvillon.dev if standalone

BACKEND_INTERNAL_URL=http://backend:3001
# Internal Docker URL used by Next.js server-side rewrites
```

---

### **JWT AUTHENTICATION** ⭐ CRITICAL

```
JWT_SECRET=your-64-character-random-hex-string
# Used to sign JWT tokens
# ⚠️ MUST be 32+ characters (64 hex = 32 bytes)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

JWT_EXPIRY=7d
# Token expiration: 7d, 24h, 1h, etc. Format: https://github.com/vercel/ms

JWT_REFRESH_SECRET=different-64-character-string
# Separate secret for refresh tokens (MUST be different from JWT_SECRET)

JWT_REFRESH_EXPIRY=30d
# Refresh token expires after 30 days
```

**Security Rules:**
- 🔴 Never hardcode these
- 🔴 Never commit to Git
- 🔴 Regenerate in production
- ✅ Use different secrets for dev/staging/prod
- ✅ Only share via secure channels (1Password, LastPass, etc)

---

### **API RATE LIMITING**

```
API_RATE_LIMIT_WINDOW_MS=900000
# 15 minutes = 15 * 60 * 1000 ms
# Time window for counting requests

API_RATE_LIMIT_MAX_REQUESTS=3000
# Max 3000 requests per window per IP

API_RATE_LIMIT_AUTH_WINDOW_MS=3600000
# 1 hour for stricter auth endpoint limits

API_RATE_LIMIT_AUTH_MAX_REQUESTS=10
# Max 10 login attempts per hour per IP
```

**Examples:**
- Develop mode: Higher limits
- Production: Lower limits (prevent abuse)
- Per-user limits can be configured separately in database

---

### **CORS CONFIGURATION**

```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
# Development: both local URLs

CORS_ALLOWED_ORIGINS=https://ws.erickvillon.dev,https://ws-api.erickvillon.dev
# Production: only your domains

CORS_CREDENTIALS=true
# Allow cookies/credentials in CORS requests

CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-API-Key
```

⚠️ **Production Note:** Always restrict CORS! Never use `*` in production.

---

### **LOGGING**

```
LOG_LEVEL=info
# debug: Very verbose, includes all requests
# info: Important info + errors
# warn: Warnings and errors only
# error: Errors only
# fatal: Critical errors only

LOG_FORMAT=json
# json: Structured logs (better for parsing)
# pretty: Human-readable (better for development)

PINO_LOG_LEVEL=info
# Pino logger level (same scale as above)
```

**Recommendation:**
- Development: `LOG_LEVEL=debug, LOG_FORMAT=pretty`
- Production: `LOG_LEVEL=warn, LOG_FORMAT=json`

---

### **ENCRYPTION & SECURITY** 🔐

```
ENCRYPTION_KEY=your-64-character-hex-string
# Encrypts:
# - WhatsApp session data (auth_info_baileys)
# - API keys stored in database
# - Sensitive user data
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

BACKUP_ENCRYPTION_KEY=different-64-character-string
# Key for encrypting backups
# MUST be different from ENCRYPTION_KEY

SESSION_ENCRYPTION_ENABLED=true
# Encrypt session storage on disk
```

---

### **WHATSAPP BAILEYS**

```
BAILEYS_DEBUG=false
# Disable debug logging from Baileys library

BAILEYS_LOG_LEVEL=error
# error, warn, info, debug

WHATSAPP_MESSAGE_RATE_LIMIT=10
# Max messages per minute per session
# Prevents WhatsApp bans

WHATSAPP_RETRY_MAX_ATTEMPTS=5
# Retry failed messages up to 5 times

WHATSAPP_SESSION_IDLE_TIMEOUT=3600
# Auto-logout after 1 hour of inactivity
```

---

### **EMAIL CONFIGURATION** 📧

Required for:
- Email verification on registration
- Password reset emails
- OTP codes

```
SMTP_HOST=smtp.gmail.com          # Gmail example
SMTP_PORT=587                      # TLS port
SMTP_USER=noreply@erickvillon.dev
SMTP_PASSWORD=your-app-password    # NOT your Gmail password!

SMTP_FROM_EMAIL=noreply@erickvillon.dev
SMTP_FROM_NAME=WhatsApp API SaaS
SMTP_TLS_ENABLED=true
```

**Gmail Setup:**
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the App Password in `SMTP_PASSWORD` (NOT your regular password)

**Alternative Providers:**
- SendGrid: `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`
- Mailgun: `SMTP_HOST=smtp.mailgun.org`
- Postmark: `SMTP_HOST=smtp.postmarkapp.com`

**Development:**
```
MOCK_EMAIL_SENDING=true
# Don't actually send emails, just log them
```

---

### **OAUTH2 CONFIGURATION** 🔑

#### **Google OAuth**
```
GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/oauth/google/callback
```

**Setup:**
1. Go to Google Cloud Console: https://console.cloud.google.com
2. Create OAuth 2.0 credential (Web Application)
3. Add Authorized redirect URIs:
   - Dev: `http://localhost:3001/auth/oauth/google/callback`
   - Prod: `https://ws-api.erickvillon.dev/auth/oauth/google/callback`

#### **GitHub OAuth**
```
GITHUB_OAUTH_ENABLED=true
GITHUB_CLIENT_ID=your-github-app-id
GITHUB_CLIENT_SECRET=your-github-app-secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/oauth/github/callback
```

**Setup:**
1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL:
   - Dev: `http://localhost:3001/auth/oauth/github/callback`
   - Prod: `https://ws-api.erickvillon.dev/auth/oauth/github/callback`

#### **Microsoft OAuth**
```
MICROSOFT_OAUTH_ENABLED=true
MICROSOFT_CLIENT_ID=your-app-id
MICROSOFT_CLIENT_SECRET=your-app-secret
MICROSOFT_CALLBACK_URL=http://localhost:3001/auth/oauth/microsoft/callback
```

**Setup:**
1. Go to Azure Portal: https://portal.azure.com
2. App registrations → New registration
3. Add Redirect URI: `http://localhost:3001/auth/oauth/microsoft/callback`

---

### **AUDIT & COMPLIANCE** 📊

```
AUDIT_LOG_ENABLED=true
# Enable audit logging (all actions recorded)

AUDIT_LOG_SENSITIVE_ACTIONS=true
# Log password changes, permission updates, etc.

GDPR_ENABLED=true
# Enable GDPR features: export data, delete account

DATA_RETENTION_DAYS=365
# Auto-delete non-essential logs after 1 year

AUTO_DELETE_AUDIT_LOGS_DAYS=2555
# 7 years (GDPR/SOC2 compliance requirement)
```

---

### **BACKUP & DISASTER RECOVERY** 💾

```
BACKUP_ENABLED=true
# Enable automated backups

BACKUP_SCHEDULE_CRON=0 2 * * *
# Unix cron expression
# 0 2 * * * = 2 AM every day
# Common examples:
# 0 */4 * * *  = Every 4 hours
# 0 0 * * 1    = Every Monday at midnight
# 0 0 */7 * *  = Every 7 days

BACKUP_RETENTION_DAYS=30
# Keep backups for 30 days, delete older ones

BACKUP_COMPRESS=true
# Gzip compression to save disk space
```

**Optional S3 Upload:**
```
BACKUP_UPLOAD_S3=true
AWS_S3_BUCKET=whatsapp-saas-backups
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

---

### **MONITORING & ERROR TRACKING** 🚨

```
SENTRY_ENABLED=false
# Enable Sentry for error tracking

# SENTRY_DSN=https://your-key@sentry.io/project-id
```

If enabled:
1. Create account at https://sentry.io
2. Create project (Node.js)
3. Copy DSN to this variable

---

## 📁 File Structure

```
Api-WhatsApp/
├── .env.example         ← Template (SAFE TO COMMIT)
├── .env.local           ← Your actual values (GITIGNORED ⚠️)
├── Backend/
│   └── config/
│       └── env.js       ← Validates backend vars
├── frontend/
│   └── config/
│       └── env.ts       ← Validates frontend vars
└── docs/
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

