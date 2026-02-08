import express from 'express';
import cors from 'cors';
import { connectToWhatsApp } from './whatsapp.js';
import messageRoutes from './routes/messages.js';
import authRoutes from './routes/auth.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Public Routes ---

app.get('/', (req, res) => {
    res.send('WhatsApp API Backend SaaS is running!');
});

// Auth Routes (Login/Register)
app.use('/auth', authRoutes);

// --- Session Management Routes ---

// Get QR / Status for a specific session
app.get('/qr', (req, res) => {
    const { sessionId } = req.query; // e.g. ?sessionId=marketing
    import('./whatsapp.js').then(wa => {
        const id = sessionId || 'default';
        const qr = wa.getQRCode(id);
        const status = wa.getConnectionStatus(id);
        const user = wa.getConnectedUser(id);
        res.json({ qr, status, user, sessionId: id });
    });
});

// List all active sessions with keys
app.get('/sessions', async (req, res) => {
    try {
        const wa = await import('./whatsapp.js');
        const { listAllSessionKeys, createSessionKey } = await import('./services/apiKeys.js');

        const activeSessions = wa.listSessions();
        const storedKeys = await listAllSessionKeys();

        // Map stored keys for easy lookup
        const keyMap = new Map();
        storedKeys.forEach(k => keyMap.set(k.session_id, k.api_key));

        // Merge active sessions with keys
        const merged = await Promise.all(activeSessions.map(async s => {
            let key = keyMap.get(s.id);
            // DO NOT create key here. Only return if exists.
            return { ...s, apiKey: key || null };
        }));

        // Also include stored sessions that might be disconnected but have keys
        storedKeys.forEach(k => {
            if (!activeSessions.find(s => s.id === k.session_id)) {
                merged.push({
                    id: k.session_id,
                    status: 'DISCONNECTED',
                    user: null, // Not connected, so no user info
                    apiKey: k.api_key
                });
            }
        });

        // Deduplicate by ID
        const finalMap = new Map();
        merged.forEach(s => finalMap.set(s.id, s));

        res.json(Array.from(finalMap.values()));
    } catch (e) {
        console.error('SERVER ERROR in GET /sessions:', e);
        res.status(500).json({ error: e.message });
    }
});

// Delete a session
app.delete('/sessions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const wa = await import('./whatsapp.js');
        const { deleteSessionKey } = await import('./services/apiKeys.js');

        await wa.deleteSession(sessionId);
        await deleteSessionKey(sessionId); // Clean up DB

        res.json({ message: `Session '${sessionId}' deleted successfully` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create/Connect specific session
app.post('/whatsapp/connect', async (req, res) => {
    const { sessionId } = req.body;
    try {
        const wa = await import('./whatsapp.js');
        // Removed explicit apiKey creation here. It will happen on 'open' event in whatsapp.js

        const id = sessionId || 'default';

        if (wa.getConnectionStatus(id) === 'DISCONNECTED') {
            wa.connectToWhatsApp(id);
            res.json({ message: `Connection process started for session '${id}'` });
        } else {
            res.status(400).json({ error: `Session '${id}' is already connected or connecting` });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Logout specific session
app.post('/whatsapp/logout', async (req, res) => {
    const { sessionId } = req.body;
    try {
        const wa = await import('./whatsapp.js');
        const { deleteSessionKey } = await import('./services/apiKeys.js');

        const id = sessionId || 'default';

        if (wa.getConnectionStatus(id) === 'CONNECTED') {
            await wa.disconnectFromWhatsApp(id);
            await deleteSessionKey(id); // Clean up DB on logout as requested
            res.json({ message: `Session '${id}' disconnected successfully and data cleared.` });
        } else {
            await wa.disconnectFromWhatsApp(id); // Force cleanup even if disconnected
            await deleteSessionKey(id); // Clean up DB
            res.json({ message: `Session '${id}' disconnected/cleaned up` });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


import schedulerRoutes from './routes/scheduler.js';
import templateRoutes from './routes/templates.js';
import webhookRoutes from './routes/webhooks.js';
import { initScheduler } from './services/scheduler.js';

// ... other imports

// --- Protected Routes (Require x-api-key) ---
app.use('/messages', authenticate, messageRoutes);
app.use('/scheduler', schedulerRoutes);
app.use('/templates', templateRoutes);
app.use('/webhooks', webhookRoutes);

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
    import('./whatsapp.js').then(wa => wa.initSessions());

    // Initialize Scheduler
    initScheduler();
});

export { app };
