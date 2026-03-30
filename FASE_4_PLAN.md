# 📋 FASE 4: OAuth & Advanced Auth - Plan Detallado

**Status**: Listo para Implementación (sin deploy aún)  
**Fecha**: 29 de Marzo de 2026  
**Duración Estimada**: 20-30 horas  
**Complejidad**: Alta  

---

## 🎯 Objetivos de FASE 4

### 1. **OAuth Integrations** (2 providers)
- [x] Google OAuth 2.0 (Social Login)
- [x] WhatsApp Business OAuth (Direct Integration)

### 2. **Advanced Authentication**
- [x] Multi-Factor Authentication (MFA) - Email + TOTP
- [x] Session Management (advanced)
- [x] Refresh Token Strategy
- [x] Session Revocation
- [x] Device Tracking

### 3. **Security Enhancements**
- [x] Rate Limiting by User (prevent abuse)
- [x] Login Anomaly Detection
- [x] Device Fingerprinting
- [x] Brute Force Protection (hardened)
- [x] Token Revocation List (TRL)

### 4. **Database Extensions**
- [x] OAuth Provider Tables
- [x] MFA Configuration Tables
- [x] Session Management Tables
- [x] Device Tracking Tables

---

## 📊 Nuevas Tablas de BD Necesarias

### Tabla 1: `oauth_providers`
Almacena configuración de OAuth

```sql
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) UNIQUE NOT NULL,
    -- 'google', 'whatsapp', 'github', etc.
    client_id VARCHAR(500) NOT NULL,
    client_secret VARCHAR(500) NOT NULL (encrypted),
    redirect_uri TEXT NOT NULL,
    scopes TEXT[],
    config JSONB,
    -- Additional provider-specific config
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla 2: `oauth_accounts`
Vincula cuentas OAuth con usuarios

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    -- 'google', 'whatsapp'
    provider_user_id VARCHAR(500) NOT NULL,
    -- ID único del usuario en el proveedor
    provider_email VARCHAR(255),
    display_name VARCHAR(255),
    profile_data JSONB,
    -- Foto, nombre, etc.
    access_token_encrypted VARCHAR(1000),
    refresh_token_encrypted VARCHAR(1000),
    token_expires_at TIMESTAMP WITH TIME ZONE,
    token_expires_in INTEGER,
    -- segundos
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_primary BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id),
    INDEX idx_user_id (user_id)
);
```

### Tabla 3: `mfa_settings`
Configuración de MFA por usuario

```sql
CREATE TABLE mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES api_users(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method VARCHAR(50),
    -- 'email', 'totp', 'sms' (future)
    totp_secret VARCHAR(255) (encrypted),
    -- Para Google Authenticator
    totp_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT FALSE,
    backup_codes JSONB (encrypted),
    -- Array de códigos de respaldo
    configured_at TIMESTAMP WITH TIME ZONE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla 4: `sessions_advanced`
Gestión avanzada de sesiones

```sql
CREATE TABLE sessions_advanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    jwt_token_id VARCHAR(255) UNIQUE,
    -- Para TRL (Token Revocation List)
    device_fingerprint VARCHAR(255),
    -- Hash del dispositivo
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    -- 'web', 'mobile', 'api'
    os_name VARCHAR(100),
    os_version VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_trusted BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(255),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);
```

### Tabla 5: `login_anomalies`
Detección de anomalías de login

```sql
CREATE TABLE login_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(100),
    -- 'unusual_location', 'impossible_travel', 'new_device', 'brute_force_attempt'
    severity VARCHAR(50),
    -- 'low', 'medium', 'high', 'critical'
    description TEXT,
    ip_address INET,
    location_data JSONB,
    device_data JSONB,
    action_taken VARCHAR(100),
    -- 'email_sent', 'session_revoked', 'mfa_required', 'account_locked'
    user_confirmed BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);
```

### Tabla 6: `token_revocation_list`
Lista negra de tokens revocados

```sql
CREATE TABLE token_revocation_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id VARCHAR(255) UNIQUE NOT NULL,
    -- JTI (JWT ID) del token
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    -- 'logout', 'password_change', 'device_untrusted', 'security_breach'
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    -- Cuándo el token expiraría naturalmente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_id (token_id),
    INDEX idx_expires_at (expires_at)
);
```

---

## 🔑 Variables de Entorno Necesarias

```bash
# ============================================
# OAUTH - GOOGLE
# ============================================
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/auth/oauth/google/callback
# Production: https://api.tu-dominio.com/auth/oauth/google/callback

