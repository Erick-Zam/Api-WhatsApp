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

// List all active sessions
app.get('/sessions', async (req, res) => {
    const wa = await import('./whatsapp.js');
    res.json(wa.listSessions());
});

// Create/Connect specific session
app.post('/whatsapp/connect', async (req, res) => {
    const { sessionId } = req.body;
    try {
        const wa = await import('./whatsapp.js');
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
        const id = sessionId || 'default';

        if (wa.getConnectionStatus(id) === 'CONNECTED') {
            await wa.disconnectFromWhatsApp(id);
            res.json({ message: `Session '${id}' disconnected successfully` });
        } else {
            await wa.disconnectFromWhatsApp(id); // Force cleanup even if disconnected
            res.json({ message: `Session '${id}' disconnected/cleaned up` });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Protected Routes (Require x-api-key) ---
app.use('/messages', authenticate, messageRoutes);

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
});

export { app };
