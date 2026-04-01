type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
    method?: HttpMethod;
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export interface ApiErrorPayload {
    error?: string;
    message?: string;
}

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

export const getStoredToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }
    return localStorage.getItem('token') || '';
};

const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, token, headers = {}, signal } = options;

    const authToken = token !== undefined ? token : getStoredToken();
    const mergedHeaders: Record<string, string> = {
        ...defaultHeaders,
        ...headers,
    };

    if (authToken) {
        mergedHeaders.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers: mergedHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
    });

    const data = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;

    if (!response.ok) {
        const message = data.error || data.message || `Request failed with status ${response.status}`;
        throw new ApiError(message, response.status);
    }

    return data;
}

export async function apiRequestNoAuth<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return apiRequest<T>(path, { ...options, token: '' });
}
