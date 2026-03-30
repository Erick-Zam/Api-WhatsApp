# 🔑 Guía: Claves y Datos Necesarios para Producción

**Documento**: Lo que necesitarás conseguir ANTES del deploy a producción  
**Fecha**: 29 de Marzo de 2026  
**Responsable**: Usuario (tú)

---

## 📋 Checklist: Qué Necesitas Obtener

### 1️⃣ Google OAuth Setup

**Dónde**: https://console.cloud.google.com/

**Pasos**:
1. Ir a Google Cloud Console
2. Crear nuevo proyecto (o usar existente)
3. Ir a "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
4. Seleccionar "Web application"
5. En Authorized redirect URIs: 
   - Para desarrollo: `http://localhost:3001/auth/oauth/google/callback`
   - Para producción: `https://tu-dominio.com/auth/oauth/google/callback`
6. Copiar el Client ID y Client Secret

**Variables a guardar**:
```
GOOGLE_OAUTH_CLIENT_ID=tu-client-id-aqui
GOOGLE_OAUTH_CLIENT_SECRET=tu-client-secret-aqui
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/auth/oauth/google/callback
```

**Tiempo**: ~10 minutos

---

### 2️⃣ WhatsApp Business OAuth Setup

**Dónde**: https://developers.facebook.com/

**Pasos**:
1. Ir a Facebook Developers
2. Crear/usar aplicación
3. Agregar "WhatsApp Business" product
4. En "Settings" → "Basic" obtener:
   - App ID
   - App Secret
5. En "WhatsApp Business" → "System Users" crear system user
6. Generar token para system user (éstos no expiran)
7. En "WhatsApp Business" → "Phone Numbers" obtener:
   - WABA ID (WhatsApp Business Account ID)
   - Phone Number ID

**Variables a guardar**:
```
WHATSAPP_BUSINESS_ACCOUNT_ID=tu-waba-id
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=tu-phone-id
WHATSAPP_BUSINESS_ACCESS_TOKEN=tu-system-user-token
WHATSAPP_BUSINESS_APP_ID=tu-app-id
WHATSAPP_BUSINESS_APP_SECRET=tu-app-secret
WHATSAPP_OAUTH_REDIRECT_URI=https://tu-dominio.com/auth/oauth/whatsapp/callback
```

**Documentación**: https://developers.facebook.com/docs/whatsapp/business-platform/get-started

**Tiempo**: ~20 minutos

---

### 3️⃣ Database Credentials

**Para Servidor en la Nube**:
1. Puerto: Usually `5432` (PostgreSQL default)
2. User: `postgres` o usuario custom
3. Password: La que configuraste al crear BD
4. Database: `whatsapp_saas` (o el nombre que pusiste)
5. Host: IP o dominio del servidor

**Variables a guardar**:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu-contraseña-super-segura
POSTGRES_DB=whatsapp_saas
POSTGRES_HOST=tu-servidor-ip-o-dominio.com
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:tu-contraseña@tu-servidor:5432/whatsapp_saas
```

**Tiempo**: Inmediato (ya tienes esto)

---

### 4️⃣ Email Provider para MFA

**Opción 1: Gmail (RECOMENDADO para desarrollo)**

1. Ir a https://myaccount.google.com/apppasswords
2. Generar "App Password" para SMTP
3. Copiar contraseña

```
EMAIL_PROVIDER=gmail
EMAIL_FROM=tu-email@gmail.com
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=tu-email@gmail.com
EMAIL_SMTP_PASSWORD=app-password-generado
```

**Tiempo**: ~5 minutos

---

**Opción 2: SendGrid (RECOMENDADO para producción)**

1. Ir a https://sendgrid.com/ y crear cuenta
2. Ir a "Settings" → "API Keys" → "Create API Key"
3. Copiar API Key

```
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@tu-dominio.com
SENDGRID_API_KEY=tu-api-key
```

**Costo**: Gratis hasta 100 emails/día (suficiente para MFA)

**Tiempo**: ~10 minutos

---

**Opción 3: AWS SES**

```
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-key
AWS_SECRET_ACCESS_KEY=tu-secret
EMAIL_FROM=noreply@tu-dominio.com
```

**Tiempo**: ~15 minutos

---

### 5️⃣ JWT Secrets

**Generar localmente**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecutar dos veces y guardar dos strings diferentes:

```
JWT_SECRET=primer-string-64-chars-aqui
JWT_REFRESH_SECRET=segundo-string-64-chars-diferente
```

**Tiempo**: ~1 minuto

---

### 6️⃣ Encryption Keys

**Generar localmente**:
```bash
# Run 2 times for 2 different keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```
OAUTH_ENCRYPTION_KEY=primer-key-para-oauth-tokens
```

**Tiempo**: ~1 minuto

---

### 7️⃣ Domain Configuration

**Para Producción necesitas**:
1. Dominio comprado (ej: tudominio.com)
2. SSL/TLS Certificate (Let's Encrypt es gratis)
3. DNS records apuntando a tu servidor

**Variables**:
```
BACKEND_URL=https://api.tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://api.tu-dominio.com
```

**Si no tienes dominio aún**: Te lo explicamos en "Deployment Phase"

**Tiempo**: Depende (1-24 horas para DNS propagación)

---

## 📊 Resumen: Tabla Completa de Variables .env

```bash
# ============================================
# NODE & ENVIRONMENTS
# ============================================
NODE_ENV=production
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0
BACKEND_URL=https://api.tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
FRONTEND_PORT=3000

