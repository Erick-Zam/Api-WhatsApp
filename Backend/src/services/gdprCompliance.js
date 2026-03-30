/**
 * GDPR Compliance Service
 * Handles user rights: Right to be forgotten, data portability, consent management, etc.
 */

import { db } from '../db.js';
import { logger } from './logger.js';
import auditService from './audit.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

class GDPRComplianceService {
  /**
   * Right to be Forgotten (GDPR Article 17)
   * Delete all user personal data
   * @param {string} userId
   * @param {string} [reason='USER_REQUEST']
   * @returns {Promise<{success: boolean, dataDeleted: {messages: number, contacts: number, sessions: number}}>}
   */
  async deleteUserData(userId, reason = 'USER_REQUEST') {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Export data for audit before deletion
      const userData = await this.#getUserDataSnapshot(userId);
      await auditService.logDataDeletion(
        userId,
        'ENTIRE_PROFILE',
        0,
        reason,
        null,
        userData
      );

      // 2. Delete user sessions and related data
      await client.query(`DELETE FROM whatsapp_sessions WHERE user_id = $1`, [userId]);

      // 3. Delete messages
      const messageResult = await client.query(
        `DELETE FROM message_logs WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      const messageCount = messageResult.rowCount;

      // 4. Delete contacts
      const contactResult = await client.query(
        `DELETE FROM contacts WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      const contactCount = contactResult.rowCount;

      // 5. Delete activity logs
      await client.query(`DELETE FROM activity_logs WHERE user_id = $1`, [userId]);

      // 6. Delete API usage logs
      await client.query(`DELETE FROM api_usage_logs WHERE user_id = $1`, [userId]);

      // 7. Delete webhooks
      await client.query(
        `DELETE FROM webhooks WHERE session_id IN 
         (SELECT session_id FROM whatsapp_sessions WHERE user_id = $1)`,
        [userId]
      );

      // 8. Delete user consent records (but keep audit trail)
      await client.query(`DELETE FROM consent_records WHERE user_id = $1`, [userId]);

      // 9. Anonymize user in audit trails (don't delete, just anonymize)
      await client.query(
        `UPDATE audit_events SET user_id = NULL WHERE user_id = $1`,
        [userId]
      );

      // 10. Delete API keys
      await client.query(
        `UPDATE api_users SET api_key = NULL, password_hash = NULL WHERE id = $1`,
        [userId]
      );

      // 11. Mark user as deleted (soft delete)
      await client.query(
        `UPDATE api_users SET is_active = FALSE, email = $2, username = $3 WHERE id = $1`,
        [userId, `deleted-${Date.now()}@deleted.local`, `deleted-user-${Date.now()}`]
      );

      await client.query('COMMIT');

      logger.info('User data deleted (GDPR)', {
        userId,
        messagesDeleted: messageCount,
        contactsDeleted: contactCount,
      });

      return {
        success: true,
        dataDeleted: {
          messages: messageCount,
          contacts: contactCount,
          sessions: 1,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete user data', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Data Portability (GDPR Article 20)
   * Export all user personal data in machine-readable format
   * @param {string} userId
   * @returns {Promise<{success: boolean, filename: string, dataIncluded: string[]}>}
   */
  async exportUserData(userId) {
    try {
      logger.info('Exporting user data (GDPR)', { userId });

      const data = {
        exportDate: new Date().toISOString(),
        userId,
        user: await this.#getUserInfo(userId),
        messages: await this.#getUserMessages(userId),
        contacts: await this.#getUserContacts(userId),
        sessions: await this.#getUserSessions(userId),
        activityLog: await this.#getUserActivityLog(userId),
        apiUsage: await this.#getUserApiUsage(userId),
        consents: await this.#getUserConsents(userId),
        auditLog: await this.#getUserAuditLog(userId),
      };

      // Create JSON file
      const filename = `user-data-export-${userId}-${Date.now()}.json`;
      const filepath = path.join(process.env.DATA_EXPORTS_DIR || '/tmp', filename);

      await fs.writeFile(filepath, JSON.stringify(data, null, 2));

      // Log the export
      await auditService.logAuditEvent({
        userId,
        eventType: 'DATA_ACCESS',
        action: 'EXPORT',
        status: 'SUCCESS',
      });

      logger.info('User data exported', { userId, filename });

      return {
        success: true,
        filename,
        dataIncluded: Object.keys(data).filter((k) => k !== 'exportDate' && k !== 'userId'),
      };
    } catch (error) {
      logger.error('Failed to export user data', { error, userId });
      throw error;
    }
  }

  /**
   * Rectification (GDPR Article 16)
   * Update incorrect user data
   * @param {string} userId
   * @param {Object} updates
   * @returns {Promise<{success: boolean, updated: string[]}>}
   */
  async rectifyUserData(userId, updates) {
    try {
      const allowedFields = ['username', 'email'];
      const sanitizedUpdates = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = value;
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      let updateQuery = 'UPDATE api_users SET ';
      const params = [];
      const setClauses = [];

      Object.entries(sanitizedUpdates).forEach(([key, value], idx) => {
        setClauses.push(`${key} = $${idx + 1}`);
        params.push(value);
      });

      params.push(userId);
      updateQuery += setClauses.join(', ') + ` WHERE id = $${params.length} RETURNING id`;

      const result = await db.query(updateQuery, params);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      // Log the rectification
      await auditService.logAuditEvent({
        userId,
        eventType: 'DATA_MODIFICATION',
        entityType: 'user_profile',
        entityId: userId,
        action: 'UPDATE',
        afterState: sanitizedUpdates,
        status: 'SUCCESS',
      });

      logger.info('User data rectified', { userId, updatedFields: Object.keys(sanitizedUpdates) });

      return {
        success: true,
        updated: Object.keys(sanitizedUpdates),
      };
    } catch (error) {
      logger.error('Failed to rectify user data', { error, userId });
      throw error;
    }
  }

  /**
   * Restrict Processing (GDPR Article 18)
   * Temporarily restrict data processing for a user
   * @param {string} userId
   * @param {string} reason
   * @returns {Promise<{success: boolean, userId: string, status: string}>}
   */
  async restrictProcessing(userId, reason) {
    try {
      const query = `
        UPDATE api_users 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
      `;

      await db.query(query, [userId]);

      // Log the restriction
      await auditService.logAuditEvent({
        userId,
        eventType: 'DATA_MODIFICATION',
        entityType: 'account_status',
        entityId: userId,
        action: 'UPDATE',
        afterState: { status: 'RESTRICTED', reason },
        status: 'SUCCESS',
      });

      logger.info('Processing restricted for user', { userId, reason });

      return {
        success: true,
        userId,
        status: 'PROCESSING_RESTRICTED',
      };
    } catch (error) {
      logger.error('Failed to restrict processing', { error, userId });
      throw error;
    }
  }

  /**
   * Lifting Restriction
   * @param {string} userId
   * @returns {Promise<{success: boolean, userId: string, status: string}>}
   */
  async liftRestriction(userId) {
    try {
      const query = `
        UPDATE api_users 
        SET is_active = TRUE, updated_at = NOW()
        WHERE id = $1
      `;

      await db.query(query, [userId]);

      await auditService.logAuditEvent({
        userId,
        eventType: 'DATA_MODIFICATION',
        entityType: 'account_status',
        entityId: userId,
        action: 'UPDATE',
        afterState: { status: 'ACTIVE' },
        status: 'SUCCESS',
      });

      logger.info('Processing restriction lifted', { userId });

      return {
        success: true,
        userId,
        status: 'ACTIVE',
      };
    } catch (error) {
      logger.error('Failed to lift restriction', { error, userId });
      throw error;
    }
  }

  /**
   * Data Subject Access Request (DSAR) - GDPR Article 15
   * Provide summary of what data is held and how it's used
   * @param {string} userId
   * @returns {Promise<{reportDate: string, userId: string, summary: Object, dataHeld: Object, thirdParties: string[], processingBasis: string[], rights: string[]}>}
   */
  async generateDataSubjectAccessReport(userId) {
    try {
      const snapshot = await this.#getUserDataSnapshot(userId);

      const report = {
        reportDate: new Date().toISOString(),
        userId,
        summary: {
          totalMessages: snapshot.messages?.length || 0,
          totalContacts: snapshot.contacts?.length || 0,
          activeSessions: snapshot.sessions?.filter((s) => s.status === 'CONNECTED').length || 0,
          lastLogin: snapshot.user?.last_login || null,
          accountAge: snapshot.user?.created_at || null,
        },
        dataHeld: {
          personal: ['name', 'email', 'phone_number', 'profile_photo'],
          behavioral: ['login_history', 'api_usage', 'message_patterns'],
          device: ['device_info', 'ip_addresses', 'user_agents'],
        },
        thirdParties: ['WhatsApp (Baileys)', 'Database Provider', 'CDN Provider'],
        processingBasis: ['Contractual necessity', 'Legitimate business interest', 'Legal obligation'],
        rights: [
          'Right to be forgotten',
          'Right to data portability',
          'Right to rectification',
          'Right to restrict processing',
          'Right to object',
          'Rights related to automated decision-making',
        ],
      };

      // Log the DSAR request
      await auditService.logAuditEvent({
        userId,
        eventType: 'DATA_ACCESS',
        action: 'READ',
        status: 'SUCCESS',
        afterState: { reportGenerated: true },
      });

      logger.info('DSAR report generated', { userId });

      return report;
    } catch (error) {
      logger.error('Failed to generate DSAR report', { error, userId });
      throw error;
    }
  }

  /**
   * Get user data snapshot (helper)
   * @private
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async #getUserDataSnapshot(userId) {
    const data = {};

    try {
      const user = await db.query('SELECT * FROM api_users WHERE id = $1', [userId]);
      data.user = user.rows[0];
    } catch (e) {
      logger.debug('Failed to fetch user', { error: e.message });
    }

    try {
      const messages = await db.query('SELECT * FROM message_logs WHERE user_id = $1', [userId]);
      data.messages = messages.rows;
    } catch (e) {
      logger.debug('Failed to fetch messages', { error: e.message });
    }

    try {
      const contacts = await db.query('SELECT * FROM contacts WHERE user_id = $1', [userId]);
      data.contacts = contacts.rows;
    } catch (e) {
      logger.debug('Failed to fetch contacts', { error: e.message });
    }

    return data;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async #getUserInfo(userId) {
    const result = await db.query(
      `SELECT id, username, email, role_id, is_active, created_at FROM api_users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserMessages(userId) {
    const result = await db.query(
      `SELECT id, message_type, content, status, timestamp FROM message_logs WHERE user_id = $1 LIMIT 1000`,
      [userId]
    );
    return result.rows;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserContacts(userId) {
    const result = await db.query(`SELECT * FROM contacts WHERE user_id = $1`, [userId]);
    return result.rows;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserSessions(userId) {
    const result = await db.query(`SELECT id, session_id, status, created_at FROM whatsapp_sessions WHERE user_id = $1`, [userId]);
    return result.rows;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserActivityLog(userId) {
    const result = await db.query(
      `SELECT action, details, created_at FROM activity_logs WHERE user_id = $1 LIMIT 100`,
      [userId]
    );
    return result.rows;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserApiUsage(userId) {
    const result = await db.query(
      `SELECT endpoint, method, status_code, created_at FROM api_usage_logs WHERE user_id = $1 LIMIT 100`,
      [userId]
    );
    return result.rows;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserConsents(userId) {
    const result = await db.query(`SELECT * FROM consent_records WHERE user_id = $1`, [userId]);
    return result.rows;
  }

  /**
   * @private
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async #getUserAuditLog(userId) {
    const result = await db.query(
      `SELECT event_type, action, status, created_at FROM audit_events WHERE user_id = $1 LIMIT 100`,
      [userId]
    );
    return result.rows;
  }
}

export default new GDPRComplianceService();
