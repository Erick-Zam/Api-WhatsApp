import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import messageRoutes from './routes/messages.js';
import authRoutes from './routes/auth.js';
import { authenticate } from './middleware/auth.js';
import schedulerRoutes from './routes/scheduler.js';
import templateRoutes from './routes/templates.js';
import webhookRoutes from './routes/webhooks.js';
import chatRoutes from './routes/chats.js';
import sessionEngineRoutes from './routes/sessionEngine.js';
import { initScheduler } from './services/scheduler.js';
import * as db from './db.js'; // Import DB to check ownership

import { activityLogger } from './middleware/activityLogger.js';
import adminRoutes from './routes/admin.js';

// --- FASE 3: Audit & Compliance Middleware ---
import {
  auditMiddleware,
  auditLogger,
  securityMonitoringMiddleware,
} from './middleware/auditLog.js';
import gdprRoutes from './routes/gdpr.js';
import { connectSession, disconnectSession } from './services/sessionOrchestrator.js';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Security Middleware ---
app.use(helmet()); // Set secure HTTP headers
app.use(cors()); // Configure CORS (restrict in production!)
app.use(express.json());
app.use(express.static('public')); // Serve static files (Dashboard)

// --- FASE 3: Audit & Security Monitoring Middleware ---
app.use(auditMiddleware); // Generate request ID and capture metadata
app.use(securityMonitoringMiddleware); // Monitor for suspicious access patterns

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // Increased limit to support dashboard polling (approx 5s interval)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use(activityLogger); // Log all requests

// --- Public Routes ---

app.get('/', (req, res) => {
    res.send('WhatsApp API Backend SaaS is running! Visit <a href="/admin/">/admin/</a> for the dashboard.');
});

// Admin Routes (Protected inside)
app.use('/api/admin', adminRoutes);

// Auth Routes (Login/Register)
app.use('/auth', authRoutes);

// --- Protected Routes (Require x-api-key or Bearer Token) ---

// Apply authentication to all following routes
// Note: We need a way to authenticate via Bearer token for Dashboard users AND x-api-key for API users.
// The 'authenticate' middleware supports both? 
// Let's verify 'authenticate' middleware supports Bearer token from 'auth.js'.
// It currently checks 'x-api-key'. We might need to enhance 'authenticate' or use 'verifyJwt' from 'middleware/jwtAuth.js' for dashboard.
// actually 'authenticate' in 'middleware/auth.js' looks for 'x-api-key' in headers.
// The dashboard sends 'Authorization: Bearer ...' for /auth/me, but maybe 'x-api-key' for others?
// The dashboard playground sends 'x-api-key'.
// But the Dashboard Session Management usually uses the JWT token.
// let's update routes to use verifyJwt for management endpoints.

import { verifyJwt } from './middleware/jwtAuth.js';

// --- GDPR & Compliance Routes (Protected by JWT) ---
app.use('/api/gdpr', gdprRoutes);

// --- Session Management Routes (Protected by JWT) ---

// Get QR / Status for a specific session
app.get('/qr', verifyJwt, async (req, res) => {
    const { sessionId } = req.query; // e.g. ?sessionId=marketing
    const userId = req.user.id;

    // Verify ownership
    // For simplicity, we assume session name matches, or we check DB.
    // Ideally, we check if this sessionId belongs to user.

    import('./whatsapp.js').then(wa => {
        const id = sessionId || 'default';
        const qr = wa.getQRCode(id);
        const status = wa.getConnectionStatus(id);
        const user = wa.getConnectedUser(id);
        res.json({ qr, status, user, sessionId: id });
    });
});

// List all active sessions (Filtered by User)
app.get('/sessions', verifyJwt, async (req, res) => {
    try {
        const wa = await import('./whatsapp.js');
        const { listAllSessionKeys } = await import('./services/apiKeys.js');
        const userId = req.user.id;

        // Fetch user's sessions from DB
        const userSessions = await db.default.query('SELECT * FROM whatsapp_sessions WHERE user_id = $1', [userId]);
        const userSessionIds = userSessions.rows.map(row => row.session_id);

        const activeSessions = wa.listSessions();

        // Filter active sessions to only those belonging to user
        const visibleActiveSessions = activeSessions.filter(s => userSessionIds.includes(s.id));

        // Map stored keys for easy lookup
        const keyMap = new Map();
        const metaMap = new Map();
        userSessions.rows.forEach((row) => {
            keyMap.set(row.session_id, row.api_key);
            metaMap.set(row.session_id, {
                engineType: row.engine_type || 'baileys',
                healthStatus: row.health_status || 'unknown',
                lastHeartbeatAt: row.last_heartbeat_at || null,
            });
        });

        // Merge active sessions with keys
        const merged = visibleActiveSessions.map(s => {
            let key = keyMap.get(s.id);
            const meta = metaMap.get(s.id) || { engineType: 'baileys', healthStatus: 'unknown', lastHeartbeatAt: null };
            return {
                ...s,
                apiKey: key || null,
                engineType: meta.engineType,
                healthStatus: meta.healthStatus,
                lastHeartbeatAt: meta.lastHeartbeatAt,
            };
        });

        // Also include stored sessions that might be disconnected but belong to user
        userSessionIds.forEach(id => {
            if (!visibleActiveSessions.find(s => s.id === id)) {
                merged.push({
                    id: id,
                    status: 'DISCONNECTED',
                    user: null,
                    apiKey: keyMap.get(id),
                    engineType: (metaMap.get(id)?.engineType || 'baileys'),
                    healthStatus: (metaMap.get(id)?.healthStatus || 'unknown'),
                    lastHeartbeatAt: (metaMap.get(id)?.lastHeartbeatAt || null),
                });
            }
        });

        res.json(merged);
    } catch (e) {
        console.error('SERVER ERROR in GET /sessions:', e);
        res.status(500).json({ error: e.message });
    }
});

