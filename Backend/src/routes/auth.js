import express from 'express';
import {
    registerUser,
    loginUser,
    validateUserCredentials,
    issueJwtForUser,
    issueMfaPendingToken,
    verifyMfaPendingToken,
    generateVerificationToken,
    sendVerificationEmail,
    verifyEmailToken,
    setPasswordForUser,
} from '../services/auth.js';
import { logAudit, logError } from '../services/logger.js';
import { verifyJwt } from '../middleware/jwtAuth.js';
import * as db from '../db.js';
import {
    generateOAuthUrl,
    processOAuthCallback,
    unlinkOAuthProvider,
    getUserOAuthProviders,
} from '../services/oauth.js';
import {
    createMfaSetup,
    getMfaStatus,
    verifyMfaSetup,
    verifyMfaLogin,
    disableMfa,
    isTrustedDevice,
    trustDevice,
    getTrustedDevices,
    removeTrustedDevice,
    generateDeviceFingerprint,
} from '../services/mfa.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const user = await registerUser(email, password, username);

        logAudit(user.id, 'REGISTER', { email }, req.ip);
        res.status(201).json({ message: 'User created', user });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(400).json({ error: error.message });
    }
});



router.get('/me', verifyJwt, async (req, res) => {
    try {
        const { id } = req.user;
        const result = await db.query(`
            SELECT u.id, u.username, u.email, u.api_key, r.name as role, u.created_at,
                   COALESCE(ms.is_enabled, false) as mfa_enabled
            FROM api_users u 
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN mfa_settings ms ON ms.user_id = u.id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await validateUserCredentials(email, password);
        const mfaStatus = await getMfaStatus(user.id);
        const requiresMfa = user.role_name === 'admin' || mfaStatus.enabled;

        if (requiresMfa) {
            logAudit(user.id, 'LOGIN_MFA_REQUIRED', { email }, req.ip);
            return res.json({
                requiresMfa: true,
                mfaToken: issueMfaPendingToken(user),
            });
        }

        const result = await loginUser(email, password);
        logAudit(result.user.id, 'LOGIN', { email }, req.ip);
        
        // Add recommendation for MFA if user is admin and hasn't enabled it yet
        result.recommendMfa = (user.role_name === 'admin' && !mfaStatus.enabled);
        
        return res.json(result);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(401).json({ error: error.message });
    }
});

router.post('/mfa/login-verify', async (req, res) => {
    try {
        const { mfaToken, code, deviceFingerprint, trustDevice: shouldTrustDevice } = req.body;
        if (!mfaToken || !code) {
            return res.status(400).json({ error: 'mfaToken and code are required' });
        }

        const pending = verifyMfaPendingToken(mfaToken);
        
        // Check if device is already trusted (optional: skip TOTP if trusted)
        // For now, always require TOTP but allow trust device mark
        const isTrusted = deviceFingerprint ? await isTrustedDevice(pending.id, deviceFingerprint) : false;
        
        // Verify MFA if device is not trusted or user needs to verify
        await verifyMfaLogin({ userId: pending.id, token: code });

        // If user wants to trust this device, store it
        if (shouldTrustDevice && deviceFingerprint) {
            const deviceName = req.get('user-agent')?.substring(0, 100) || 'Unknown Device';
            await trustDevice(pending.id, deviceFingerprint, deviceName);
        }

        const userResult = await db.query(`
            SELECT u.id, u.username, u.email, u.api_key, r.name as role_name
            FROM api_users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `, [pending.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        const token = issueJwtForUser(user);

        logAudit(user.id, 'LOGIN_MFA_VERIFIED', { email: user.email, trusted: shouldTrustDevice }, req.ip);
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                apiKey: user.api_key,
                role: user.role_name || 'general',
            },
        });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        return res.status(401).json({ error: error.message });
    }
});

router.get('/oauth/:provider/url', async (req, res) => {
    try {
        const { provider } = req.params;
        const data = generateOAuthUrl(provider);
        return res.json(data);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.params);
        return res.status(400).json({ error: error.message });
    }
});

router.get('/oauth/:provider/callback', async (req, res) => {
    const { provider } = req.params;
    const { code, state } = req.query;

    try {
        if (!code || !state) {
            return res.status(400).json({ error: 'Missing code or state' });
        }

        const result = await processOAuthCallback({
            provider,
            code,
            state,
        });

        logAudit(result.user.id, 'LOGIN_OAUTH', { provider, email: result.user.email }, req.ip);

        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL('/login', frontendBase);
        redirectUrl.searchParams.set('token', result.token);
        return res.redirect(302, redirectUrl.toString());
    } catch (error) {
        logError('Auth', error.message, error.stack, { provider, code: !!code, state: !!state });
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL('/login', frontendBase);
        redirectUrl.searchParams.set('error', error.message);
        return res.redirect(302, redirectUrl.toString());
    }
});

router.get('/oauth/providers', verifyJwt, async (req, res) => {
    try {
        const providers = await getUserOAuthProviders(req.user.id);
        return res.json({ providers });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.user);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/oauth/:provider', verifyJwt, async (req, res) => {
    try {
        const unlinked = await unlinkOAuthProvider({ userId: req.user.id, provider: req.params.provider });
        if (!unlinked) {
            return res.status(404).json({ error: 'OAuth provider link not found' });
        }

        logAudit(req.user.id, 'OAUTH_UNLINK', { provider: req.params.provider }, req.ip);
        return res.json({ message: 'OAuth provider unlinked successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.params);
        return res.status(400).json({ error: error.message });
    }
});

router.get('/mfa/status', verifyJwt, async (req, res) => {
    try {
        return res.json(await getMfaStatus(req.user.id));
    } catch (error) {
        logError('Auth', error.message, error.stack, req.user);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/mfa/setup', verifyJwt, async (req, res) => {
    try {
        const userResult = await db.query('SELECT email FROM api_users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const setup = await createMfaSetup({ userId: req.user.id, email: userResult.rows[0].email });
        logAudit(req.user.id, 'MFA_SETUP_INIT', {}, req.ip);
        return res.json(setup);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.user);
        return res.status(400).json({ error: error.message });
    }
});

router.post('/mfa/verify', verifyJwt, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'code is required' });
        }

        await verifyMfaSetup({ userId: req.user.id, token: code });
        logAudit(req.user.id, 'MFA_ENABLED', {}, req.ip);
        return res.json({ message: 'MFA enabled successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        return res.status(400).json({ error: error.message });
    }
});

router.post('/mfa/disable', verifyJwt, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'code is required' });
        }

        await disableMfa({ userId: req.user.id, token: code });
        logAudit(req.user.id, 'MFA_DISABLED', {}, req.ip);
        return res.json({ message: 'MFA disabled successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        return res.status(400).json({ error: error.message });
    }
});

router.put('/change-password', verifyJwt, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { id } = req.user;

        // Verify current password logic (needs bcrypt import if doing it here, or use service)
        // For simplicity, let's call a service function or do it here.
        // Let's import bcrypt here as it's not imported at top.
        const bcrypt = await import('bcryptjs');
        const db = await import('../db.js');

        const userResult = await db.default.query('SELECT password_hash FROM api_users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.default.compare(currentPassword, userResult.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

        const hashed = await bcrypt.default.hash(newPassword, 10);
        await db.default.query('UPDATE api_users SET password_hash = $1 WHERE id = $2', [hashed, id]);

        logAudit(id, 'PASSWORD_CHANGE', {}, req.ip);
        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/logs', verifyJwt, async (req, res) => {
    try {
        const { id } = req.user;
        const limit = Number.parseInt(req.query.limit) || 50;
        const offset = Number.parseInt(req.query.offset) || 0;

        const result = await db.query(`
            SELECT * FROM api_usage_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `, [id, limit, offset]);

        res.json(result.rows);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.query);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/profile', verifyJwt, async (req, res) => {
    try {
        const { username, email } = req.body;
        const { id } = req.user;

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and Email are required' });
        }

        await db.query('UPDATE api_users SET username = $1, email = $2 WHERE id = $3', [username, email, id]);

        logAudit(id, 'PROFILE_UPDATE', { username, email }, req.ip);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Email Verification Endpoints
router.post('/send-verification-email', verifyJwt, async (req, res) => {
    try {
        const { id, email } = req.user;
        const token = generateVerificationToken();
        
        await sendVerificationEmail(id, email, token);
        logAudit(id, 'VERIFICATION_EMAIL_SENT', { email }, req.ip);
        
        res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.user);
        res.status(400).json({ error: error.message });
    }
});

router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const result = await verifyEmailToken(token);
        
        logAudit(result.user_id, 'EMAIL_VERIFIED', { email: result.email }, '');
        
        // Redirect to login/dashboard or return JSON
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(302, `${frontendUrl}/login?verified=true`);
    } catch (error) {
        logError('Auth', error.message, error.stack, req.params);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(302, `${frontendUrl}/login?verifyError=${encodeURIComponent(error.message)}`);
    }
});

// Password Setup for OAuth users
router.post('/set-password', verifyJwt, async (req, res) => {
    try {
        const { id, email } = req.user;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'newPassword is required' });
        }

        await setPasswordForUser(id, newPassword);
        logAudit(id, 'PASSWORD_SET', { email }, req.ip);
        
        res.json({ message: 'Password set successfully' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.body);
        res.status(400).json({ error: error.message });
    }
});

// Trusted Devices Endpoints
router.get('/mfa/trusted-devices', verifyJwt, async (req, res) => {
    try {
        const devices = await getTrustedDevices(req.user.id);
        res.json({ devices });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.user);
        res.status(500).json({ error: 'Failed to retrieve trusted devices' });
    }
});

router.delete('/mfa/trusted-devices/:deviceId', verifyJwt, async (req, res) => {
    try {
        const { deviceId } = req.params;
        await removeTrustedDevice(req.user.id, deviceId);
        logAudit(req.user.id, 'TRUSTED_DEVICE_REMOVED', { deviceId }, req.ip);
        res.json({ message: 'Device removed from trusted list' });
    } catch (error) {
        logError('Auth', error.message, error.stack, req.params);
        res.status(400).json({ error: error.message });
    }
});

export default router;
