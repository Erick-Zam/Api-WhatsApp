# 🗄️ Análisis: Estructura de BD Actual vs FASE 4

**Fecha**: 29 de Marzo de 2026  
**Análisis**: Qué existe, qué falta, qué cambiar  

---

## 📊 Estructura Actual de Autenticación

### Tabla: `api_users` (Existente)
```sql
CREATE TABLE api_users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    -- FALTA: last_login, failed_login_attempts, account_locked_until
);
```

**Problemas Identificados**:
- ❌ No hay tracking de último login
- ❌ No hay contador de intentos fallidos de login
- ❌ No hay lock de cuenta temporal
- ❌ No hay MFA configuration
- ❌ No hay dispositivos vinculados
- ❌ No hay OAuth providers

### Tabla: `roles` (Existente)
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP
);
```

**Status**: ✅ OK - Estructura correcta

---

## ❌ Qué Falta en Base de Datos

### 1. OAuth Support
- **Tabla faltante**: `oauth_providers`
- **Tabla faltante**: `oauth_accounts`

### 2. MFA Support
- **Tabla faltante**: `mfa_settings`

### 3. Session Management
- **Tabla faltante**: `sessions_advanced`
- **Tabla faltante**: `token_revocation_list`

### 4. Security
- **Tabla faltante**: `login_anomalies`
- **Falta actualizar `api_users`** con campos de seguridad

---

## 🔧 Cambios Necesarios en BD

### Cambio 1: Expandir `api_users`

```sql
-- Nuevos campos a agregar
ALTER TABLE api_users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE api_users ADD COLUMN last_login_ip VARCHAR(45);
ALTER TABLE api_users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE api_users ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE api_users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE api_users ADD COLUMN last_password_change TIMESTAMP WITH TIME ZONE;
ALTER TABLE api_users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

**Razón**: Tracking de seguridad y MFA flag

### Cambio 2: Crear `oauth_providers` (seed data)

```sql
-- Esta tabla almacena qué proveedores OAuth están disponibles
INSERT INTO oauth_providers (provider_name, client_id, client_secret, redirect_uri, scopes, enabled)
VALUES 
  ('google', 'ENV:GOOGLE_OAUTH_CLIENT_ID', 'ENV:GOOGLE_OAUTH_CLIENT_SECRET', 'ENV:GOOGLE_OAUTH_REDIRECT_URI', ARRAY['openid', 'email', 'profile'], true),
  ('whatsapp', 'ENV:WHATSAPP_BUSINESS_APP_ID', 'ENV:WHATSAPP_BUSINESS_APP_SECRET', 'ENV:WHATSAPP_OAUTH_REDIRECT_URI', ARRAY['whatsapp_business_messaging'], true);
```

### Cambio 3: Todas las 6 nuevas tablas (ver FASE_4_PLAN.md)

---

## 🔐 Seguridad: Cambios en auth.js

### Cambio 1: Actualizar `loginUser()`

```javascript
// ANTES:
export const loginUser = async (email, password) => {
  // ... verificar credenciales
  const token = jwt.sign({ id, email, role }, SECRET_KEY, { expiresIn: '24h' });
  return { token, user };
};

// DESPUÉS:
export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  
  // 1. Verificar si cuenta está locked
  if (user.account_locked_until && user.account_locked_until > new Date()) {
    throw new Error('Account temporarily locked due to failed login attempts');
  }
  
  // 2. Verificar contraseña
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    await incrementFailedAttempts(user.id);
    throw new Error('Invalid credentials');
  }
  
  // 3. Reset failed attempts
  await resetFailedAttempts(user.id);
  
  // 4. Verificar si MFA está enabled
  if (user.two_factor_enabled) {
    // Return partial token (needs MFA verification)
    const mfaToken = jwt.sign({ id, email, mfa_required: true }, SECRET_KEY, { expiresIn: '10m' });
    return { mfaRequired: true, mfaToken };
  }
  
  // 5. Generar JWT
  const token = jwt.sign({ id, email, role, jti: generateJTI() }, SECRET_KEY, { expiresIn: '24h' });
  
  // 6. Actualizar último login
  await updateLastLogin(user.id, req.ip);
  
  // 7. Crear sesión
  await createSession(user.id, req.auditData);
  
  return { token, user };
};
```

### Cambio 2: Usar JTI en JWT

```javascript
// JWT payload incluirá JTI para token revocation list
const token = jwt.sign(
  { 
    id: user.id, 
    email: user.email, 
    role: user.role,
    jti: generateUnique() // NEW: JWT ID para TRL
  },
  SECRET_KEY,
  { expiresIn: '24h' }
);
```

### Cambio 3: Verificar TRL en jwtAuth.js

```javascript
export const verifyJwt = async (req, res, next) => {
  const token = extractToken(req);
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // NEW: Verificar si token está revocado
    const isRevoked = await db.query(
      'SELECT * FROM token_revocation_list WHERE token_id = $1',
      [decoded.jti]
    );
    
    if (isRevoked.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## 🌍 Variables de Entorno: Estructura Actual vs Nueva

### Actuales
```bash
JWT_SECRET=...
JWT_EXPIRY=7d
DATABASE_URL=...
POSTGRES_*
```

### Nuevos para FASE 4
```bash
# OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
WHATSAPP_BUSINESS_*...

