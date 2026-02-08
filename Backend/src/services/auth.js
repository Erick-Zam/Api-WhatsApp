import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const USERS = []; // In-memory store for demo. REPLACE WITH DB CALLS.

export const registerUser = async (email, password, username) => {
    // Check if user exists (mock check)
    if (USERS.find(u => u.email === email)) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}`;
    const apiKey = `key_${Math.random().toString(36).substr(2, 9)}`;

    const newUser = {
        id: userId,
        email,
        username,
        password: hashedPassword,
        apiKey
    };

    USERS.push(newUser); // Save to DB in real app
    return { id: userId, email, username, apiKey };
};

export const loginUser = async (email, password) => {
    const user = USERS.find(u => u.email === email);
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    return { token, user: { id: user.id, email: user.email, username: user.username, apiKey: user.apiKey } };
};

export const verifyToken = (token) => {
    return jwt.verify(token, SECRET_KEY);
};
