/**
 * Shared Utilities
 */

import { APIResponse } from '../types';

// ============= Response Formatting =============

export function success<T>(
  data: T,
  requestId?: string
): APIResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    request_id: requestId,
  };
}

export function error(
  code: string,
  message: string,
  _statusCode: number = 400,
  details?: any,
  requestId?: string
): APIResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    request_id: requestId,
  };
}

// ============= String Utilities =============

export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function truncateString(str: string, maxLength: number = 100): string {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

// ============= Email Utilities =============

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// ============= Phone Number Utilities =============

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneNumber(phone);
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// ============= Date Utilities =============

export function formatDate(date: Date | string, format: string = 'ISO'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'ISO') {
    return d.toISOString();
  }
  
  if (format === 'SHORT') {
    return d.toLocaleDateString();
  }
  
  if (format === 'LONG') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  return d.toISOString();
}

export function getTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function getTimestampMillis(): number {
  return Date.now();
}

// ============= Array Utilities =============

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function flatten<T>(arr: T[][]): T[] {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

// ============= Object Utilities =============

export function pickKeys<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
}

export function omitKeys<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (!keys.includes(key as K)) {
      acc[key as Exclude<keyof T, K>] = value;
    }
    return acc;
  }, {} as Omit<T, K>);
}

export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

// ============= Retry Logic =============

export async function retry<TResult>(
  fn: () => Promise<TResult>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<TResult> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ============= Validation Helpers =============

export function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export function assertType<_T>(value: any, type: string, message?: string): asserts value {
  if (typeof value !== type) {
    throw new Error(message || `Expected ${type} but got ${typeof value}`);
  }
}

export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}
