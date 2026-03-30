import crypto from 'crypto';
import speakeasy from 'speakeasy';
import * as db from '../db.js';

const getEncryptionKey = () => {
    const raw = process.env.ENCRYPTION_KEY || '';
    if (raw.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string for MFA encryption');
    }

    return Buffer.from(raw, 'hex');
};

const encryptSecret = (plain) => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSecret = (cipherText) => {
    const [ivHex, tagHex, dataHex] = (cipherText || '').split(':');
    if (!ivHex || !tagHex || !dataHex) {
        throw new Error('Invalid encrypted MFA secret');
    }

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
};

export const getMfaStatus = async (userId) => {
    const result = await db.query(
        'SELECT is_enabled FROM mfa_settings WHERE user_id = $1',
        [userId]
    );

    return {
        enabled: result.rows[0]?.is_enabled === true,
    };
};

export const createMfaSetup = async ({ userId, email }) => {
    const secret = speakeasy.generateSecret({
        name: `WhatsApp API (${email})`,
        issuer: process.env.TOTP_ISSUER || 'WhatsApp API SaaS',
    });

    await db.query(
        `INSERT INTO mfa_settings (user_id, secret_encrypted, is_enabled, updated_at)
         VALUES ($1, $2, FALSE, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET secret_encrypted = EXCLUDED.secret_encrypted, is_enabled = FALSE, updated_at = NOW()`,
        [userId, encryptSecret(secret.base32)]
    );

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
    };
};

const loadUserMfaSecret = async (userId) => {
    const result = await db.query(
        'SELECT secret_encrypted, is_enabled FROM mfa_settings WHERE user_id = $1',
        [userId]
    );

    if (!result.rows[0]?.secret_encrypted) {
        throw new Error('MFA is not configured for this user');
    }

    return {
        secret: decryptSecret(result.rows[0].secret_encrypted),
        enabled: result.rows[0].is_enabled === true,
    };
};

export const verifyMfaSetup = async ({ userId, token }) => {
    const { secret } = await loadUserMfaSecret(userId);

    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: Number.parseInt(process.env.TOTP_WINDOW || '1', 10),
    });

    if (!verified) {
        throw new Error('Invalid MFA code');
    }

    await db.query(
        'UPDATE mfa_settings SET is_enabled = TRUE, updated_at = NOW() WHERE user_id = $1',
        [userId]
    );

    return { verified: true };
};

export const verifyMfaLogin = async ({ userId, token }) => {
    const { secret, enabled } = await loadUserMfaSecret(userId);
    if (!enabled) {
        throw new Error('MFA is not enabled for this user');
    }

    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: Number.parseInt(process.env.TOTP_WINDOW || '1', 10),
    });

    if (!verified) {
        throw new Error('Invalid MFA code');
    }

    return { verified: true };
};

export const disableMfa = async ({ userId, token }) => {
    await verifyMfaLogin({ userId, token });

    await db.query(
        'UPDATE mfa_settings SET is_enabled = FALSE, secret_encrypted = NULL, updated_at = NOW() WHERE user_id = $1',
        [userId]
    );

    return { disabled: true };
};
