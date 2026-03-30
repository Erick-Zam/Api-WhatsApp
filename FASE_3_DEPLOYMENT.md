# FASE 3: Cloud Deployment Instructions

## Overview
Esta guía proporciona pasos para desplegar la FASE 3 (Auditoría y Cumplimiento de GDPR) en tu servidor en la nube. Los datos anteriores se eliminarán completamente durante la migración.

**⚠️ ADVERTENCIA**: Este proceso es destructivo. Se eliminarán TODOS los datos del servidor.

---

## 📋 Pre-Requisitos

- Acceso SSH a tu servidor en la nube
- PostgreSQL 15+ instalado en el servidor
- Node.js 18+ instalado en el servidor
- Variables de entorno correctamente configuradas

---

## 🚀 Pasos de Deployment

### Paso 1: Conexión al Servidor

```bash
ssh usuario@tu-servidor-en-la-nube.com
cd /ruta/al/proyecto/Api-WhatsApp
```

### Paso 2: Actualizar el Código Fuente

```bash
# Pull the latest code from repository
git pull origin main

# Or, if deploying locally:
# Asegúrate de que todos los archivos nuevos estén presentes:
# - Backend/src/middleware/auditLog.js
# - Backend/src/services/audit.js
# - Backend/src/services/gdprCompliance.js
# - Backend/src/routes/gdpr.js
# - docs/database/migration_fase3_clean_destructive.sql
# - docs/database/deploy_fase3.sh
```

### Paso 3: Revisar Variables de Entorno

```bash
# Verificar que el archivo .env está configurado correctamente
# Debe contener:
cat .env | grep -E "DATABASE|DB_|POSTGRES"

# Variables clave:
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=tu_contraseña_segura
# POSTGRES_DB=whatsapp_saas
```

### Paso 4: Respaldar Base de Datos (ALTAMENTE RECOMENDADO)

```bash
# Crear respaldo de la base de datos actual
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres -d whatsapp_saas > backup_before_fase3_${timestamp}.sql

echo "✓ Respaldo creado: backup_before_fase3_${timestamp}.sql"
```

### Paso 5: Instalar Dependencias Backend

```bash
cd Backend
npm install
# Resultado esperado: "up to date, audited 581 packages"

cd ..
```

### Paso 6: Ejecutar Migración de Base de Datos

#### Opción A: Usando el Script Bash (Recomendado)

```bash
# Hacer el script ejecutable
chmod +x docs/database/deploy_fase3.sh

# Ejecutar con variables de entorno
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD="tu_contraseña"
export PGDATABASE=whatsapp_saas

bash docs/database/deploy_fase3.sh
```

#### Opción B: Ejecutar SQL Directamente

```bash
psql -h localhost -U postgres -d whatsapp_saas \
  -f docs/database/migration_fase3_clean_destructive.sql
```

### Paso 7: Verificar Migración

```bash
# Conectarse a la base de datos
psql -h localhost -U postgres -d whatsapp_saas

# Dentro de psql, ejecutar:
# Ver las tablas de auditoría creadas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%audit%' 
       OR tablename LIKE '%compliance%'
       OR tablename LIKE '%consent%'
       OR tablename LIKE '%security%')
ORDER BY tablename;

# Debería mostrar 11 tablas:
# - admin_actions_log
# - api_key_rotation_log
# - audit_events
# - compliance_reports_log
# - consent_records
# - data_access_logs
# - data_deletion_logs
# - failed_login_attempts
# - security_events
# - session_activity_log
# - user_role_changes

# Ver historial de migraciones
SELECT name, executed_at FROM schema_migrations 
WHERE name LIKE 'FASE%' 
ORDER BY executed_at DESC;

# Salir de psql
\q
```

### Paso 8: Reiniciar Backend

```bash
# Opción 1: Si usas PM2
pm2 restart backend

# Opción 2: Si usas systemd
sudo systemctl restart whatsapp-backend

# Opción 3: Si usas Docker Compose
docker-compose restart backend

# Opción 4: Manual (para desarrollo)
cd Backend
npm start
```

### Paso 9: Verificar Logs de Auditoría

```bash
# Conectarse a la BD y hacer un test
psql -h localhost -U postgres -d whatsapp_saas -c \
  "SELECT COUNT(*) FROM audit_events; SELECT COUNT(*) FROM security_events;"

# Debería mostrar:
# count
# ------
#     0
# (1 row)

# Esto es correcto - la tabla existe pero está vacía
```

