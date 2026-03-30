/**
 * Zod Schemas for Request/Response Validation
 */

import { z } from 'zod';

type AnyObject = Record<string, any>;

// ============= Auth Schemas =============

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RegisterSchema = LoginSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  full_name: z.string().optional(),
  terms_accepted: z.boolean().refine((v: boolean) => v === true, 'Must accept terms'),
});

export const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  provider: z.enum(['google', 'github', 'microsoft']),
});

export const MFASetupSchema = z.object({
  secret: z.string(),
});

export const MFAVerifySchema = z.object({
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export const ChangePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d: AnyObject) => d.new_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// ============= Message Schemas =============

export const SendTextMessageSchema = z.object({
  session_id: z.string().uuid(),
  remote_jid: z.string(),
  message: z.string().min(1, 'Message cannot be empty').max(4096),
});

export const SendMediaMessageSchema = z.object({
  session_id: z.string().uuid(),
  remote_jid: z.string(),
  media_url: z.string().url(),
  media_type: z.enum(['image', 'video', 'audio', 'document']),
  caption: z.string().optional(),
});

// ============= Session Schemas =============

export const CreateSessionSchema = z.object({
  session_name: z.string().min(1, 'Session name required'),
  phone_number: z.string().optional(),
});

export const UpdateSessionSchema = CreateSessionSchema.partial();

// ============= Webhook Schemas =============

export const CreateWebhookSchema = z.object({
  session_id: z.string().uuid(),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum([
    'message.incoming',
    'message.outgoing',
    'message.failed',
    'session.connected',
    'session.disconnected',
    'session.error',
    'contact.updated',
    'group.updated',
  ] as const)).min(1, 'At least one event required'),
  enabled: z.boolean().default(true),
});

// ============= Template Schemas =============

export const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name required'),
  category: z.enum(['greeting', 'support', 'notification', 'custom']),
  content: z.object({
    text: z.string().min(1, 'Template content required'),
    variables: z.array(z.string()).optional(),
  }),
});

// ============= Pagination Schemas =============

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().optional(),
}).refine((d: AnyObject) => !(d.offset !== undefined && d.page !== undefined), {
  message: "Cannot specify both page and offset",
});

// ============= Utility Schemas =============

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const PhoneNumberSchema = z.string().regex(
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
  'Invalid phone number format'
);

export const EmailSchema = z.string().email('Invalid email address');

export const StrongPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)');

// Export types inferred from schemas
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type SendTextMessageInput = z.infer<typeof SendTextMessageSchema>;
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
