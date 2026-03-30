/**
 * Backend Environment Configuration
 * Validates and exports all environment variables
 * 
 * This module ensures all required variables are set with proper types
 * and throws errors during startup if validation fails
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load .env.local or .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Define validation schema with Zod
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Server config
  BACKEND_PORT: z.coerce.number().min(1).max(65535).default(3001),
  BACKEND_HOST: z.string().default('0.0.0.0'),
  BACKEND_URL: z.string().url().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL format').startsWith('postgres://'),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(8, 'POSTGRES_PASSWORD must be at least 8 characters'),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().default('db'),
  POSTGRES_PORT: z.coerce.number().default(5432),

  // Frontend
  FRONTEND_PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().default('/api'),
  BACKEND_INTERNAL_URL: z.string().url().default('http://backend:3001'),

  // JWT
  JWT_SECRET: z.string()
    .min(64, 'JWT_SECRET must be at least 64 characters (32 bytes hex). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'),
  JWT_EXPIRY: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string()
    .min(64, 'JWT_REFRESH_SECRET must be different and 64+ characters'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // Rate limiting
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(3000),
  API_RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(3600000), // 1 hour
  API_RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().default(10),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  CORS_METHODS: z.string().default('GET,POST,PUT,PATCH,DELETE,OPTIONS'),
  CORS_ALLOWED_HEADERS: z.string().default('Content-Type,Authorization,X-API-Key'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  PINO_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Encryption
  ENCRYPTION_KEY: z.string()
    .min(64, 'ENCRYPTION_KEY must be 64+ characters. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'),
  BACKUP_ENCRYPTION_KEY: z.string()
    .min(64, 'BACKUP_ENCRYPTION_KEY must be 64+ characters and different from ENCRYPTION_KEY'),
  SESSION_ENCRYPTION_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),

  // WhatsApp / Baileys
  BAILEYS_DEBUG: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  BAILEYS_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('error'),
  WHATSAPP_MESSAGE_RATE_LIMIT: z.coerce.number().default(10),
  WHATSAPP_RETRY_MAX_ATTEMPTS: z.coerce.number().default(5),
  WHATSAPP_SESSION_IDLE_TIMEOUT: z.coerce.number().default(3600),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM_EMAIL: z.string().email(),
  SMTP_FROM_NAME: z.string().default('WhatsApp API SaaS'),
  SMTP_TLS_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  MOCK_EMAIL_SENDING: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),

  // OAuth
  GOOGLE_OAUTH_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  GITHUB_OAUTH_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),

  MICROSOFT_OAUTH_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CALLBACK_URL: z.string().url().optional(),

  // MFA
  MFA_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  TOTP_ISSUER: z.string().default('WhatsApp API SaaS'),
  TOTP_WINDOW: z.coerce.number().default(1),

  // Audit & Compliance
  AUDIT_LOG_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  AUDIT_LOG_SENSITIVE_ACTIONS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  GDPR_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  DATA_RETENTION_DAYS: z.coerce.number().default(365),
  AUTO_DELETE_AUDIT_LOGS_DAYS: z.coerce.number().default(2555), // 7 years

  // Backups
  BACKUP_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  BACKUP_SCHEDULE_CRON: z.string().default('0 2 * * *'), // 2 AM daily
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),
  BACKUP_COMPRESS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  BACKUP_UPLOAD_S3: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),

  // Optional S3
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Monitoring
  SENTRY_ENABLED: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  SENTRY_DSN: z.string().url().optional(),

  // Feature flags
  FEATURE_MFA: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  FEATURE_OAUTH: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  FEATURE_WEBHOOKS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  FEATURE_SCHEDULER: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  FEATURE_TEMPLATES: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),
  FEATURE_AUDIT_LOGS: z.enum(['true', 'false']).transform(v => v === 'true').default('true'),

  // Dokploy
  COMPOSE_PROJECT_NAME: z.string().default('whatsapp-api-ws'),

  // Development
  DEBUG: z.string().optional(),
  SEED_DATABASE: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
});

// Parse and validate
let config;
try {
  config = envSchema.parse(process.env);
} catch (error) {
  const formatted = error.errors.map((err) => {
    const path = err.path.join('.');
    return `  ❌ ${path}: ${err.message}`;
  }).join('\n');

  console.error(`\n❌ Invalid Environment Configuration:\n${formatted}\n`);
  console.error(`📖 See docs/ENV_SETUP.md for help configuring variables.\n`);
  
  process.exit(1);
}

// Additional validation: JWT and Encryption keys should be different
if (config.JWT_SECRET === config.JWT_REFRESH_SECRET) {
  console.error('\n❌ JWT_SECRET and JWT_REFRESH_SECRET must be different!\n');
  process.exit(1);
}

if (config.ENCRYPTION_KEY === config.BACKUP_ENCRYPTION_KEY) {
  console.error('\n❌ ENCRYPTION_KEY and BACKUP_ENCRYPTION_KEY must be different!\n');
  process.exit(1);
}

// Validate OAuth secrets if enabled
if (config.GOOGLE_OAUTH_ENABLED && (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET)) {
  console.warn('\n⚠️  Google OAuth enabled but credentials missing (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)\n');
}

if (config.GITHUB_OAUTH_ENABLED && (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET)) {
  console.warn('\n⚠️  GitHub OAuth enabled but credentials missing (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)\n');
}

if (config.MICROSOFT_OAUTH_ENABLED && (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET)) {
  console.warn('\n⚠️  Microsoft OAuth enabled but credentials missing (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET)\n');
}

// Validate Sentry
if (config.SENTRY_ENABLED && !config.SENTRY_DSN) {
  console.warn('\n⚠️  Sentry enabled but DSN not configured (SENTRY_DSN)\n');
}

// Log startup info (never log secrets!)
if (config.NODE_ENV !== 'production') {
  console.log(`\n✅ Environment Configuration Loaded`);
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   Backend: ${config.BACKEND_HOST}:${config.BACKEND_PORT}`);
  console.log(`   Database: ${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`);
  console.log(`   OAuth: Google=${config.GOOGLE_OAUTH_ENABLED}, GitHub=${config.GITHUB_OAUTH_ENABLED}, Microsoft=${config.MICROSOFT_OAUTH_ENABLED}`);
  console.log(`   Audit: ${config.AUDIT_LOG_ENABLED ? 'enabled' : 'disabled'}`);
  console.log(`   Backups: ${config.BACKUP_ENABLED ? 'enabled' : 'disabled'}`);
  console.log(`\n`);
}

export default config;