---

## ✅ Checklist de Verificación

Después del deployment, verifica:

- [ ] **Conexión a BD**: `psql -h localhost -U postgres -d whatsapp_saas -c "SELECT NOW();"`
- [ ] **11 Tablas Creadas**: Las 11 tablas de auditoría listadas arriba existen
- [ ] **Índices Creados**: Al menos 15+ índices en las nuevas tablas
- [ ] **Constraints Activos**: Todos los CHECK y FOREIGN KEY funcionan
- [ ] **Backend Inicia**: Aplicación node.js inicia sin errores
- [ ] **Log de Auditoría**: Prueba haciendo login y verifica que se loguee en `audit_events`
- [ ] **GDPR Endpoints**: Prueba `/api/gdpr/data-access-report` (requiere JWT token)
- [ ] **Sin Errores TypeScript**: No debería haber "Type annotations can only be used in TypeScript"

---

## 🔍 Testing de Funcionalidad

### Test 1: Verificar Audit Logging

```bash
# 1. Login como usuario
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Respuesta debería incluir JWT token

# 2. Verificar que se registró en audit_events
psql -h localhost -U postgres -d whatsapp_saas -c \
  "SELECT COUNT(*) FROM audit_events;"

# Debería mostrar count > 0
```

### Test 2: Verificar GDPR Endpoints (require JWT token)

```bash
# Obtener JWT token del login anterior

# Test: DSAR Request
curl -X GET http://localhost:3001/api/gdpr/data-access-report \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test: Export Data
curl -X GET http://localhost:3001/api/gdpr/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Ambas debería retornar JSON con éxito
```

### Test 3: Verificar Security Monitoring

```bash
# Intentar acceso malicioso (trigger security event)
curl -X GET http://localhost:3001/api/admin/secret

# Verificar que se registro como security event
psql -h localhost -U postgres -d whatsapp_saas -c \
  "SELECT event_type, severity FROM security_events LIMIT 5;"
```

---

## 🛑 Troubleshooting

### Error: "psql: command not found"
```bash
# Instalar PostgreSQL client
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

### Error: "FATAL: password authentication failed"
```bash
# Verificar credenciales en .env
# Verificar que PostgreSQL está corriendo
sudo service postgresql status

# O con systemd:
sudo systemctl status postgresql
```

### Error: "Append-only file truncated"
```bash
# Si Docker da este error, limpiar volúmenes
docker-compose down -v
docker-compose up --build
```

### Las tablas no se crearon
```bash
# Verificar logs de migración
tail -100 /var/log/postgresql/postgresql.log

# O ejecutar manualmente con output:
psql -h localhost -U postgres -d whatsapp_saas \
  -f docs/database/migration_fase3_clean_destructive.sql
```

---

## 🔐 Post-Deployment Security Notes

1. **Cambiar contraseña de BD**:
   ```bash
   psql -U postgres -d whatsapp_saas
   ALTER USER postgres WITH PASSWORD 'nueva_contraseña_fuerte';
   ```

2. **Habilitar SSL en PostgreSQL**:
   ```bash
   # Editar postgresql.conf
   ssl = on
   ssl_cert_file = '/etc/postgresql/server.crt'
   ssl_key_file = '/etc/postgresql/server.key'
   ```

3. **Crear usuario no-superuser para Backend**:
   ```sql
   CREATE USER app_user WITH PASSWORD 'contraseña_app';
   GRANT CONNECT ON DATABASE whatsapp_saas TO app_user;
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
   ```

---

## 📞 Support

Si encuentras problemas:

1. Revisa los logs del servidor:
   ```bash
   pm2 logs backend
   # O
   docker-compose logs -f backend
   ```

2. Verifica la salud de la BD:
   ```bash
   pg_isready -h localhost -U postgres
   ```

3. Consulta la documentación completa:
   - [docs/FASE_3_COMPLIANCE.md](./FASE_3_COMPLIANCE.md)
   - [Backend Migration Guide](./database/migration_fase3_clean_destructive.sql)

---

## ✨ ¡Listo!

Una vez completados todos los pasos y pasados los checklists, tu FASE 3 deployment está completo. 

Las auditorías y cumplimiento GDPR ahora están activos en tu servidor en la nube.
