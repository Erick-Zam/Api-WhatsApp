import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as db from '../db.js';
import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

const generateApiKey = () => `key_${crypto.randomBytes(16).toString('hex')}`;

const ensureUniqueUsername = async (baseUsername) => {
    const sanitizedBase = (baseUsername || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'user';

    for (let i = 0; i < 10; i += 1) {
        const suffix = i === 0 ? '' : `_${crypto.randomBytes(2).toString('hex')}`;
        const candidate = `${sanitizedBase}${suffix}`;
        const exists = await db.query('SELECT 1 FROM api_users WHERE username = $1', [candidate]);
        if (exists.rows.length === 0) {
            return candidate;
        }
    }

    return `user_${crypto.randomBytes(4).toString('hex')}`;
};

const getGeneralRoleId = async () => {
    const roleRes = await db.query("SELECT id FROM roles WHERE name = 'general'");
    if (roleRes.rows.length === 0) {
        throw new Error("System error: Default role 'general' not found");
    }

    return roleRes.rows[0].id;
};

export const issueJwtForUser = (user) => {
    const role = user.role_name || user.role || 'general';

    return jwt.sign(
        { id: user.id, email: user.email, role },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
};

export const issueMfaPendingToken = (user) => jwt.sign(
    { id: user.id, email: user.email, role: user.role_name || user.role || 'general', type: 'mfa_pending' },
    SECRET_KEY,
    { expiresIn: '5m' }
);

export const verifyMfaPendingToken = (token) => {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.type !== 'mfa_pending') {
        throw new Error('Invalid MFA token');
    }
    return decoded;
};

export const getUserByEmail = async (email) => {
    const res = await db.query(`
        SELECT u.id, u.username, u.email, u.password_hash, u.api_key, u.created_at, r.name as role_name
        FROM api_users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = $1
    `, [email]);

    return res.rows[0] || null;
};

export const verifyPasswordForUser = async (user, password) => {
    if (!user?.password_hash) {
        return false;
    }

    return bcrypt.compare(password, user.password_hash);
};

export const validateUserCredentials = async (email, password) => {
    const user = await getUserByEmail(email);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await verifyPasswordForUser(user, password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    return user;
};

export const createUser = async ({ email, username, passwordHash, roleId }) => {
    const insertRes = await db.query(
        `INSERT INTO api_users (username, email, password_hash, api_key, role_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, api_key, created_at`,
        [username, email, passwordHash, generateApiKey(), roleId]
    );

    return insertRes.rows[0];
};

export const createOAuthUser = async ({ email, displayName }) => {
    const roleId = await getGeneralRoleId();
    const username = await ensureUniqueUsername(displayName || email?.split('@')[0] || 'oauth_user');
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    return createUser({ email, username, passwordHash, roleId });
};

export const registerUser = async (email, password, username) => {
    // 1. Check if user exists
    const checkRes = await db.query('SELECT * FROM api_users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
        throw new Error('User already exists');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = generateApiKey();

    // 3. Get Role ID for 'general'
    const roleId = await getGeneralRoleId();

    // 4. Insert into DB
    const insertRes = await db.query(
        `INSERT INTO api_users (username, email, password_hash, api_key, role_id) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, username, email, api_key, created_at`,
        [username, email, hashedPassword, apiKey, roleId]
    );

    const newUser = insertRes.rows[0];
    newUser.role = 'general'; // Add manually for consistent response

    return newUser;
};

export const loginUser = async (email, password) => {
    const user = await validateUserCredentials(email, password);
    const role = user.role_name || 'general';
    const token = issueJwtForUser(user);

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            apiKey: user.api_key,
            role: role
        }
    };
};

export const verifyToken = (token) => {
    return jwt.verify(token, SECRET_KEY);
};
