import axios from 'axios';
import * as db from '../db.js';
import crypto from 'crypto';
import { createOAuthUser, issueJwtForUser } from './auth.js';

const stateStore = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

const OAUTH_CONFIG = {
    google: {
        enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scopes: ['openid', 'email', 'profile'],
    },
    github: {
        enabled: process.env.GITHUB_OAUTH_ENABLED === 'true',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: process.env.GITHUB_CALLBACK_URL,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        userEmailsUrl: 'https://api.github.com/user/emails',
        scopes: ['read:user', 'user:email'],
    },
    microsoft: {
        enabled: process.env.MICROSOFT_OAUTH_ENABLED === 'true',
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackUrl: process.env.MICROSOFT_CALLBACK_URL,
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email', 'User.Read'],
    },
};

const cleanupStateStore = () => {
    const now = Date.now();
    for (const [state, value] of stateStore.entries()) {
        if (value.expiresAt < now) {
            stateStore.delete(state);
        }
    }
};

const assertProvider = (provider) => {
    const config = OAUTH_CONFIG[provider];
    if (!config) {
        throw new Error('Unsupported OAuth provider');
    }
    if (!config.enabled) {
        throw new Error(`OAuth provider '${provider}' is disabled`);
    }
    if (!config.clientId || !config.clientSecret || !config.callbackUrl) {
        throw new Error(`OAuth provider '${provider}' is not configured`);
    }
    return config;
};

const buildGoogleAuthUrl = (config, state) => {
    const url = new URL(config.authUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
};

const buildGithubAuthUrl = (config, state) => {
    const url = new URL(config.authUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.callbackUrl);
    url.searchParams.set('scope', config.scopes.join(' '));
    url.searchParams.set('state', state);
    return url.toString();
};

const buildMicrosoftAuthUrl = (config, state) => {
    const url = new URL(config.authUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('response_mode', 'query');
    return url.toString();
};

const getProviderProfile = async (provider, code) => {
    const config = assertProvider(provider);

    if (provider === 'google') {
        const tokenRes = await axios.post(config.tokenUrl, new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.callbackUrl,
            grant_type: 'authorization_code',
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
        });

        const accessToken = tokenRes.data.access_token;
        const profileRes = await axios.get(config.userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 15000,
        });

        const profile = profileRes.data;
        if (!profile?.sub || !profile?.email) {
            throw new Error('Google profile is missing required fields');
        }

        return {
            providerUserId: profile.sub,
            email: profile.email.toLowerCase(),
            displayName: profile.name || profile.email.split('@')[0],
        };
    }

    if (provider === 'github') {
        const tokenRes = await axios.post(config.tokenUrl, {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.callbackUrl,
        }, {
            headers: { Accept: 'application/json' },
            timeout: 15000,
        });

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) {
            throw new Error('GitHub token exchange failed');
        }

        const profileRes = await axios.get(config.userInfoUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
            timeout: 15000,
        });

        const emailsRes = await axios.get(config.userEmailsUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
            timeout: 15000,
        });

        const profile = profileRes.data;
        const primaryEmailEntry = (emailsRes.data || []).find((entry) => entry.primary && entry.verified)
            || (emailsRes.data || []).find((entry) => entry.verified)
            || (emailsRes.data || [])[0];

        const email = (profile.email || primaryEmailEntry?.email || '').toLowerCase();
        if (!profile?.id || !email) {
            throw new Error('GitHub profile is missing required email or id');
        }

        return {
            providerUserId: String(profile.id),
            email,
            displayName: profile.name || profile.login || email.split('@')[0],
        };
    }

    if (provider === 'microsoft') {
        const tokenRes = await axios.post(config.tokenUrl, new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.callbackUrl,
            grant_type: 'authorization_code',
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
        });

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) {
            throw new Error('Microsoft token exchange failed');
        }

        const profileRes = await axios.get(config.userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 15000,
        });

        const profile = profileRes.data;
        const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();
        if (!profile?.id || !email) {
            throw new Error('Microsoft profile is missing required email or id');
        }

        return {
            providerUserId: String(profile.id),
            email,
            displayName: profile.displayName || email.split('@')[0],
        };
    }

    throw new Error('Unsupported OAuth provider');
};

const linkOAuthAccount = async (userId, provider, providerUserId, providerEmail) => {
    await db.query(
        `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (provider, provider_user_id)
         DO UPDATE SET user_id = EXCLUDED.user_id, provider_email = EXCLUDED.provider_email, updated_at = NOW()`,
        [userId, provider, providerUserId, providerEmail]
    );
};

const findUserByOAuth = async (provider, providerUserId) => {
    const result = await db.query(
        `SELECT u.id, u.email, u.username, u.api_key, r.name AS role_name
         FROM oauth_accounts oa
         JOIN api_users u ON u.id = oa.user_id
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE oa.provider = $1 AND oa.provider_user_id = $2`,
        [provider, providerUserId]
    );

    return result.rows[0] || null;
};

const findUserByEmail = async (email) => {
    const result = await db.query(
        `SELECT u.id, u.email, u.username, u.api_key, r.name AS role_name
         FROM api_users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.email = $1`,
        [email]
    );

    return result.rows[0] || null;
};

export const generateOAuthUrl = (provider) => {
    cleanupStateStore();
    const config = assertProvider(provider);
    const state = crypto.randomUUID();

    stateStore.set(state, {
        provider,
        expiresAt: Date.now() + STATE_TTL_MS,
    });

    if (provider === 'google') {
        return { url: buildGoogleAuthUrl(config, state), state };
    }

    if (provider === 'github') {
        return { url: buildGithubAuthUrl(config, state), state };
    }

    if (provider === 'microsoft') {
        return { url: buildMicrosoftAuthUrl(config, state), state };
    }

    throw new Error('Unsupported OAuth provider');
};

export const processOAuthCallback = async ({ provider, code, state }) => {
    const stateData = stateStore.get(state);
    stateStore.delete(state);

    if (!stateData || stateData.provider !== provider || stateData.expiresAt < Date.now()) {
        throw new Error('Invalid or expired OAuth state');
    }

    const providerProfile = await getProviderProfile(provider, code);

    let user = await findUserByOAuth(provider, providerProfile.providerUserId);

    if (!user) {
        user = await findUserByEmail(providerProfile.email);

        if (!user) {
            user = await createOAuthUser({
                email: providerProfile.email,
                displayName: providerProfile.displayName,
            });
        }

        await linkOAuthAccount(user.id, provider, providerProfile.providerUserId, providerProfile.email);
    }

    const token = issueJwtForUser(user);

    return {
        token,
        user,
        provider,
    };
};

export const unlinkOAuthProvider = async ({ userId, provider }) => {
    const result = await db.query(
        'DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = $2 RETURNING id',
        [userId, provider]
    );

    return result.rows.length > 0;
};

export const getUserOAuthProviders = async (userId) => {
    const result = await db.query(
        `SELECT provider, provider_email, created_at, updated_at
         FROM oauth_accounts
         WHERE user_id = $1
         ORDER BY provider ASC`,
        [userId]
    );

    return result.rows;
};
