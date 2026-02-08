import * as db from '../db.js';

export const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    }

    try {
        const result = await db.query('SELECT * FROM api_users WHERE api_key = $1', [apiKey]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
        }

        // Attach user info to request
        req.user = result.rows[0];
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