# ============================================
# OAUTH - WHATSAPP BUSINESS
# ============================================
WHATSAPP_BUSINESS_ACCOUNT_ID=your-waba-id
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCESS_TOKEN=your-waba-access-token
WHATSAPP_BUSINESS_APP_ID=your-app-id
WHATSAPP_BUSINESS_APP_SECRET=your-app-secret
WHATSAPP_OAUTH_REDIRECT_URI=http://localhost:3001/auth/oauth/whatsapp/callback

# ============================================
# MFA CONFIGURATION
# ============================================
MFA_ENABLED=true
MFA_REQUIRED_FOR_ROLES=admin
# Roles requeridos a usar MFA (comma-separated)

TOTP_ISSUER=WhatsApp-API-SaaS
# Nombre que aparece en authenticators como Google Authenticator

MFA_EMAIL_ENABLED=true
MFA_TOTP_ENABLED=true

# ============================================
# SESSION MANAGEMENT
# ============================================
SESSION_MAX_ACTIVE_SESSIONS=5
# Máximo de sesiones simultáneas por usuario

SESSION_IDLE_TIMEOUT=1800
# 30 minutos en segundos

SESSION_ABSOLUTE_TIMEOUT=86400
# 24 horas

# ============================================
# SECURITY - ADVANCED
# ============================================
DEVICE_FINGERPRINTING_ENABLED=true
LOGIN_ANOMALY_DETECTION_ENABLED=true
IMPOSSIBLE_TRAVEL_DETECTION_ENABLED=true
# Si login desde diferente país en < 2 horas

BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_LOCKOUT_DURATION=900
# 15 minutos

# ============================================
# ENCRYPTION - OAUTH TOKENS
# ============================================
OAUTH_ENCRYPTION_KEY=your-64-char-key-for-oauth-token-encryption
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📂 Archivos a Crear

### Servicios (3 archivos, ~1200 líneas)

1. **`Backend/src/services/oauth.js`** (~450 líneas)
   - Google OAuth flow
   - WhatsApp Business OAuth flow
   - Token exchange y refresh
   - Account linking

2. **`Backend/src/services/mfa.js`** (~350 líneas)
   - TOTP generation (speakeasy)
   - Email OTP sending
   - MFA verification
   - Backup codes generation

3. **`Backend/src/services/sessionManager.js`** (~400 líneas)
   - Device fingerprinting
   - Session tracking
   - Anomaly detection
   - Token revocation list management

### Middleware (2 archivos, ~300 líneas)

4. **`Backend/src/middleware/mfaAuth.js`** (~150 líneas)
   - Verificar MFA después de login
   - Validar código TOTP/Email

5. **`Backend/src/middleware/deviceFingerprint.js`** (~150 líneas)
   - Generar fingerprint del dispositivo
   - Detectar anomalías
   - Rastrear dispositivos confiables

### Rutas (2 archivos, ~500 líneas)

6. **`Backend/src/routes/oauth.js`** (~250 líneas)
   - Rutas de OAuth callbacks
   - Linking/Unlinking de cuentas
   - Estado de conexiones OAuth

7. **`Backend/src/routes/authAdvanced.js`** (~250 líneas)
   - MFA setup/verify
   - Session management
   - Device management
   - Login anomaly review

### Migraciones (1 archivo, ~400 líneas)

8. **`docs/database/migration_fase4_oauth_mfa.sql`** (~400 líneas)
   - Crear 6 nuevas tablas
   - Índices y constraints
   - Datos iniciales

---

## 🔄 Flujos de Autenticación

### Flujo 1: OAuth Google Login

```
1. Usuario hace clic en "Login with Google"
   ↓
2. Frontend redirige a: /auth/oauth/google
   ↓
3. Backend construye URL de Google OAuth con:
   - client_id, redirect_uri, scopes, state
   ↓
4. Usuario se autentica en Google
   ↓
5. Google redirige a: /auth/oauth/google/callback?code=XXX&state=YYY
   ↓
6. Backend:
   a. Valida state (CSRF protection)
   b. Intercambia code por access_token
   c. Obtiene profile del usuario (email, name, photo)
   d. Busca si existe oauth_accounts
   e. Si no existe: crea nuevo user + oauth_account
   f. Si existe: actualiza oauth_account
   g. Genera JWT para login
   ↓
7. Redirige a frontend con JWT en URL o cookie
   ↓
8. Frontend redirige a dashboard
```

