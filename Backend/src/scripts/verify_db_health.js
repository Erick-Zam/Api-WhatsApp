import 'dotenv/config.js';
import pool from '../db.js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

async function checkTablesExist() {
  log(colors.blue, '\n📋 Verificando existencia de tablas...\n');

  const requiredTables = [
    'roles',
    'api_users',
    'whatsapp_sessions',
    'contacts',
    'message_logs',
    'activity_logs',
    'api_usage_logs',
    'oauth_accounts',
    'audit_logs',
    'email_verifications',
    'trusted_devices',
    'mfa_secrets',
    'templates',
    'webhooks',
    'scheduler_jobs',
  ];

  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name ASC`
    );

    const existingTables = result.rows.map((row) => row.table_name);
    let allExist = true;

    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        log(colors.green, `  ✓ ${table}`);
      } else {
        log(colors.red, `  ✗ MISSING: ${table}`);
        allExist = false;
      }
    }

    if (!allExist) {
      log(colors.yellow, '\n⚠️  Algunas tablas necesarias no existen. Se requieren migraciones.');
      return false;
    }

    log(colors.green, '\n✅ Todas las tablas críticas existen.\n');
    return true;
  } catch (error) {
    log(colors.red, '❌ Error comprobando tablas:', error.message);
    return false;
  }
}

async function checkOrphanedSessions() {
  log(colors.blue, '🔍 Buscando sesiones huérfanas...\n');

  try {
    const orphaned = await pool.query(
      `SELECT ws.id, ws.session_id, ws.user_id, ws.status, ws.created_at
       FROM whatsapp_sessions ws
       LEFT JOIN api_users au ON ws.user_id = au.id
       WHERE au.id IS NULL`
    );

    if (orphaned.rows.length > 0) {
      log(colors.yellow, `  ⚠️  Encontradas ${orphaned.rows.length} sesiones huérfanas:`);
      orphaned.rows.forEach((row, idx) => {
        log(colors.yellow, `     ${idx + 1}. Session: ${row.session_id} (ID: ${row.id})`);
      });
      return orphaned.rows;
    } else {
      log(colors.green, '  ✓ No hay sesiones huérfanas.\n');
      return [];
    }
  } catch (error) {
    log(colors.red, '❌ Error verificando sesiones huérfanas:', error.message);
    return [];
  }
}

async function checkDisconnectedSessions() {
  log(colors.blue, '🔌 Verificando sesiones desconectadas > 7 días...\n');

  try {
    const disconnected = await pool.query(
      `SELECT id, session_id, user_id, status, updated_at,
              (NOW() - updated_at) as disconnected_time
       FROM whatsapp_sessions
       WHERE status = 'DISCONNECTED' 
       AND updated_at < NOW() - INTERVAL '7 days'
       ORDER BY updated_at DESC`
    );

    if (disconnected.rows.length > 0) {
      log(colors.yellow, `  ⚠️  ${disconnected.rows.length} sesiones sin conectar por >7 días:`);
      disconnected.rows.forEach((row, idx) => {
        const days = Math.floor(parseInt(row.disconnected_time.split(' ')[0]));
        log(colors.yellow, `     ${idx + 1}. ${row.session_id} (${days} días sin conexión)`);
      });
      return disconnected.rows;
    } else {
      log(colors.green, '  ✓ Todas las sesiones desconectadas están actualizadas recientemente.\n');
      return [];
    }
  } catch (error) {
    log(colors.red, '❌ Error verificando sesiones desconectadas:', error.message);
    return [];
  }
}

async function checkReferentialIntegrity() {
  log(colors.blue, '🔗 Verificando integridad referencial...\n');

  try {
    // Check for orphaned message_logs
    const orphanedMessages = await pool.query(
      `SELECT COUNT(*) as count FROM message_logs
       WHERE session_id IS NOT NULL 
       AND session_id NOT IN (SELECT id FROM whatsapp_sessions)`
    );

    if (orphanedMessages.rows[0].count > 0) {
      log(colors.yellow, `  ⚠️  ${orphanedMessages.rows[0].count} mensajes con sesiones inexistentes`);
    } else {
      log(colors.green, '  ✓ Integridad de message_logs OK');
    }

    // Check for orphaned contacts
    const orphanedContacts = await pool.query(
      `SELECT COUNT(*) as count FROM contacts
       WHERE user_id NOT IN (SELECT id FROM api_users)`
    );

    if (orphanedContacts.rows[0].count > 0) {
      log(colors.yellow, `  ⚠️  ${orphanedContacts.rows[0].count} contactos huérfanos`);
    } else {
      log(colors.green, '  ✓ Integridad de contacts OK');
    }

    // Check for orphaned activity_logs
    const orphanedActivity = await pool.query(
      `SELECT COUNT(*) as count FROM activity_logs
       WHERE user_id NOT IN (SELECT id FROM api_users)`
    );

    if (orphanedActivity.rows[0].count > 0) {
      log(colors.yellow, `  ⚠️  ${orphanedActivity.rows[0].count} activity logs huérfanos`);
    } else {
      log(colors.green, '  ✓ Integridad de activity_logs OK');
    }

    log('');
  } catch (error) {
    log(colors.red, '❌ Error verificando integridad referencial:', error.message);
  }
}

async function checkDatabaseSize() {
  log(colors.blue, '📊 Estadísticas de base de datos...\n');

  try {
    const stats = await pool.query(
      `SELECT 
        schemaname,
        COUNT(*) as table_count,
        SUM(pg_total_relation_size(schemaname||'.'||tablename))/1024/1024 as size_mb
       FROM pg_tables
       WHERE schemaname = 'public'
       GROUP BY schemaname`
    );

    if (stats.rows[0]) {
      const { table_count, size_mb } = stats.rows[0];
      log(colors.cyan, `  Tablas: ${table_count}`);
      log(colors.cyan, `  Tamaño total: ${(size_mb || 0).toFixed(2)} MB\n`);
    }

    // Top 5 largest tables
    const largestTables = await pool.query(
      `SELECT tablename, 
              pg_total_relation_size(schemaname||'.'||tablename)/1024/1024 as size_mb
       FROM pg_tables
       WHERE schemaname = 'public'
       ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
       LIMIT 5`
    );

    log(colors.cyan, '  📈 Tablas más grandes:');
    largestTables.rows.forEach((row) => {
      log(colors.cyan, `     • ${row.tablename}: ${(row.size_mb || 0).toFixed(2)} MB`);
    });
    log('');
  } catch (error) {
    log(colors.red, '❌ Error obteniendo estadísticas:', error.message);
  }
}

async function generateHealthReport() {
  log(colors.cyan, '\n╔════════════════════════════════════════════════════╗');
  log(colors.cyan, '║     VERIFICACIÓN DE SALUD - BASE DE DATOS         ║');
  log(colors.cyan, '║     WhatsApp Chat Management System               ║');
  log(colors.cyan, '╚════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Run all checks
  const tablesOk = await checkTablesExist();
  const orphanedSessions = await checkOrphanedSessions();
  const disconnectedSessions = await checkDisconnectedSessions();
  await checkReferentialIntegrity();
  await checkDatabaseSize();

  // Summary
  log(colors.blue, '\n📋 RESUMEN FINAL:\n');

  const allChecksPassed = tablesOk && orphanedSessions.length === 0;

  if (allChecksPassed) {
    log(colors.green, '✅ Base de datos en estado SALUDABLE\n');
  } else {
    log(colors.yellow, '⚠️  Se encontraron problemas:');
    if (!tablesOk) log(colors.yellow, '   • Migraciones incompletas');
    if (orphanedSessions.length > 0) log(colors.yellow, `   • ${orphanedSessions.length} sesiones huérfanas`);
    if (disconnectedSessions.length > 0) log(colors.yellow, `   • ${disconnectedSessions.length} sesiones desconectadas antiguas`);
    log('');
  }

  const duration = Date.now() - startTime;
  log(colors.cyan, `⏱️  Verificación completada en ${duration}ms\n`);
}

// Main execution
try {
  await generateHealthReport();
  process.exit(0);
} catch (error) {
  log(colors.red, '❌ Error fatal:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
