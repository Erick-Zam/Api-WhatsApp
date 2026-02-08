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

    // 3. Insert into DB
    const insertRes = await db.query(
        `INSERT INTO api_users (username, email, password_hash, api_key) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, api_key, role, created_at`,
        [username, email, hashedPassword, apiKey]
    );

    return insertRes.rows[0];
};

export const loginUser = async (email, password) => {
    // 1. Find user
    const res = await db.query('SELECT * FROM api_users WHERE email = $1', [email]);
    const user = res.rows[0];

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // 3. Sign Token
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
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
            role: user.role
        }
    };
};

export const verifyToken = (token) => {
    return jwt.verify(token, SECRET_KEY);
};