# MFA
MFA_ENABLED=true
TOTP_ISSUER=...

# Session
SESSION_MAX_ACTIVE_SESSIONS=5
SESSION_IDLE_TIMEOUT=1800

# Security
DEVICE_FINGERPRINTING_ENABLED=true
BRUTE_FORCE_MAX_ATTEMPTS=5
```

**Total nuevas variables**: ~23

---

## 📋 Orden de Cambios en BD

### Paso 1: Alteraciones a `api_users` (backward-compatible)
```sql
ALTER TABLE api_users 
ADD COLUMN last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_login_ip VARCHAR(45),
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

**Impacto**: 0 - No afecta datos existentes, solo agrega columnas

### Paso 2: Crear 6 nuevas tablas (via migration_fase4_oauth_mfa.sql)
- oauth_providers
- oauth_accounts
- mfa_settings
- sessions_advanced
- login_anomalies
- token_revocation_list

**Impacto**: Neutral - Nuevas tablas no afectan existentes

### Paso 3: Crear índices y foreign keys

---

## 💾 Migración: Estructura del Archivo

Archivo: `docs/database/migration_fase4_oauth_mfa.sql`

```sql
-- ============================================
-- FASE 4: OAuth & Advanced Authentication
-- ============================================

-- STEP 1: Alter existing tables
ALTER TABLE api_users ADD COLUMN last_login ...
-- etc

-- STEP 2: Create new tables
CREATE TABLE oauth_providers ...
CREATE TABLE oauth_accounts ...
-- etc

-- STEP 3: Create indexes and constraints
CREATE INDEX idx_oauth_accounts_user_id ...
-- etc

-- STEP 4: Insert initial data
INSERT INTO oauth_providers (provider_name, ...) VALUES ...
-- etc

-- STEP 5: Record migration
INSERT INTO schema_migrations (name, executed_at) 
VALUES ('FASE_4_OAUTH_MFA', CURRENT_TIMESTAMP);
```

---

## 🚨 Consideraciones de Seguridad

### 1. Encriptación de Tokens OAuth
```javascript
// oauth_accounts.access_token_encrypted debe estar encriptado
const encrypted = encrypt(access_token, process.env.OAUTH_ENCRYPTION_KEY);
await db.query(
  'UPDATE oauth_accounts SET access_token_encrypted = $1 WHERE id = $2',
  [encrypted, account_id]
);

// Al usar, desencriptar
const decrypted = decrypt(encrypted, process.env.OAUTH_ENCRYPTION_KEY);
```

### 2. Hashing de Backup Codes para MFA
```javascript
// mfa_settings.backup_codes debe estar hasheado
const hashed_codes = backup_codes.map(code => bcrypt.hash(code, 10));
```

### 3. TRL (Token Revocation List) TTL
```sql
-- Limpiar tokens revocados expirados automáticamente
DELETE FROM token_revocation_list 
WHERE expires_at < CURRENT_TIMESTAMP;
```

### 4. Limpieza de Sesiones Expiradas
```sql
-- Limpiar sesiones expiradas
DELETE FROM sessions_advanced 
WHERE expires_at < CURRENT_TIMESTAMP AND is_active = FALSE;
```

---

## ✅ Checklist de Validación

Antes de comenzar FASE 4:

- [ ] FASE 3 completada (auditoría + GDPR)
- [ ] BD actual sin corrupción (backup hecho)
- [ ] Todas las variables env documentadas
- [ ] Plan de migraciones revisado
- [ ] Librerías necesarias identificadas
- [ ] Flujos de auth mapeados
- [ ] Endpoints diseñados
- [ ] Testing strategy definida

---

## 🎯 Resumen: BD Changes Necesarios

| Elemento | Tipo | Acción | Líneas SQL |
|----------|------|--------|----------|
| `api_users` | Alter | 7 columnas nuevas | 7 |
| `oauth_providers` | Create | Nueva tabla | 15 |
| `oauth_accounts` | Create | Nueva tabla | 25 |
| `mfa_settings` | Create | Nueva tabla | 20 |
| `sessions_advanced` | Create | Nueva tabla | 35 |
| `login_anomalies` | Create | Nueva tabla | 20 |
| `token_revocation_list` | Create | Nueva tabla | 18 |
| Índices | Create | 15+ índices | 30 |
| Constraints | Create | Varios | 10 |
| **TOTAL** | | | ~175 líneas SQL |

---

## 📞 Recursos Necesarios para FASE 4

### Del Usuario
- [ ] Google OAuth Client ID & Secret (Google Cloud Console)
- [ ] WhatsApp Business Account ID & Tokens
- [ ] Email provider credentials (para MFA)
- [ ] Dominios permitidos para redirect URIs

### Del Sistema
- [ ] LibrerÃ­as npm (9 nuevas)
- [ ] Variables de entorno (~23 nuevas)
- [ ] Migraciones BD (1 archivo, ~175 líneas)
- [ ] Servicios nuevos (3 archivos, ~1200 líneas)
- [ ] Rutas nuevas (2 archivos, ~500 líneas)
- [ ] Middleware nuevo (2 archivos, ~300 líneas)

---

Estructura revisada. ¿Comenzamos con la implementación?
