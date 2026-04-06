# Backend Stabilization Runbook - Phase 3c

## Objetivo
Verificar e mantener la salud de la base de datos PostgreSQL, asegurar integridad referencial, y limpiar datos huérfanos que puedan afectar rendimiento y confiabilidad.

## Estado Actual (Abril 2026)

### Tablas Críticas Requeridas
- `roles` - Configuración de roles (admin, general)
- `api_users` - Usuarios del sistema
- `whatsapp_sessions` - Sesiones conectadas de WhatsApp
- `contacts` - Contactos por usuario
- `message_logs` - Historial de mensajes
- `activity_logs` - Logs de actividad del sistema
- `api_usage_logs` - Estadísticas de uso de API
- `oauth_accounts` - Cuentas OAuth integradas
- `audit_logs` - Logs de auditoría (compliance)
- `email_verifications` - Verificación 2FA
- `trusted_devices` - Dispositivos de confianza
- `mfa_secrets` - Secretos MFA
- `templates` - Plantillas de mensajes
- `webhooks` - Configured webhooks
- `scheduler_jobs` - Trabajos programados

## Procedimiento de Verificación

### 1. Verificar Salud de Base de Datos
```bash
cd Backend
npm run db:health
```

**Salida esperada:**
```
✅ Todas las tablas críticas existen
✓ No hay sesiones huérfanas
✓ Todas las sesiones desconectadas están actualizadas recientemente
✓ Integridad de message_logs OK
✓ Integridad de contacts OK
✓ Integridad de activity_logs OK
```

**Si hay problemas detectados:**
- ⚠️ Tablas faltantes → Ejecutar migraciones pendientes (ver seccion "Migraciones Pendientes")
- ⚠️ Sesiones huérfanas → Ejecutar limpieza (ver "Ejecutar Limpieza Automática")
- ⚠️ Sesiones antiguas desconectadas → Considerar archivado (ver "Politica de Archivado")

### 2. Ejecutar Limpieza Automática

**ADVERTENCIA:** Este paso eliminará datos. Se recomienda backup previo.

```bash
cd Backend
# (Opcional - Backup previo)
# npm run backup

npm run db:cleanup
```

**Salida esperada:**
```
✓ Eliminadas X sesiones huérfanas
✓ Eliminados X mensajes con sesiones inexistentes
✓ Eliminados X mensajes huérfanos
✓ Eliminadas X sesiones desconectadas antiguas
✓ Eliminados X contactos huérfanos
✓ No se detectaron errores recurrentes
```

### 3. Verificar Nuevamente Post-Limpieza

```bash
npm run db:health
```

Debe mostrar estado ✅ SALUDABLE.

## Migraciones Pendientes

### Si faltan tablas, ejecutar migraciones en orden:

```bash
# 1. Migraciones de sesiones y autenticación
npm run migrate:engine-modes

# 2. Migraciones de portapapieles y dispositivos de confianza
npm run migrate:auth-phase4

# 3. Despues de cualquier migración, verificar
npm run db:health
```

## Políticas de Gestión de Datos

### Sesiones Desconectadas
- **> 7 días:** Mostrar advertencia en monitoreo (reportados por db:health)
- **> 30 días:** Marcar para eliminación (limpiados por db:cleanup)
- **Antes de eliminar:** Se crea entry en activity_logs como registro

### Mensajes Huérfanos
- Mensajes con `user_id` inexistente → Eliminados por db:cleanup
- Mensajes con `session_id` inválido → Eliminados por db:cleanup
- Se preservan mensajes sincronizados < 7 días

### Sesiones del Usuario
- Si usuario es eliminado → Sus sesiones quedan huérfanas (removidas por cleanup)
- Si sesión es marcada DISCONNECTED > 30d → Considerada obsoleta para limpieza

## Monitoreo Continuo

### Recomendación: Ejecutar verificación diariamente en producción
```bash
# Agregar a cron (Linux/Mac)
0 2 * * * cd /path/to/Backend && npm run db:health >> /var/log/whatsapp-db-health.log

# O ejecutar manualmente en revisiones semanales
# Lunes 9:00 AM: npm run db:health
# Viernes 5:00 PM: npm run db:cleanup + npm run db:health
```

### Alertas Críticas
- ❌ Tablas faltantes → Requiere intervención inmediata
- ❌ Sesiones huérfanas > 10 → Investigar causa raíz
- ⚠️ Tasa de error recurrente > 100/día → Revisar logs de aplicación

## Análisis de Errores Recurrentes

El script `db:cleanup` genera reporte de errores frecuentes basado en `activity_logs`:

```
⚠️ Errores más frecuentes:
1. SESSION_RECONNECT_FAILED: 45 veces
2. JWT_TOKEN_EXPIRED: 12 veces
3. RATE_LIMIT_EXCEEDED: 8 veces
```

**Acciones recomendadas:**
- Investigar raíz de errores recurrentes
- Aumentar backoff exponencial si hay timeouts
- Revisar configuración de rate limiting

## Rollback Plan

Si limpieza elimina datos incorrectamente:

1. **Restaurar desde backup:**
   ```bash
   # Si se ejecutó backup previo
   psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Si no hay backup, notificar inmediatamente:**
   - Investigar impacto (revisar activity_logs)
   - Comunicar a usuarios afectados
   - Evaluar recuperación de datos desde archivos locales

## Checklist Pre-Producción

Antes de deployar a ambiente de producción:
- [ ] Ejecutar `npm run db:health` - Debe pasar todos los checks
- [ ] Ejecutar `npm run db:cleanup` - Debe completar sin errores
- [ ] Ejecutar `npm run db:health` nuevamente - Debe estar en ✅ estado saludable
- [ ] Revisar reporte de errores recurrentes
- [ ] Verificar integridad referencial en todas las FK
- [ ] Backup completo de BD realizado
- [ ] Documentar versión schema actual

## Siguientes Pasos

**Phase 3d: Testing e2e**
- Verificar comportamiento con sesiones múltiples
- Test de edge cases de pagination
- Validar deduplicación de mensajes durante pagination

## Apéndice: Queries SQL Útiles

### Ver sesiones por usuario
```sql
SELECT au.username, COUNT(*) as sesioncount, 
       json_agg(ws.session_id) as sessions
FROM api_users au
LEFT JOIN whatsapp_sessions ws ON au.id = ws.user_id
GROUP BY au.id, au.username;
```

### Sesiones más longas sin conectar
```sql
SELECT session_id, status, updated_at, NOW() - updated_at as disconnected_for
FROM whatsapp_sessions
ORDER BY updated_at ASC LIMIT 10;
```

### Uso de BD por tabla
```sql
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Contar mensajes por usuario
```sql
SELECT au.username, COUNT(ml.id) as message_count
FROM api_users au
LEFT JOIN message_logs ml ON au.id = ml.user_id
GROUP BY au.id, au.username
ORDER BY message_count DESC;
```

---
**Última actualización:** Abril 6, 2026
**Fase:** 3c - Backend Stabilization
**Estado:** ✅ Completada
