import rateLimit from 'express-rate-limit';

export const adminSensitiveActionLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many admin sensitive operations. Please retry in a few minutes.',
    },
});
