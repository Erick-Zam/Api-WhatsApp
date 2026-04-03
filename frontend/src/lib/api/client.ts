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

// Always route browser requests through Next.js rewrite/proxy.
// This avoids direct cross-domain calls that can miss internal paths in production.
export const apiBaseUrl = '/api';

export const getStoredToken = () => {
    if (typeof window === 'undefined') {
        return '';
    }
    return localStorage.getItem('token') || '';
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, token, headers = {}, signal } = options;

    const authToken = token !== undefined ? token : getStoredToken();
    const mergedHeaders: Record<string, string> = {
        ...headers,
    };

    if (body !== undefined && !mergedHeaders['Content-Type']) {
        mergedHeaders['Content-Type'] = 'application/json';
    }

    if (authToken) {
        mergedHeaders.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers: mergedHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();

    let data = {} as T & ApiErrorPayload;
    if (rawBody) {
        if (contentType.includes('application/json')) {
            try {
                data = (JSON.parse(rawBody) as T & ApiErrorPayload);
            } catch {
                data = { message: rawBody } as T & ApiErrorPayload;
            }
        } else {
            data = { message: rawBody } as T & ApiErrorPayload;
        }
    }

    if (!response.ok) {
        const message = data.error || data.message || `Request failed with status ${response.status}`;
        throw new ApiError(message, response.status);
    }

    return data;
}

export async function apiRequestNoAuth<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return apiRequest<T>(path, { ...options, token: '' });
}
