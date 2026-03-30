/**
 * Shared Constants
 */

// ============= HTTP Status Codes =============
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============= API Routes =============
export const API_ROUTES = {
  AUTH: '/auth',
  USERS: '/users',
  SESSIONS: '/sessions',
  MESSAGES: '/messages',
  CHATS: '/chats',
  CONTACTS: '/contacts',
  TEMPLATES: '/templates',
  WEBHOOKS: '/webhooks',
  SCHEDULER: '/scheduler',
  ADMIN: '/admin',
  PLAYGROUND: '/playground',
} as const;

// ============= Message Types =============
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  POLL: 'poll',
  LOCATION: 'location',
  CONTACT: 'contact',
  REACTION: 'reaction',
} as const;

// ============= Session Status =============
export const SESSION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error',
} as const;

// ============= User Roles =============
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

// ============= Time Constants =============
export const TIME_CONSTANTS = {
  JWT_EXPIRY_DEFAULT: '7d',
  JWT_REFRESH_EXPIRY_DEFAULT: '30d',
  SESSION_TIMEOUT_MS: 3600000, // 1 hour
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  BACKUP_RETENTION_DAYS: 30,
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
} as const;

// ============= Error Codes =============
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',

  // Authorization
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // WhatsApp
  SESSION_NOT_CONNECTED: 'SESSION_NOT_CONNECTED',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

// ============= Webhook Events =============
export const WEBHOOK_EVENTS = {
  MESSAGE_INCOMING: 'message.incoming',
  MESSAGE_OUTGOING: 'message.outgoing',
  MESSAGE_FAILED: 'message.failed',
  SESSION_CONNECTED: 'session.connected',
  SESSION_DISCONNECTED: 'session.disconnected',
  SESSION_ERROR: 'session.error',
  CONTACT_UPDATED: 'contact.updated',
  GROUP_UPDATED: 'group.updated',
} as const;

// ============= Audit Actions =============
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_ACCESSED: 'RESOURCE_ACCESSED',
  CONFIGURATION_CHANGED: 'CONFIGURATION_CHANGED',
  SETTING_UPDATED: 'SETTING_UPDATED',
} as const;

// ============= Feature Flags =============
export const FEATURES = {
  MFA: 'FEATURE_MFA',
  OAUTH: 'FEATURE_OAUTH',
  WEBHOOKS: 'FEATURE_WEBHOOKS',
  SCHEDULER: 'FEATURE_SCHEDULER',
  TEMPLATES: 'FEATURE_TEMPLATES',
  AUDIT_LOGS: 'FEATURE_AUDIT_LOGS',
} as const;

// ============= OAuth Providers =============
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  MICROSOFT: 'microsoft',
} as const;