### Flujo 2: MFA - TOTP

```
1. Usuario hace login con email/password
   ↓
2. Backend:
   a. Valida credenciales
   b. Verifica si MFA está enabled
   c. Si sí: genera OTP code
   ↓
3. Si TOTP: muestra "Scan QR code"
   - Usuario escanea con Google Authenticator/Authy
   - Ingresa código de 6 dígitos
   ↓
4. Backend valida código con speakeasy
   ↓
5. Si válido: genera JWT
   ↓
6. Usuario logueado
```

### Flujo 3: Anomaly Detection

```
1. Login exitoso
   ↓
2. Backend analyzes:
   a. IP address (geolocalización)
   b. Device fingerprint (es dispositivo conocido?)
   c. Ubicación (¿es posible viajar desde último login?)
   d. Device type (¿mismo navegador/SO?)
   ↓
3. Si anomalías detectadas:
   - Email al usuario confirmando login
   - Disponibilidad de marcar dispositivo como "Trusted"
   - Opción de revocar sesiones sospechosas
   ↓
4. Si MFA enabled + alta anomalía:
   - Requiere MFA verification adicional
```

---

## 📋 Checklist de Implementación

### Parte 1: Base de Datos
- [ ] Crear migración con 6 nuevas tablas
- [ ] Crear índices para performance
- [ ] Agregar constraints
- [ ] Generar seed data para oauth_providers

### Parte 2: Servicios
- [ ] `oauth.js` - Implementar Google OAuth flow
- [ ] `oauth.js` - Implementar WhatsApp OAuth flow
- [ ] `mfa.js` - TOTP generation
- [ ] `mfa.js` - Email OTP
- [ ] `sessionManager.js` - Device fingerprinting
- [ ] `sessionManager.js` - Anomaly detection
- [ ] `sessionManager.js` - Token revocation list

### Parte 3: Middleware
- [ ] `mfaAuth.js` - MFA verification
- [ ] `deviceFingerprint.js` - Device tracking

### Parte 4: Rutas/Endpoints
- [ ] OAuth: GET `/auth/oauth/google`
- [ ] OAuth: GET `/auth/oauth/google/callback`
- [ ] OAuth: GET `/auth/oauth/whatsapp`
- [ ] OAuth: GET `/auth/oauth/whatsapp/callback`
- [ ] OAuth: GET `/auth/oauth/accounts`
- [ ] OAuth: DELETE `/auth/oauth/accounts/:provider`
- [ ] MFA: POST `/auth/mfa/setup`
- [ ] MFA: POST `/auth/mfa/verify`
- [ ] MFA: GET `/auth/mfa/status`
- [ ] MFA: POST `/auth/mfa/disable`
- [ ] Sessions: GET `/auth/sessions`
- [ ] Sessions: DELETE `/auth/sessions/:sessionId`
- [ ] Sessions: POST `/auth/sessions/:sessionId/trust`
- [ ] Anomalies: GET `/auth/anomalies`
- [ ] Anomalies: POST `/auth/anomalies/:anomalyId/confirm`

### Parte 5: Integración
- [ ] Actualizar `Backend/src/app.js` con nuevas rutas
- [ ] Actualizar `Backend/src/services/auth.js` con new flows
- [ ] Actualizar `Backend/src/middleware/jwtAuth.js` con TRL check
- [ ] Actualizar `.env.example` con nuevas variables

### Parte 6: Testing
- [ ] Test OAuth Google flow completo
- [ ] Test OAuth WhatsApp flow completo
- [ ] Test MFA TOTP setup
- [ ] Test MFA Email OTP
- [ ] Test anomaly detection
- [ ] Test session revocation
- [ ] Test device fingerprinting

---

## 🔐 Librerías Necesarias

Agregar a `Backend/package.json`:

```json
{
  "dependencies": {
    "google-auth-library": "^9.0.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.0",
    "nodemailer": "^6.9.0",
    "useragent": "^2.3.0",
    "geoip-lite": "^1.4.0",
    "useragent": "^2.3.0"
  }
}
```

---

## 📊 Variables de Entorno a Agregar

Ver sección **Nuevas Variables de Entorno Necesarias** arriba.

Total new env vars: **~25**

---

