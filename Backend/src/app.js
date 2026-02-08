import express from 'express';
import cors from 'cors';
import { connectToWhatsApp, getQRCode } from './whatsapp.js';
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

// QR Code endpoint (Ideally protected in SaaS, but public for demo simplicity)
app.get('/qr', (req, res) => {
    const qr = getQRCode();
    res.json({ qr });
});

// --- Protected Routes (Require x-api-key) ---
app.use('/messages', authenticate, messageRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectToWhatsApp();
});

export { app };
