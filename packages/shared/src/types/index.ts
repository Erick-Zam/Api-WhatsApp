/**
 * Shared Types for WhatsApp API SaaS
 * Used across Backend and Frontend
 */

// ============= User & Authentication =============

export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface OAuthAccount {
  provider: 'google' | 'github' | 'microsoft';
  profile_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

// ============= WhatsApp Session =============

export type SessionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface WhatsAppSession {
  id: string;
  user_id: string;
  session_name: string;
  phone_number?: string;
  status: SessionStatus;
  qr_code?: string;
  api_key: string;
  created_at: string;
  last_activity?: string;
  error_message?: string;
}

// ============= Messages =============

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'poll' | 'location' | 'contact' | 'reaction';

export interface TextMessage {
  type: 'text';
  body: string;
  links?: Array<{ url: string; title?: string }>;
}

export interface MediaMessage {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  caption?: string;
  mimetype?: string;
}

export interface Message {
  id: string;
  session_id: string;
  remote_jid: string;
  direction: 'inbound' | 'outbound';
  type: MessageType;
  content: TextMessage | MediaMessage;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

// ============= API Response =============

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  request_id?: string;
}

// ============= Pagination =============

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============= Audit & Logging =============

export type AuditActionType = 
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'PERMISSION_DENIED' | 'RESOURCE_ACCESSED'
  | 'CONFIGURATION_CHANGED' | 'SETTING_UPDATED';

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditActionType;
  entity_type: string;
  entity_id: string;
  old_value?: any;
  new_value?: any;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  session_id?: string;
}

// ============= Webhook =============

export type WebhookEventType =
  | 'message.incoming'
  | 'message.outgoing'
  | 'message.failed'
  | 'session.connected'
  | 'session.disconnected'
  | 'session.error'
  | 'contact.updated'
  | 'group.updated';

export interface Webhook {
  id: string;
  session_id: string;
  url: string;
  events: WebhookEventType[];
  enabled: boolean;
  retry_policy?: {
    max_retries: number;
    retry_delay_ms: number;
  };
  headers?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ============= Template =============

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  category: 'greeting' | 'support' | 'notification' | 'custom';
  content: {
    text: string;
    variables?: string[];
  };
  created_at: string;
  updated_at: string;
}

// ============= Error Handling =============

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}