# ============================================
# DATABASE
# ============================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu-password-min-16-chars
POSTGRES_DB=whatsapp_saas
POSTGRES_HOST=tu-servidor.com
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:password@servidor:5432/whatsapp_saas

# ============================================
# JWT & SECURITY
# ============================================
JWT_SECRET=tu-64-char-random-string-secret-key
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=otro-64-char-random-diferente
JWT_REFRESH_EXPIRY=30d

# ============================================
# ENCRYPTION
# ============================================
ENCRYPTION_KEY=tu-32-byte-hex-encryption-key
OAUTH_ENCRYPTION_KEY=otra-32-byte-hex-key-diferente
BACKUP_ENCRYPTION_KEY=tercera-32-byte-hex-key

# ============================================
# OAUTH - GOOGLE
# ============================================
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=tu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://api.tu-dominio.com/auth/oauth/google/callback

# ============================================
# OAUTH - WHATSAPP
# ============================================
WHATSAPP_BUSINESS_ACCOUNT_ID=tu-waba-id
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=tu-phone-id
WHATSAPP_BUSINESS_ACCESS_TOKEN=token-de-system-user
WHATSAPP_BUSINESS_APP_ID=tu-app-id
WHATSAPP_BUSINESS_APP_SECRET=tu-app-secret
WHATSAPP_OAUTH_REDIRECT_URI=https://api.tu-dominio.com/auth/oauth/whatsapp/callback

# ============================================
# EMAIL & MFA
# ============================================
EMAIL_PROVIDER=sendgrid  # O 'gmail', 'ses'
EMAIL_FROM=noreply@tu-dominio.com

# Si SendGrid
SENDGRID_API_KEY=tu-sendgrid-api-key

# Si Gmail
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=tu-email@gmail.com
EMAIL_SMTP_PASSWORD=app-password-de-gmail

# MFA
MFA_ENABLED=true
MFA_REQUIRED_FOR_ROLES=admin
TOTP_ISSUER=Tu-Empresa-WhatsApp-API

# ============================================
# SESSION & SECURITY
# ============================================
SESSION_MAX_ACTIVE_SESSIONS=5
SESSION_IDLE_TIMEOUT=1800
SESSION_ABSOLUTE_TIMEOUT=86400

DEVICE_FINGERPRINTING_ENABLED=true
LOGIN_ANOMALY_DETECTION_ENABLED=true
IMPOSSIBLE_TRAVEL_DETECTION_ENABLED=true

BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_LOCKOUT_DURATION=900

# ============================================
# RATE LIMITING
# ============================================
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=3000
API_RATE_LIMIT_AUTH_WINDOW_MS=3600000
API_RATE_LIMIT_AUTH_MAX_REQUESTS=10

# ============================================
# CORS
# ============================================
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://api.tu-dominio.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info
LOG_FORMAT=json
PINO_LOG_LEVEL=info
```

**Total de Variables**: ~45

---

## 🎯 Orden de Obtención (Recomendado)

### Semana 1: Cosas que puedes hacer AHORA
1. ✅ Generar JWT_SECRET (1 min)
2. ✅ Generar ENCRYPTION_KEYS (1 min)
3. ✅ Decidir proveedor de email (5 min)
4. ⏳ Crear cuenta Gmail o SendGrid (5-10 min)

### Semana 2: Setup Exterior
5. ⏳ Google OAuth setup (10 min)
6. ⏳ WhatsApp Business OAuth setup (20 min)
7. ⏳ Comprar dominio (si no tienes)

### Antes del Deploy a Producción
8. ⏳ Configurar BD en servidor (ya tienes)
9. ⏳ Configurar SSL/TLS (Let's Encrypt)
10. ⏳ Apuntar DNS al servidor

---

## ⚠️ Seguridad: Reglas Importantes

### 1. NUNCA harcodees secrets
```javascript
// ❌ MAL
const secret = 'my-super-secret-key';

