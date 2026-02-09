
import { query } from '../db.js';

/**
 * Middleware to log API usage to the database.
 * Stores endpoint, method, status, response time, and user info if available.
 */
export const activityLogger = async (req, res, next) => {
    const start = Date.now();

    // Hook into response finish to capture status code and duration
    res.on('finish', async () => {
        const duration = Date.now() - start;
        const userId = req.user ? req.user.id : null; // Assumes auth middleware ran before

        try {
            // Avoid logging health checks or static assets to keep DB clean
            if (req.path === '/' || req.path.startsWith('/public')) return;

            await query(
                `INSERT INTO api_usage_logs 
                (user_id, endpoint, method, status_code, response_time_ms, user_agent, ip_address) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    userId,
                    req.path,
                    req.method,
                    res.statusCode,
                    duration,
                    req.get('User-Agent') || 'unknown',
                    req.ip
                ]
            );
        } catch (err) {
            console.error('Error logging API usage:', err);
        }
    });

    next();
};

/**
 * Helper to log specific significant actions (Login, Delete, etc.)
 */
export const logAction = async (userId, action, details = {}, ip = '0.0.0.0') => {
    try {
        await query(
            `INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
            [userId, action, details, ip]
        );
    } catch (err) {
        console.error('Error logging action:', err);
    }
};
