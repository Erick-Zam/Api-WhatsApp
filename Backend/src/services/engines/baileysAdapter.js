import { EngineAdapter } from './engineAdapter.js';
import * as wa from '../../whatsapp.js';

export class BaileysAdapter extends EngineAdapter {
    constructor() {
        super('baileys');
    }

    async connect(sessionId, options = {}) {
        return wa.connectToWhatsApp(sessionId, options);
    }

    async disconnect(sessionId) {
        return wa.disconnectFromWhatsApp(sessionId);
    }

    async sendText(sessionId, jid, text) {
        return wa.sendText(jid, text, sessionId);
    }

    async sendImage(sessionId, jid, imageUrl, caption = '') {
        return wa.sendImage(jid, imageUrl, caption, sessionId);
    }

    async sendVideo(sessionId, jid, videoUrl, caption = '', gifPlayback = false) {
        return wa.sendVideo(jid, videoUrl, caption, gifPlayback, sessionId);
    }

    async sendAudio(sessionId, jid, audioUrl, ptt = false) {
        return wa.sendAudio(jid, audioUrl, ptt, sessionId);
    }

    async sendDocument(sessionId, jid, docUrl, fileName, mimetype) {
        return wa.sendDocument(jid, docUrl, fileName, mimetype, sessionId);
    }

    async sendLocation(sessionId, jid, lat, long) {
        return wa.sendLocation(jid, lat, long, sessionId);
    }

    async sendContact(sessionId, jid, name, phone) {
        return wa.sendContact(jid, name, phone, sessionId);
    }

    async sendPoll(sessionId, jid, name, values, singleSelect = false) {
        return wa.sendPoll(jid, name, values, singleSelect, sessionId);
    }

    async updatePresence(sessionId, jid, type) {
        return wa.updatePresence(jid, type, sessionId);
    }

    async health(sessionId) {
        const status = wa.getConnectionStatus(sessionId);
        return {
            engineType: 'baileys',
            status,
            healthy: status === 'CONNECTED',
            timestamp: new Date().toISOString(),
        };
    }
}
