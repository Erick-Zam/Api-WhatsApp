// Simulating a DB logger service

const formatMeta = (meta) => {
    if (!meta || typeof meta !== 'object') return '';
    try {
        return ` | meta=${JSON.stringify(meta)}`;
    } catch {
        return ' | meta=[unserializable]';
    }
};

const logger = {
    info: (message, meta = null) => console.log(`[INFO] ${message}${formatMeta(meta)}`),
    warn: (message, meta = null) => console.warn(`[WARN] ${message}${formatMeta(meta)}`),
    error: (message, meta = null) => console.error(`[ERROR] ${message}${formatMeta(meta)}`),
    debug: (message, meta = null) => console.debug(`[DEBUG] ${message}${formatMeta(meta)}`),
};

const logAudit = (userId, action, details, ip) => {
    console.log(`[AUDIT] User: ${userId} | Action: ${action} | IP: ${ip} | Details:`, details);
    // TODO: Insert into `audit_logs` table
};

const logError = (service, message, stack, context) => {
    console.error(`[ERROR] Service: ${service} | Message: ${message}`);
    // TODO: Insert into `error_logs` table
};

export { logger, logAudit, logError };