## 🧪 Endpoints Finales (FASE 4)

### Auth Básico (existente, mejorado)
```
POST   /auth/register              → username/email/password
POST   /auth/login                 → email/password
GET    /auth/me                    → profile actual
PUT    /auth/profile               → actualizar perfil
PUT    /auth/change-password       → cambiar contraseña
GET    /auth/logs                  → historial de acceso
```

### OAuth (NUEVA)
```
GET    /auth/oauth/google          → iniciar Google OAuth
GET    /auth/oauth/google/callback → callback de Google
GET    /auth/oauth/whatsapp        → iniciar WhatsApp OAuth
GET    /auth/oauth/whatsapp/callback → callback de WhatsApp
GET    /auth/oauth/accounts        → listar cuentas OAuth vinculadas
DELETE /auth/oauth/accounts/:provider → desconectar proveedor
POST   /auth/oauth/link/:provider  → vincular nuevo proveedor
```

### MFA (NUEVA)
```
GET    /auth/mfa/status            → estado MFA del usuario
POST   /auth/mfa/setup             → iniciar setup MFA
POST   /auth/mfa/verify-otp        → verificar código TOTP/Email
POST   /auth/mfa/disable           → deshabilitar MFA
GET    /auth/mfa/backup-codes      → generar backup codes
POST   /auth/mfa/email-otp         → enviar OTP por email
```

### Sessions (NUEVA)
```
GET    /auth/sessions              → listar todas las sesiones activas
GET    /auth/sessions/:sessionId   → detalles de sesión específica
DELETE /auth/sessions/:sessionId   → revocar sesión
POST   /auth/sessions/:sessionId/trust → marcar dispositivo como trusted
GET    /auth/devices               → dispositivos confiables
DELETE /auth/devices/:deviceId     → eliminar dispositivo trusted
```

### Login Anomalies (NUEVA)
```
GET    /auth/anomalies             → anomalías de login pendientes
GET    /auth/anomalies/:id         → detalles de anomalía
POST   /auth/anomalies/:id/confirm → confirmar login legítimo
POST   /auth/anomalies/:id/revoke  → revocar sesión sospechosa
```

---

## ⏱️ Estimación de Tiempo

| Componente | Horas |
|-----------|-------|
| BD: Create tables + migration | 3 |
| OAuth Google + WhatsApp | 6 |
| MFA (TOTP + Email) | 4 |
| Session Management | 4 |
| Anomaly Detection | 3 |
| Device Fingerprinting | 2 |
| Rutas/Endpoints | 3 |
| Testing | 4 |
| Documentación | 2 |
| **TOTAL** | **31 horas** |

---

## 📝 Orden de Implementación Recomendado

1. **Migraciones BD** (3 horas)
2. **oauth.js service** (6 horas)
3. **mfa.js service** (4 horas)
4. **sessionManager.js service** (4 horas)
5. **Middleware** (2 horas)
6. **Rutas OAuth** (2.5 horas)
7. **Rutas MFA** (1.5 horas)
8. **Rutas Sessions** (2 horas)
9. **Rutas Anomalies** (1 hora)
10. **Integración en app.js** (1.5 horas)
11. **Testing** (4 horas)

---

## 🎯 Deliverables FASE 4

- ✅ 6 nuevas tablas de BD
- ✅ 3 servicios nuevos (oauth, mfa, sessionManager)
- ✅ 2 middleware nuevos
- ✅ 2 archivos de rutas nuevos
- ✅ 1 migración de BD
- ✅ ~2000+ líneas de código
- ✅ 15+ endpoints nuevos
- ✅ 100% OAuth integrado (Google + WhatsApp)
- ✅ 100% MFA implementado
- ✅ 100% Session management avanzado

---

## 🔗 Dependencias Externas (Claves a Obtener)

Cosas que el usuario debe proporcionar para env:

1. **Google OAuth**:
   - Google Cloud Console
   - Crear proyecto
   - Credential: OAuth 2.0 Client ID
   - Obtener: client_id, client_secret

2. **WhatsApp Business OAuth**:
   - WhatsApp Business Account
   - Event Subscriptions
   - Obtener: WABA_ID, Phone_Number_ID, Access Token, App ID, App Secret

3. **Email Provider** (para MFA):
   - Gmail, SendGrid, o similar
   - Obtener: API key, SMTP credentials

---

Este es el plan. ¿Comenzamos con la implementación ahora?
