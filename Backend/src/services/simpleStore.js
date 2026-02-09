import fs from 'fs';
import pino from 'pino';

// Simple In-Memory Store implementation for WhatsApp Multi-Device
export const makeInMemoryStore = ({ logger } = {}) => {
    logger = logger || pino({ level: 'silent' });

    // Internal state
    const chats = new Map(); // jid -> chat object with messages array
    const messages = {}; // jid -> { array: [] } - keeping baileys structure for compatibility
    const contacts = {}; // jid -> contact object

    const listeners = [];

    const bind = (ev) => {
        ev.on('connection.update', (update) => {
            Object.assign(connectionState, update);
        });

        ev.on('messaging-history.set', ({ chats: newChats, contacts: newContacts, messages: newMessages, isLatest }) => {
            if (isLatest) {
                chats.clear();
                for (const id in messages) delete messages[id];
                for (const id in contacts) delete contacts[id];
            }

            for (const c of newChats) {
                chats.set(c.id, c);
                if (!messages[c.id]) messages[c.id] = { array: [] };
            }

            for (const c of newContacts) {
                contacts[c.id] = Object.assign(contacts[c.id] || {}, c);
            }

            for (const msg of newMessages) {
                const jid = msg.key.remoteJid;
                if (!messages[jid]) messages[jid] = { array: [] };
                messages[jid].array.push(msg);
            }
        });

        ev.on('chats.upsert', (newChats) => {
            for (const c of newChats) {
                const existing = chats.get(c.id) || {};
                chats.set(c.id, Object.assign(existing, c));
                if (!messages[c.id]) messages[c.id] = { array: [] };
            }
        });

        ev.on('chats.update', (updates) => {
            for (const update of updates) {
                const existing = chats.get(update.id);
                if (existing) {
                    Object.assign(existing, update);
                }
            }
        });

        ev.on('contacts.upsert', (newContacts) => {
            for (const c of newContacts) {
                contacts[c.id] = Object.assign(contacts[c.id] || {}, c);
            }
        });

        ev.on('messages.upsert', ({ messages: newMessages, type }) => {
            if (type === 'append' || type === 'notify') {
                for (const msg of newMessages) {
                    const jid = msg.key.remoteJid;
                    if (!messages[jid]) messages[jid] = { array: [] };

                    // Check for duplicate?
                    const exists = messages[jid].array.find(m => m.key.id === msg.key.id);
                    if (!exists) {
                        messages[jid].array.push(msg);

                        // Update chat timestamp/snippet if needed?
                        const chat = chats.get(jid);
                        if (chat) {
                            chat.conversationTimestamp = msg.messageTimestamp;
                            chat.unreadCount = (chat.unreadCount || 0) + 1;
                        } else {
                            // ensure chat exists
                            chats.set(jid, { id: jid, conversationTimestamp: msg.messageTimestamp, unreadCount: 1 });
                        }
                    }
                }
            }
        });

        ev.on('messages.update', (updates) => {
            for (const { key, update } of updates) {
                const jid = key.remoteJid;
                if (messages[jid]) {
                    const msg = messages[jid].array.find(m => m.key.id === key.id);
                    if (msg) {
                        Object.assign(msg, update);
                    }
                }
            }
        });
    };

    const toJSON = () => {
        return {
            chats: Array.from(chats.values()),
            contacts,
            messages // array of objects not Map
        };
    };

    const fromJSON = (json) => {
        if (!json) return;
        if (json.chats) {
            json.chats.forEach(c => {
                chats.set(c.id, c);
                if (!messages[c.id]) messages[c.id] = { array: [] };
            });
        }
        if (json.contacts) {
            Object.assign(contacts, json.contacts);
        }
        if (json.messages) {
            for (const jid in json.messages) {
                messages[jid] = { array: json.messages[jid].array || [] };
            }
        }
    };

    const writeToFile = (path) => {
        try {
            fs.writeFileSync(path, JSON.stringify(toJSON(), null, 2));
        } catch (e) {
            logger.error({ err: e }, 'failed to write store to file');
        }
    };

    const readFromFile = (path) => {
        try {
            if (fs.existsSync(path)) {
                const data = fs.readFileSync(path, { encoding: 'utf-8' });
                fromJSON(JSON.parse(data));
            }
        } catch (e) {
            logger.error({ err: e }, 'failed to read store from file');
        }
    };

    return {
        bind,
        writeToFile,
        readFromFile,
        chats: {
            all: () => Array.from(chats.values()),
            get: (jid) => chats.get(jid)
        },
        contacts,
        messages,
        loadMessage: async (jid, id) => {
            const list = messages[jid]?.array;
            return list?.find(m => m.key.id === id);
        }
    };
};

// Needed placeholder
const connectionState = {};
