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

async function cleanOrphanedSessions() {
  log(colors.blue, '\n🗑️  Limpiando sesiones huérfanas...\n');

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get orphaned sessions
      const orphaned = await client.query(
        `SELECT ws.id FROM whatsapp_sessions ws
         LEFT JOIN api_users au ON ws.user_id = au.id
         WHERE au.id IS NULL`
      );

      if (orphaned.rows.length > 0) {
        const orphanedIds = orphaned.rows.map((row) => row.id);

        // Delete related message_logs first (FK constraint)
        await client.query('DELETE FROM message_logs WHERE session_id = ANY($1)', [orphanedIds]);

        // Delete the sessions
        const result = await client.query('DELETE FROM whatsapp_sessions WHERE id = ANY($1) RETURNING id', [
          orphanedIds,
        ]);

        await client.query('COMMIT');
        log(colors.green, `  ✓ Eliminadas ${result.rows.length} sesiones huérfanas`);
      } else {
        await client.query('COMMIT');
        log(colors.green, '  ✓ No hay sesiones huérfanas para limpiar');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    log(colors.red, '❌ Error limpiando sesiones huérfanas:', error.message);
  }
}

async function cleanOrphanedMessages() {
  log(colors.blue, '\n🗑️  Limpiando mensajes huérfanos...\n');

  try {
    // Clean message_logs with invalid session references
    const result = await pool.query(
      `DELETE FROM message_logs
       WHERE session_id IS NOT NULL 
       AND session_id NOT IN (SELECT id FROM whatsapp_sessions)`
    );

    log(colors.green, `  ✓ Eliminados ${result.rowCount} mensajes con sesiones inexistentes`);

    // Clean message_logs with invalid user references
    const userResult = await pool.query(
      `DELETE FROM message_logs
       WHERE user_id NOT IN (SELECT id FROM api_users)`
    );

    log(colors.green, `  ✓ Eliminados ${userResult.rowCount} mensajes huérfanos`);
  } catch (error) {
    log(colors.red, '❌ Error limpiando mensajes huérfanos:', error.message);
  }
}

async function cleanOldDisconnectedSessions() {
  log(colors.blue, '\n🗑️  Limpiando sesiones desconectadas > 30 días...\n');

  try {
    // Backup old sessions data (log deletion)
    const oldSessions = await pool.query(
      `SELECT id, session_id, user_id, status, updated_at
       FROM whatsapp_sessions
       WHERE status = 'DISCONNECTED' 
       AND updated_at < NOW() - INTERVAL '30 days'`
    );

    if (oldSessions.rows.length > 0) {
      log(colors.cyan, `  📝 Registrando ${oldSessions.rows.length} sesiones antiguas para eliminación...`);

      // Insert into activity_logs as record
      for (const session of oldSessions.rows) {
        await pool.query(
          `INSERT INTO activity_logs (user_id, action, details)
           VALUES ($1, $2, $3)`,
          [session.user_id, 'SESSION_CLEANUP', JSON.stringify({ session_id: session.session_id, cleaned_at: new Date() })]
        );
      }

      // Delete old sessions
      const result = await pool.query(
        `DELETE FROM whatsapp_sessions
         WHERE status = 'DISCONNECTED' 
         AND updated_at < NOW() - INTERVAL '30 days'`
      );

      log(colors.green, `  ✓ Eliminadas ${result.rowCount} sesiones desconectadas antiguas`);
    } else {
      log(colors.green, '  ✓ No hay sesiones desconectadas antiguas');
    }
  } catch (error) {
    log(colors.red, '❌ Error limpiando sesiones antiguas:', error.message);
  }
}

async function cleanOrphanedContacts() {
  log(colors.blue, '\n🗑️  Limpiando contactos huérfanos...\n');

  try {
    const result = await pool.query(
      `DELETE FROM contacts
       WHERE user_id NOT IN (SELECT id FROM api_users)`
    );

    log(colors.green, `  ✓ Eliminados ${result.rowCount} contactos huérfanos`);
  } catch (error) {
    log(colors.red, '❌ Error limpiando contactos huérfanos:', error.message);
  }
}

async function analyzeRecurringErrors() {
  log(colors.blue, '\n📊 Analizando errores recurrentes...\n');

  try {
    // Check for repeated errors in activity logs
    const errors = await pool.query(
      `SELECT 
        action,
        COUNT(*) as error_count,
        MAX(created_at) as last_occurrence
       FROM activity_logs
       WHERE action LIKE '%ERROR%' OR details::text LIKE '%error%'
       GROUP BY action
       ORDER BY error_count DESC
       LIMIT 10`
    );

    if (errors.rows.length > 0) {
      log(colors.yellow, '  ⚠️  Errores más frecuentes:\n');
      errors.rows.forEach((row, idx) => {
        log(colors.yellow, `     ${idx + 1}. ${row.action}: ${row.error_count} veces (Último: ${row.last_occurrence})`);
      });
    } else {
      log(colors.green, '  ✓ No se detectaron errores recurrentes');
    }

    log('');
  } catch (error) {
    log(colors.red, '❌ Error analizando errores recurrentes:', error.message);
  }
}

async function generateCleanupReport() {
  log(colors.cyan, '\n╔════════════════════════════════════════════════════╗');
  log(colors.cyan, '║          LIMPIEZA Y MANTENIMIENTO DE BD            ║');
  log(colors.cyan, '║     WhatsApp Chat Management System                ║');
  log(colors.cyan, '╚════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Run all cleanup operations
  await cleanOrphanedSessions();
  await cleanOrphanedMessages();
  await cleanOldDisconnectedSessions();
  await cleanOrphanedContacts();
  await analyzeRecurringErrors();

  // Summary
  const duration = Date.now() - startTime;
  log(colors.green, `✅ Limpieza completada en ${duration}ms\n`);

  log(colors.cyan, '💡 Próximos pasos:');
  log(colors.cyan, '   1. Ejecutar verificación de salud: npm run script verify_db_health.js');
  log(colors.cyan, '   2. Revisar logs de actividad para patrones de error');
  log(colors.cyan, '   3. Considerar archivado de datos antiguos (>90 días)\n');
}

// Main execution
try {
  log(colors.yellow, '\n⚠️  ADVERTENCIA: Este script ELIMINARÁ datos. Se recomienda backup previo.\n');

  // Run cleanup
  await generateCleanupReport();
  process.exit(0);
} catch (error) {
  log(colors.red, '❌ Error fatal:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
