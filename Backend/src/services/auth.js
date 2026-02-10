import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as db from '../db.js';
import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

export const registerUser = async (email, password, username) => {
    // 1. Check if user exists
    const checkRes = await db.query('SELECT * FROM api_users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
        throw new Error('User already exists');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = `key_${crypto.randomBytes(16).toString('hex')}`;

    // 3. Get Role ID for 'general'
    const roleRes = await db.query("SELECT id FROM roles WHERE name = 'general'");
    if (roleRes.rows.length === 0) {
        throw new Error("System error: Default role 'general' not found");
    }
    const roleId = roleRes.rows[0].id;

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
    // 1. Find user AND role
    const res = await db.query(`
        SELECT u.id, u.username, u.email, u.password_hash, u.api_key, u.created_at, r.name as role_name
        FROM api_users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = $1
    `, [email]);

    const user = res.rows[0];

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // 3. Sign Token (using role name)
    const role = user.role_name || 'general'; // Fallback if join failed

    const token = jwt.sign(
        { id: user.id, email: user.email, role: role },
        SECRET_KEY,
        { expiresIn: '24h' }
    );

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
