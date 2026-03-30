/**
 * GDPR Compliance Routes
 * Implements user rights under GDPR:
 * - Right to be forgotten (deletion)
 * - Data portability (export)
 * - Right to rectification (update)
 * - Right to restrict processing
 * - Data subject access request
 */

import express from 'express';
import { verifyJwt } from '../middleware/jwtAuth.js';
import gdprComplianceService from '../services/gdprCompliance.js';
import auditService from '../services/audit.js';
import { logger } from '../services/logger.js';

const router = express.Router();

/**
 * GET /api/gdpr/data-access-report
 * GDPR Article 15: Data Subject Access Request (DSAR)
 * Returns a comprehensive report of what data is held about the user
 */
router.get('/data-access-report', verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info('GDPR DSAR request', { userId });

    const report = await gdprComplianceService.generateDataSubjectAccessReport(userId);

    // Log the DSAR request
    await auditService.logDataAccess({
      userId,
      resourceType: 'user_profile',
      resourceId: userId,
      accessType: 'EXPORT',
      purposeCode: 'DSAR_GDPR',
      ipAddress: req.ip,
      durationMs: Date.now() - req.auditData.startTime,
    });

    res.json({
      success: true,
      message: 'Data Subject Access Report generated',
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GDPR DSAR failed', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to generate DSAR report',
    });
  }
});

/**
 * GET /api/gdpr/export
 * GDPR Article 20: Right to Data Portability
 * Export all user personal data in machine-readable format (JSON)
 */
router.get('/export', verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info('GDPR data portability export requested', { userId });

    const result = await gdprComplianceService.exportUserData(userId);

    // Log the export
    await auditService.logDataAccess({
      userId,
      resourceType: 'user_profile_export',
      resourceId: userId,
      accessType: 'EXPORT',
      purposeCode: 'DATA_PORTABILITY',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Your data has been exported',
      filename: result.filename,
      dataIncluded: result.dataIncluded,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GDPR data export failed', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to export user data',
    });
  }
});

/**
 * POST /api/gdpr/rectify
 * GDPR Article 16: Right to Rectification
 * Allow users to correct inaccurate personal data
 * 
 * Body: { username?: string, email?: string }
 */
router.post('/rectify', verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (username or email) is required',
      });
    }

    logger.info('GDPR rectification request', { userId });

    const result = await gdprComplianceService.rectifyUserData(userId, {
      username,
      email,
    });

    // Log the rectification
    await auditService.logAuditEvent({
      userId,
      eventType: 'DATA_MODIFICATION',
      entityType: 'user_profile',
      entityId: userId,
      action: 'UPDATE',
      afterState: result.updated,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'User data rectified successfully',
      updatedFields: result.updated,
    });
  } catch (error) {
    logger.error('GDPR rectification failed', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rectify user data',
    });
  }
});

/**
 * POST /api/gdpr/restrict-processing
 * GDPR Article 18: Right to Restrict Processing
 * User can request to temporarily suspend data processing
 */
router.post('/restrict-processing', verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    logger.info('GDPR restrict processing request', { userId, reason });

    const result = await gdprComplianceService.restrictProcessing(userId, reason);

    // Log the restriction
    await auditService.logAuditEvent({
      userId,
      eventType: 'DATA_MODIFICATION',
      entityType: 'account_status',
      entityId: userId,
      action: 'UPDATE',
      afterState: { status: 'RESTRICTED', reason },
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Data processing restricted',
      status: result.status,
      restrictedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GDPR restrict processing failed', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to restrict data processing',
    });
  }
});

/**
 * POST /api/gdpr/lift-restriction
 * Resume data processing after restriction
 */
router.post('/lift-restriction', verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info('GDPR lift restriction request', { userId });

    const result = await gdprComplianceService.liftRestriction(userId);

    // Log the restriction lift
    await auditService.logAuditEvent({
      userId,
      eventType: 'DATA_MODIFICATION',
      entityType: 'account_status',
      entityId: userId,
      action: 'UPDATE',
      afterState: { status: 'ACTIVE' },
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Data processing restriction lifted',
      status: result.status,
      liftedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GDPR lift restriction failed', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to lift processing restriction',
    });
  }
});

/**
 * POST /api/gdpr/delete
 * GDPR Article 17: Right to be Forgotten
 * Permanently delete all user personal data
 * 
 * CAUTION: This operation is irreversible!
 * The user must confirm this action multiple times
 */
router.post('/delete', verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;

    // Require explicit confirmation to prevent accidental deletion
    if (confirmation !== 'PERMANENTLY_DELETE_ALL_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation token invalid. Please confirm: "PERMANENTLY_DELETE_ALL_DATA"',
      });
    }

    logger.warn('GDPR Right to be Forgotten initiated', { userId });

    const result = await gdprComplianceService.deleteUserData(userId, 'USER_REQUEST');

    // Log the deletion
    await auditService.logDataDeletion(
      userId,
      'ENTIRE_PROFILE',
      result.dataDeleted.messages + result.dataDeleted.contacts,
      'USER_REQUEST_GDPR_ARTICLE_17',
      null,
      null
    );

    res.json({
      success: true,
      message: 'Account and all associated data permanently deleted',
      dataDeleted: result.dataDeleted,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GDPR deletion failed', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user data',
    });
  }
});

export default router;
