/**
 * Audit Middleware - Express middleware for automatic audit logging
 * Logs all HTTP requests for compliance and security monitoring
 */

import { v4 as uuidv4 } from 'uuid';
import auditService from '../services/audit.js';
import { logger } from '../services/logger.js';
import crypto from 'crypto';

/**
 * Generate request ID for tracking audit events
 */
function generateRequestId() {
  return uuidv4();
}

/**
 * Hash a token for secure storage (don't store actual tokens)
 */
function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Extract IP address from request (handles proxies)
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress
  );
}

/**
 * Main audit middleware - Generate request ID and capture metadata
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {void}
 */
export function auditMiddleware(req, res, next) {
  // Generate request ID for tracking
  req.requestId = generateRequestId();
  req.auditData = {
    startTime: Date.now(),
    method: req.method,
    endpoint: req.path,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };

  // Capture session token hash if present
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    req.auditData.sessionTokenHash = hashToken(token);
  }

  // Hook into response to capture status code
  const originalSend = res.send;
  res.send = function (data) {
    res.auditStatusCode = res.statusCode;
    res.auditResponseTime = Date.now() - req.auditData.startTime;
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Post-request audit logging middleware (call after route handlers)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {void}
 */
export function auditLogger(req, res, next) {
  // Log API usage for analytics and compliance
  logApiUsage(req, res);

  // If user is authenticated, log the audit event
  if (req.user?.id) {
    logRequestAuditEvent(req, res);
  }

  next();
}

/**
 * Log API usage statistics
 */
async function logApiUsage(req, res) {
  try {
    const userId = req.user?.id || null;
    const statusCode = res.auditStatusCode || res.statusCode || 200;
    const responseTime = res.auditResponseTime || 0;

    const query = `
      INSERT INTO api_usage_logs (
        user_id, endpoint, method, status_code, response_time_ms, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    // Execute asynchronously, don't block response
    const db = (await import('../db.js')).default;
    db.query(query, [
      userId,
      req.path,
      req.method,
      statusCode,
      responseTime,
      req.headers['user-agent'] || null,
      req.auditData.ipAddress || null,
    ]).catch((err) => {
      logger.error('Failed to log API usage', { error: err, path: req.path });
    });
  } catch (error) {
    logger.debug('API usage logging skipped', { error: error.message });
  }
}

/**
 * Log detailed audit events for user actions
 */
async function logRequestAuditEvent(req, res) {
  try {
    const userId = req.user?.id;
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode || 200;
    const isSuccessful = statusCode >= 200 && statusCode < 300;

    // Determine event type based on endpoint
    let eventType = 'API_CALL';
    if (path.includes('/auth/')) {
      eventType = 'USER_LOGIN';
    } else if (path.includes('/api/')) {
      eventType = 'API_CALL';
    }

    // Determine action type based on HTTP method
    let action = 'READ';
    if (method === 'POST') action = 'CREATE';
    if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    if (method === 'DELETE') action = 'DELETE';

    // Extract resource info from path
    const pathParts = path.split('/').filter((p) => p);
    const entityType = pathParts[2] || 'unknown';
    const entityId = pathParts[3] || null;

    // Create audit payload
    const auditPayload = {
      userId,
      eventType,
      entityType,
      entityId,
      action,
      status: isSuccessful ? 'SUCCESS' : statusCode === 401 ? 'FAILED' : 'FAILED',
      failureReason: !isSuccessful ? `HTTP ${statusCode}` : null,
      ipAddress: req.auditData.ipAddress,
      userAgent: req.auditData.userAgent,
      requestId: req.requestId,
      sessionTokenHash: req.auditData.sessionTokenHash,
    };

    // Log to audit service
    await auditService.logAuditEvent(auditPayload);
  } catch (error) {
    logger.debug('Audit event logging skipped', { error: error.message });
  }
}

/**
 * Monitor for security threats - Detect suspicious path access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {void}
 */
export function securityMonitoringMiddleware(req, res, next) {
  const ipAddress = getClientIp(req);
  const path = req.path;

  // Check for suspicious paths
  const suspiciousPaths = ['/admin', '/api/admin', '/config', '/.env', '/password', '/secret'];
  const isSuspicious = suspiciousPaths.some((p) => path.includes(p));

  if (isSuspicious) {
    logger.warn('Suspicious path access detected', {
      path,
      ipAddress,
      method: req.method,
    });

    // Log security event
    auditService.logSecurityEvent({
      eventType: 'UNAUTHORIZED_ACCESS',
      severity: 'MEDIUM',
      description: `Suspicious path access: ${path} from ${ipAddress}`,
      ipAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  next();
}

/**
 * Track failed login attempt
 * @param {string} email - User email
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
export async function trackFailedLogin(email, req) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    await auditService.logFailedLoginAttempt(email, ipAddress, userAgent, 'INVALID_PASSWORD');
  } catch (error) {
    logger.error('Failed to track failed login', { error, email });
  }
}

/**
 * Track successful login (reset failed attempts)
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
export async function trackSuccessfulLogin(userId, email, req) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    await auditService.logAuditEvent({
      userId,
      eventType: 'USER_LOGIN',
      action: 'CREATE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    // Clear failed login attempts
    const db = (await import('../db.js')).default;
    await db.query(
      `DELETE FROM failed_login_attempts WHERE email = $1 AND created_at < NOW() - INTERVAL '1 hour'`,
      [email]
    );
  } catch (error) {
    logger.error('Failed to track successful login', { error, userId });
  }
}

/**
 * Track user logout
 * @param {string} userId - User ID
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
export async function trackLogout(userId, req) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    await auditService.logAuditEvent({
      userId,
      eventType: 'USER_LOGOUT',
      action: 'DELETE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error('Failed to track logout', { error, userId });
  }
}

/**
 * Track data access (for GDPR transparency)
 * @param {string} userId - User ID
 * @param {string} resourceType - Type of resource accessed
 * @param {string|number} resourceId - ID of resource accessed
 * @param {Object} req - Express request object
 * @returns {Promise<void>}
 */
export async function trackDataAccess(userId, resourceType, resourceId, req) {
  try {
    const ipAddress = getClientIp(req);
    const startTime = req.auditData?.startTime || Date.now();
    const duration = Date.now() - startTime;

    await auditService.logDataAccess({
      userId,
      resourceType,
      resourceId,
      accessType: 'READ',
      purposeCode: 'API_REQUEST',
      ipAddress,
      durationMs: duration,
    });
  } catch (error) {
    logger.debug('Failed to track data access', { error: error.message });
  }
}

export default {
  auditMiddleware,
  auditLogger,
  securityMonitoringMiddleware,
  trackFailedLogin,
  trackSuccessfulLogin,
  trackLogout,
  trackDataAccess,
};
