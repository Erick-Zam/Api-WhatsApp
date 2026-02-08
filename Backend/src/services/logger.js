// Simulating a DB logger service

const logAudit = (userId, action, details, ip) => {
    console.log(`[AUDIT] User: ${userId} | Action: ${action} | IP: ${ip} | Details:`, details);
    // TODO: Insert into `audit_logs` table
};

const logError = (service, message, stack, context) => {
    console.error(`[ERROR] Service: ${service} | Message: ${message}`);
    // TODO: Insert into `error_logs` table
};

export { logAudit, logError };