// Delete a session
app.delete('/sessions/:sessionId', verifyJwt, async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.id;

    try {
        // Verify ownership
        const check = await db.default.query('SELECT * FROM whatsapp_sessions WHERE session_id = $1 AND user_id = $2', [sessionId, userId]);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized or session not found' });
        }

        const wa = await import('./whatsapp.js');
        const { deleteSessionKey } = await import('./services/apiKeys.js');

        await wa.deleteSession(sessionId);
        await deleteSessionKey(sessionId); // Clean up DB

        res.json({ message: `Session '${sessionId}' deleted successfully` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Engine config and health per session (JWT-protected)
app.use('/sessions', verifyJwt, sessionEngineRoutes);

// Create/Connect specific session
app.post('/whatsapp/connect', verifyJwt, async (req, res) => {
    const { sessionId, engineType } = req.body;
    const userId = req.user.id;

    try {
        const wa = await import('./whatsapp.js');
        const { createSessionKey } = await import('./services/apiKeys.js');
        const { setSessionEngineConfig, isAllowedEngine } = await import('./services/sessionEngine.js');

        const id = sessionId || 'default';

        // Register session in DB for this user
        // We create the key/entry implicitly here to establish ownership
        await createSessionKey(id, userId);

        if (engineType) {
            if (!isAllowedEngine(engineType)) {
                return res.status(400).json({ error: 'Invalid engineType. Allowed values: baileys, puppeteer' });
            }
            await setSessionEngineConfig({ sessionId: id, userId, engineType, engineConfig: {} });
        }

        if (wa.getConnectionStatus(id) === 'DISCONNECTED') {
            // Force a fresh QR by cleaning up potentially stale session data 
            // This is critical for users who are stuck in a "Connecting..." loop 
            // or have invalid credentials.
            await connectSession({ sessionId: id, userId, options: { deleteOld: true } });
            res.json({ message: `Connection process started for session '${id}' (Fresh Start)` });
        } else {
            res.status(400).json({ error: `Session '${id}' is already connected or connecting` });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Logout specific session
app.post('/whatsapp/logout', verifyJwt, async (req, res) => {
    const { sessionId } = req.body;
    const userId = req.user.id;

    try {
        // Verify ownership
        const check = await db.default.query('SELECT * FROM whatsapp_sessions WHERE session_id = $1 AND user_id = $2', [sessionId, userId]);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized or session not found' });
        }

        const wa = await import('./whatsapp.js');
        const { deleteSessionKey } = await import('./services/apiKeys.js');

        const id = sessionId || 'default';

        if (wa.getConnectionStatus(id) === 'CONNECTED') {
            await disconnectSession({ sessionId: id, userId });
            // Don't delete key on logout, only on delete? User might want to reconnect.
            // But previous logic deleted it. Let's keep it consistent with request: "logout".
            // Typically logout means disconnect. Delete means "forget".
            // I'll leave the key/DB entry so it shows as "DISCONNECTED" in the list.

            res.json({ message: `Session '${id}' disconnected successfully.` });
        } else {
            res.json({ message: `Session '${id}' is already disconnected` });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Message & Feature Routes (Protected by API Key) ---
// These are used by external systems or the Playground (which simulates external usage)

app.use('/messages', authenticate, messageRoutes);
app.use('/scheduler', authenticate, schedulerRoutes);
app.use('/templates', authenticate, templateRoutes);
app.use('/webhooks', authenticate, webhookRoutes);
app.use('/chats', authenticate, chatRoutes);

// --- FASE 3: Post-Request Audit Logging Middleware ---
// Must be placed after routes to capture response status and time
app.use(auditLogger);

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // Test DB connection
    try {
        const { rows } = await import('./db.js').then(m => m.default.query('SELECT NOW()'));
        console.log('Database connected:', rows[0].now);
    } catch (err) {
        console.error('Database connection failed:', err);
    }

    // Initialize all sessions
    // Note: This might resurrect sessions that don't belong to currently active users, logic in whatsapp.js handles files.
    import('./whatsapp.js').then(wa => wa.initSessions());

    // Initialize Scheduler
    initScheduler();
});

export { app };
