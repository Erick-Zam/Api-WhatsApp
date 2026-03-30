/**
 * Audit Service - SOC2 Type II & GDPR Compliance
 * Handles all audit event logging, data access tracking, and compliance recording
 */

import db from '../db.js';
import { logger } from './logger.js';

/**
 * @typedef {Object} AuditEventPayload
 * @property {string} userId
 * @property {'USER_LOGIN'|'USER_LOGOUT'|'API_CALL'|'DATA_ACCESS'|'DATA_MODIFICATION'|'SETTINGS_CHANGE'|'ROLE_CHANGE'|'API_KEY_ROTATION'|'ACCOUNT_STATUS_CHANGE'|'SESSION_CREATED'|'SESSION_DELETED'|'WEBHOOK_TRIGGERED'} eventType
 * @property {string} [entityType]
 * @property {string} [entityId]
 * @property {'CREATE'|'READ'|'UPDATE'|'DELETE'|'EXPORT'|'IMPORT'} action
 * @property {Record<string, any>} [beforeState]
 * @property {Record<string, any>} [afterState]
 * @property {'SUCCESS'|'FAILED'|'PARTIAL'} [status]
 * @property {string} [failureReason]
 * @property {string} [ipAddress]
 * @property {string} [userAgent]
 * @property {string} [requestId]
 * @property {string} [sessionTokenHash]
 */

/**
 * @typedef {Object} SecurityEventPayload
 * @property {'FAILED_LOGIN'|'BRUTE_FORCE_DETECTED'|'SESSION_HIJACK_ATTEMPT'|'INVALID_TOKEN'|'RATE_LIMIT'|'UNAUTHORIZED_ACCESS'|'SUSPICIOUS_ACTIVITY'} eventType
 * @property {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} severity
 * @property {string} [email]
 * @property {string} [ipAddress]
 * @property {string} [userAgent]
 * @property {string} description
 * @property {'ACCOUNT_LOCKED'|'SESSION_TERMINATED'|'ALERT_SENT'|'NO_ACTION'} [actionTaken]
 */

/**
 * @typedef {Object} DataAccessPayload
 * @property {string} userId
 * @property {string} resourceType
 * @property {string} resourceId
 * @property {'READ'|'EXPORT'|'DOWNLOAD'|'SEARCH_QUERY'} accessType
 * @property {string} [purposeCode]
 * @property {string} [ipAddress]
 * @property {number} [durationMs]
 * @property {number} [bytesTransferred]
 * @property {Record<string, any>} [queryParameters]
 */