// ✅ BIEN
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET not set in .env');
```

### 2. NUNCA commites .env file
```bash
# En .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 3. Secrets Mínimo 32 caracteres
```bash
# ❌ TOO SHORT
MY_KEY=12345

# ✅ GOOD
MY_KEY=a7f3k9m2p8x1q5w7l3n6b2c9d5h7j9k2
```

### 4. Diferentes secrets para desarrollo y producción
```bash
# .env.development
JWT_SECRET=dev-key-you-can-share

# .env.production (NUNCA en git)
JWT_SECRET=prod-key-super-secreto-nunca-compartir
```

### 5. Rotar secrets periódicamente
- Cada 6 meses: generar nuevos JWT secrets
- Cada 3 meses: generar nuevos encryption keys
- OAuth tokens: renovar automáticamente

---

## 📝 Template: .env para Copiar/Pegar

Crea archivo: `.env.production.local`

```bash
# ============================================
# PRODUCCIÓN - RELLENA ESTOS VALORES
# ============================================

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<CAMBIAR-CONTRASEÑA-SEGURA>
POSTGRES_DB=whatsapp_saas
POSTGRES_HOST=<IP-DE-SERVIDOR>
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:<PASSWORD>@<HOST>:5432/whatsapp_saas

# JWT (generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<GENERAR-32-BYTES-HEX>
JWT_REFRESH_SECRET=<GENERAR-OTRO-32-BYTES>

# Encryption (generar igual forma)
ENCRYPTION_KEY=<GENERAR-32-BYTES>
OAUTH_ENCRYPTION_KEY=<GENERAR-32-BYTES>

# Dominio
BACKEND_URL=https://api.tu-dominio.com
FRONTEND_URL=https://tu-dominio.com

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=<DE-GOOGLE-CONSOLE>
GOOGLE_OAUTH_CLIENT_SECRET=<DE-GOOGLE-CONSOLE>

# WhatsApp OAuth
WHATSAPP_BUSINESS_ACCOUNT_ID=<DE-FACEBOOK>
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=<DE-FACEBOOK>
WHATSAPP_BUSINESS_ACCESS_TOKEN=<TOKEN-SYSTEM-USER>
WHATSAPP_BUSINESS_APP_ID=<DE-FACEBOOK>
WHATSAPP_BUSINESS_APP_SECRET=<DE-FACEBOOK>

# Email (example: SendGrid)
SENDGRID_API_KEY=<DE-SENDGRID>
EMAIL_FROM=noreply@tu-dominio.com

# MFA
MFA_ENABLED=true
TOTP_ISSUER=Tu-Empresa
```

---

## 🔒 Verificación de Seguridad

Antes de deployar, verifica:

```bash
# 1. Verificar que .env está en .gitignore
grep ".env" .gitignore

# 2. Verificar que no haya .env en git
git log --all --full-history -- .env

# 3. Ver qué secrets están en código
grep -r "CAMBIAR-" Backend/src/
# Debería mostrar solo variables de entorno, no valores

# 4. Verificar variables mínimas requeridas
cat .env | grep -E "JWT_SECRET|POSTGRES_PASSWORD|ENCRYPTION_KEY"
# Debería mostrar 3+ variables

# 5. Verificar que todos los secrets tienen min 32 caracteres
bash scripts/validate_env_secrets.sh  # (script a crear)
```

---

## 📞 Soporte: Donde Obtener Cada Variable

| Variable | De Dónde | Tipo | Tiempo |
|----------|---------|------|--------|
| GOOGLE_* | Google Cloud Console | OAuth | 10 min |
| WHATSAPP_* | Facebook Developers | OAuth | 20 min |
| POSTGRES_* | Tu servidor | BD | Inmediato |
| JWT_* | Generar locally | Hash | 1 min |
| ENCRYPTION_* | Generar locally | Hash | 1 min |
| EMAIL_* | SendGrid/Gmail | API | 5-10 min |
| *_URL | Tu dominio | String | Variable |

**Total tiempo**: ~1-2 horas (la mayoría es esperara confirmaciones de email)

---

## ✅ Checklist Final

Antes del deployment:

- [ ] Todos los OAuth credentials obtenidos
- [ ] BD credentials verificados
- [ ] Secrets generados y almacenados securely
- [ ] Email provider configurado y testeado
- [ ] Dominio con SSL/TLS
- [ ] .env.production.local creado (en local, no en git)
- [ ] Variables validadas (formula correcta)
- [ ] Backup de BD hecho
- [ ] Migraciones FASE 3 + 4 revisadas

---

## 📞 Próximo Paso

Una vez tengas TODAS estas variables, podemos:

1. Crear `FASE_4_IMPLEMENTATION.md` detallando cada línea a codear
2. Implementar todos los servicios y routes
3. Testing end-to-end de toda la autenticación
4. Preparar deployment scripts
5. Hacer deployment a producción

**¿Comenzamos?**
