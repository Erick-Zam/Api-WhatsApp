import * as db from '../db.js';

export const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    }

    try {
        // 1. Check if it's a Session Key (whatsapp_sessions)
        const sessionResult = await db.query('SELECT * FROM whatsapp_sessions WHERE api_key = $1', [apiKey]);

        if (sessionResult.rows.length > 0) {
            const session = sessionResult.rows[0];
            req.sessionId = session.session_id;
            req.isSessionKey = true;

            // Optionally fetch user if needed, but session access is enough for messaging
            if (session.user_id) {
                const userRes = await db.query('SELECT * FROM api_users WHERE id = $1', [session.user_id]);
                req.user = userRes.rows[0] || null;
            }
            return next();
        }

        // 2. Fallback: Check if it's a User Master Key (api_users)
        // (Legacy support or admin access)
        const userResult = await db.query('SELECT * FROM api_users WHERE api_key = $1', [apiKey]);
        if (userResult.rows.length > 0) {
            req.user = userResult.rows[0];
            req.sessionId = req.body.sessionId || 'default'; // Default if not specified
            return next();
        }

        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