class AuditService {
  /**
   * Log an audit event - Core auditing function
   * @param {AuditEventPayload} payload
   * @returns {Promise<void>}
   */
  async logAuditEvent(payload) {
    try {
      const query = `
        INSERT INTO audit_events (
          user_id, event_type, entity_type, entity_id, action,
          before_state, after_state, status, failure_reason,
          ip_address, user_agent, request_id, session_token_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      await db.query(query, [
        payload.userId,
        payload.eventType,
        payload.entityType || null,
        payload.entityId || null,
        payload.action,
        payload.beforeState ? JSON.stringify(payload.beforeState) : null,
        payload.afterState ? JSON.stringify(payload.afterState) : null,
        payload.status || 'SUCCESS',
        payload.failureReason || null,
        payload.ipAddress || null,
        payload.userAgent || null,
        payload.requestId || null,
        payload.sessionTokenHash || null,
      ]);

      logger.info('Audit event logged', {
        eventType: payload.eventType,
        userId: payload.userId,
        action: payload.action,
      });
    } catch (error) {
      logger.error('Failed to log audit event', { error, payload });
      // Don't throw - auditing failures should not break the main application
    }
  }

  /**
   * Log data access for compliance tracking
   * @param {DataAccessPayload} payload
   * @returns {Promise<void>}
   */
  async logDataAccess(payload) {
    try {
      const query = `
        INSERT INTO data_access_logs (
          user_id, resource_type, resource_id, access_type,
          purpose_code, ip_address, duration_ms, bytes_transferred,
          query_parameters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await db.query(query, [
        payload.userId,
        payload.resourceType,
        payload.resourceId,
        payload.accessType,
        payload.purposeCode || null,
        payload.ipAddress || null,
        payload.durationMs || null,
        payload.bytesTransferred || null,
        payload.queryParameters ? JSON.stringify(payload.queryParameters) : null,
      ]);

      logger.debug('Data access logged', {
        userId: payload.userId,
        resourceType: payload.resourceType,
        accessType: payload.accessType,
      });
    } catch (error) {
      logger.error('Failed to log data access', { error, payload });
    }
  }

  /**
   * Log security event (login failures, suspicious activity, etc.)
   * @param {SecurityEventPayload} payload
   * @returns {Promise<void>}
   */
  async logSecurityEvent(payload) {
    try {
      const query = `
        INSERT INTO security_events (
          event_type, severity, email, ip_address, user_agent,
          description, action_taken
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await db.query(query, [
        payload.eventType,
        payload.severity,
        payload.email || null,
        payload.ipAddress || null,
        payload.userAgent || null,
        payload.description,
        payload.actionTaken || null,
      ]);

      logger.warn(`Security event: ${payload.eventType}`, {
        severity: payload.severity,
        email: payload.email,
        ipAddress: payload.ipAddress,
      });

      // If critical, alert admin immediately
      if (payload.severity === 'CRITICAL') {
        await this.alertAdminCriticalSecurityEvent(payload);
      }
    } catch (error) {
      logger.error('Failed to log security event', { error, payload });
    }
  }

  /**
   * Log failed login attempt (for brute force detection)
   * @param {string} email
   * @param {string} [ipAddress]
   * @param {string} [userAgent]
   * @param {string} [reason]
   * @returns {Promise<void>}
   */
  async logFailedLoginAttempt(email, ipAddress, userAgent, reason) {
    try {
      // Get current attempt count for this email+IP combination
      const checkQuery = `
        SELECT COUNT(*) as attempt_count FROM failed_login_attempts
        WHERE email = $1 AND ip_address = $2AND created_at > NOW() - INTERVAL '15 minutes'
      `;

      const result = await db.query(checkQuery, [email, ipAddress || null]);
      const attemptCount = parseInt(result.rows[0]?.attempt_count || 0) + 1;

      // Insert new failed attempt
      const insertQuery = `
        INSERT INTO failed_login_attempts (
          email, ip_address, user_agent, reason, attempt_number, blocked_until
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      let blockedUntil = null;
      // Lock account after 5 attempts within 15 minutes
      if (attemptCount >= 5) {
        blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await this.logSecurityEvent({
          eventType: 'BRUTE_FORCE_DETECTED',
          severity: 'HIGH',
          email,
          ipAddress,
          userAgent,
          description: `Brute force detected: ${attemptCount} failed attempts from ${ipAddress} in 15 minutes`,
          actionTaken: 'ACCOUNT_LOCKED',
        });
      }

      await db.query(insertQuery, [
        email,
        ipAddress || null,
        userAgent || null,
        reason || 'INVALID_PASSWORD',
        attemptCount,
        blockedUntil,
      ]);

      logger.warn('Failed login attempt logged', { email, ipAddress, attemptCount });
    } catch (error) {
      logger.error('Failed to log failed login attempt', { error, email });
    }
  }

  /**
   * Record user consent (GDPR compliance)
   * @param {string} userId
   * @param {string} consentType
   * @param {boolean} consentGiven
   * @param {string} version
   * @param {string} [ipAddress]
   * @param {string} [userAgent]
   * @returns {Promise<void>}
   */
  async recordConsent(userId, consentType, consentGiven, version, ipAddress, userAgent) {
    try {
      const query = `
        INSERT INTO consent_records (
          user_id, consent_type, consent_given, version, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await db.query(query, [
        userId,
        consentType,
        consentGiven,
        version,
        ipAddress || null,
        userAgent || null,
      ]);

      await this.logAuditEvent({
        userId,
        eventType: 'SETTINGS_CHANGE',
        entityType: 'consent',
        entityId: consentType,
        action: 'UPDATE',
        afterState: { consentGiven, version },
        ipAddress,
      });

      logger.info('Consent recorded', { userId, consentType, consentGiven });
    } catch (error) {
      logger.error('Failed to record consent', { error, userId, consentType });
    }
  }

  /**
   * Log API key rotation
   * @param {string} userId
   * @param {string} oldKeyHash
   * @param {string} newKeyHash
   * @param {string} [reason='AUTOMATIC_ROTATION']
   * @param {string} [adminId]
   * @returns {Promise<void>}
   */
  async logApiKeyRotation(userId, oldKeyHash, newKeyHash, reason = 'AUTOMATIC_ROTATION', adminId) {
    try {
      const query = `
        INSERT INTO api_key_rotation_log (
          user_id, old_api_key_hash, new_api_key_hash, reason, rotated_by_admin_id
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await db.query(query, [userId, oldKeyHash, newKeyHash, reason, adminId || null]);

      await this.logAuditEvent({
        userId,
        eventType: 'API_KEY_ROTATION',
        action: 'UPDATE',
        status: 'SUCCESS',
      });

      logger.info('API key rotation logged', { userId, reason });
    } catch (error) {
      logger.error('Failed to log API key rotation', { error, userId });
    }
  }

  /**
   * Log user role change
   * @param {string} userId
   * @param {string} oldRoleId
   * @param {string} newRoleId
   * @param {string} changedByAdminId
   * @param {string} [reason]
   * @returns {Promise<void>}
   */
  async logRoleChange(userId, oldRoleId, newRoleId, changedByAdminId, reason) {
    try {
      const query = `
        INSERT INTO user_role_changes (
          user_id, old_role_id, new_role_id, changed_by_admin_id, reason
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await db.query(query, [
        userId,
        oldRoleId,
        newRoleId,
        changedByAdminId,
        reason || null,
      ]);

      await this.logAuditEvent({
        userId: changedByAdminId,
        eventType: 'ROLE_CHANGE',
        entityType: 'user',
        entityId: userId,
        action: 'UPDATE',
        afterState: { newRoleId },
        status: 'SUCCESS',
      });

      logger.info('Role change logged', { userId, oldRoleId, newRoleId, changedByAdminId });
    } catch (error) {
      logger.error('Failed to log role change', { error, userId });
    }
  }

  /**
   * Log data deletion (GDPR Right to be Forgotten)
   * @param {string} userId
   * @param {string} resourceType
   * @param {number} recordsCount
   * @param {string} [deletionReason='USER_REQUEST']
   * @param {string} [deletedByAdminId]
   * @param {Record<string, any>} [dataSnapshot]
   * @returns {Promise<void>}
   */
  async logDataDeletion(userId, resourceType, recordsCount, deletionReason = 'USER_REQUEST', deletedByAdminId, dataSnapshot) {
    try {
      const query = `
        INSERT INTO data_deletion_logs (
          user_id, resource_type, deletion_reason, records_count, data_snapshot, deleted_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await db.query(query, [
        userId,
        resourceType,
        deletionReason,
        recordsCount,
        dataSnapshot ? JSON.stringify(dataSnapshot) : null,
        deletedByAdminId || null,
      ]);

      await this.logAuditEvent({
        userId: deletedByAdminId || userId,
        eventType: 'DATA_MODIFICATION',
        entityType: resourceType,
        entityId: userId,
        action: 'DELETE',
        status: 'SUCCESS',
      });

      logger.info('Data deletion logged', { userId, resourceType, recordsCount });
    } catch (error) {
      logger.error('Failed to log data deletion', { error, userId });
    }
  }

  /**
   * Log admin action
   * @param {string} adminId
   * @param {string} action
   * @param {string} targetUserId
   * @param {string} [reason]
   * @param {Record<string, any>} [details]
   * @param {string} [ipAddress]
   * @returns {Promise<void>}
   */
  async logAdminAction(adminId, action, targetUserId, reason, details, ipAddress) {
    try {
      const query = `
        INSERT INTO admin_actions_log (
          admin_id, action, target_user_id, reason, details, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await db.query(query, [
        adminId,
        action,
        targetUserId,
        reason || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
      ]);

      logger.warn('Admin action logged', { adminId, action, targetUserId });
    } catch (error) {
      logger.error('Failed to log admin action', { error, adminId });
    }
  }

  /**
   * Alert admin of critical security events
   * @private
   * @param {SecurityEventPayload} payload
   * @returns {Promise<void>}
   */
  async #alertAdminCriticalSecurityEvent(payload) {
    try {
      // TODO: Implement email alert to admins
      logger.error('CRITICAL SECURITY EVENT ALERT', {
        eventType: payload.eventType,
        description: payload.description,
        email: payload.email,
      });
    } catch (error) {
      logger.error('Failed to alert admin', { error });
    }
  }

  /**
   * Generate compliance report (SOC2, GDPR, etc.)
   * @param {'SOC2_AUDIT'|'GDPR_COMPLIANCE'|'DATA_RETENTION_CHECK'} reportType
   * @param {string} adminId
   * @returns {Promise<Record<string, any>>}
   */
  async generateComplianceReport(reportType, adminId) {
    try {
      const report = {
        reportType,
        generatedAt: new Date().toISOString(),
        findings: [],
      };

      if (reportType === 'SOC2_AUDIT') {
        report.findings = await this.#runSOC2Audit();
      } else if (reportType === 'GDPR_COMPLIANCE') {
        report.findings = await this.#runGDPRComplianceCheck();
      } else if (reportType === 'DATA_RETENTION_CHECK') {
        report.findings = await this.#runDataRetentionCheck();
      }

      // Store report
      const query = `
        INSERT INTO compliance_reports_log (
          report_type, generated_by_admin_id, report_data, findings_count
        ) VALUES ($1, $2, $3, $4)
      `;

      await db.query(query, [
        reportType,
        adminId,
        JSON.stringify(report),
        report.findings.length,
      ]);

      logger.info('Compliance report generated', { reportType });
      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', { error, reportType });
      throw error;
    }
  }

  /**
   * Run SOC2 Type II audit checks
   * @private
   * @returns {Promise<Record<string, any>[]>}
   */
  async #runSOC2Audit() {
    const findings = [];

    // Check 1: All API calls are logged
    const apiCallsCheck = await db.query(`
      SELECT COUNT(*) as total FROM api_usage_logs WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    if (apiCallsCheck.rows[0].total === 0) {
      findings.push({
        category: 'API_LOGGING',
        severity: 'CRITICAL',
        message: 'No API calls logged in last 7 days - logging may be disabled',
      });
    }

    // Check 2: Audit events exist
    const auditCheck = await db.query(`
      SELECT COUNT(*) as total FROM audit_events WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    if (auditCheck.rows[0].total === 0) {
      findings.push({
        category: 'AUDIT_LOGGING',
        severity: 'CRITICAL',
        message: 'No audit events recorded in last 7 days',
      });
    }

    // Check 3: Security events are monitored
    const securityCheck = await db.query(`
      SELECT COUNT(*) as total FROM security_events 
      WHERE severity IN ('HIGH', 'CRITICAL') AND created_at > NOW() - INTERVAL '30 days'
    `);
    if (securityCheck.rows[0].total > 10) {
      findings.push({
        category: 'SECURITY_MONITORING',
        severity: 'HIGH',
        message: `${securityCheck.rows[0].total} high/critical security events in last 30 days - review recommended`,
      });
    }

    return findings;
  }

  /**
   * Run GDPR compliance checks
   * @private
   * @returns {Promise<Record<string, any>[]>}
   */
  async #runGDPRComplianceCheck() {
    const findings = [];

    // Check 1: Consent records exist
    const consentCheck = await db.query(`
      SELECT COUNT(*) as total FROM consent_records
    `);
    if (consentCheck.rows[0].total === 0) {
      findings.push({
        category: 'CONSENT_MANAGEMENT',
        severity: 'CRITICAL',
        message: 'No consent records found - GDPR requirement not met',
      });
    }

    // Check 2: Data deletion capability
    const deletionCheck = await db.query(`
      SELECT COUNT(*) as total FROM data_deletion_logs WHERE created_at > NOW() - INTERVAL '90 days'
    `);
    if (deletionCheck.rows[0].total === 0) {
      findings.push({
        category: 'DATA_DELETION',
        severity: 'MEDIUM',
        message: 'No user data deletions recorded - right to be forgotten may not be exercised',
      });
    }

    // Check 3: Data access logs for transparency
    const dataAccessCheck = await db.query(`
      SELECT COUNT(*) as total FROM data_access_logs WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    if (dataAccessCheck.rows[0].total < 100) {
      findings.push({
        category: 'DATA_ACCESS_TRACKING',
        severity: 'MEDIUM',
        message: 'Limited data access logging - consider more detailed tracking',
      });
    }

    return findings;
  }

  /**
   * Run data retention checks
   * @private
   * @returns {Promise<Record<string, any>[]>}
   */
  async #runDataRetentionCheck() {
    const findings = [];

    // Check for old audit events (retain > 1 year per compliance)
    const oldAuditCheck = await db.query(`
      SELECT COUNT(*) as total FROM audit_events WHERE created_at < NOW() - INTERVAL '365 days'
    `);
    if (oldAuditCheck.rows[0].total > 10000) {
      findings.push({
        category: 'AUDIT_RETENTION',
        severity: 'MEDIUM',
        message: `${oldAuditCheck.rows[0].total} audit events older than 1 year - consider archiving`,
      });
    }

    // Check for stale user data
    const staleUsersCheck = await db.query(`
      SELECT COUNT(*) as total FROM api_users 
      WHERE is_active = false AND updated_at < NOW() - INTERVAL '180 days'
    `);
    if (staleUsersCheck.rows[0].total > 0) {
      findings.push({
        category: 'STALE_USER_DATA',
        severity: 'LOW',  
        message: `${staleUsersCheck.rows[0].total} inactive users not accessed in 180+ days - may be purged`,
      });
    }

    return findings;
  }
}

export default new AuditService();
