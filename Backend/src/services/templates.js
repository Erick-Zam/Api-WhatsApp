import * as db from '../db.js';
import { sendText } from '../whatsapp.js';
import { logError } from './logger.js';

export const createTemplate = async (name, content, category = 'general') => {
    try {
        const result = await db.query(
            `INSERT INTO message_templates (name, content, category) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (name) DO UPDATE SET content = EXCLUDED.content 
             RETURNING *`,
            [name, content, category]
        );
        return result.rows[0];
    } catch (e) {
        throw new Error('Database error creating template: ' + e.message);
    }
};

export const getTemplate = async (name) => {
    const result = await db.query('SELECT * FROM message_templates WHERE name = $1', [name]);
    return result.rows[0];
};

export const listTemplates = async () => {
    const result = await db.query('SELECT * FROM message_templates ORDER BY created_at DESC');
    return result.rows;
};

export const deleteTemplate = async (name) => {
    await db.query('DELETE FROM message_templates WHERE name = $1', [name]);
};

// Replaces {{key}} with value from data object
// Example: "Hello {{name}}" + { name: "Erick" } -> "Hello Erick"
export const parseTemplate = (content, data) => {
    if (!data) return content;
    return content.replace(/{{(\w+)}}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });
};

export const sendTemplateMessage = async (sessionId, phone, templateName, data) => {
    const template = await getTemplate(templateName);
    if (!template) {
        throw new Error(`Template '${templateName}' not found.`);
    }

    const finalMessage = parseTemplate(template.content, data);

    // Use the existing sendText function
    // Assuming sessionId is valid and connected
    return await sendText(sessionId, phone, finalMessage);
};
