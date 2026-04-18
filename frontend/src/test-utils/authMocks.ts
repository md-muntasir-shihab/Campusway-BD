/**
 * Test utilities for mocking authentication state and operations
 * Used for unit tests and property-based tests
 */

import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

/**
 * Mock localStorage operations for testing
 */
export const createMockLocalStorage = () => {
    const store: Record<string, string> = {};

    return {
        getItem: (key: string): string | null => {
            return store[key] || null;
        },
        setItem: (key: string, value: string): void => {
            store[key] = value;
        },
        removeItem: (key: string): void => {
            delete store[key];
        },
        clear: (): void => {
            Object.keys(store).forEach(key => delete store[key]);
        },
        get length(): number {
            return Object.keys(store).length;
        },
        key: (index: number): string | null => {
            const keys = Object.keys(store);
            return keys[index] || null;
        },
        // Expose internal store for test assertions
        _getStore: () => ({ ...store }),
    };
};

/**
 * Generate a mock JWT token with configurable expiry
 * @param expiresInSeconds - Number of seconds until token expires (default: 900 = 15 minutes)
 * @param payload - Additional payload fields to include in the token
 * @returns A mock JWT token string
 */
export const generateMockJWT = (
    expiresInSeconds: number = 900,
    payload: Record<string, any> = {}
): string => {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + expiresInSeconds;

    const header = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const tokenPayload = {
        exp,
        iat: now,
        ...payload,
    };

    // Create base64url encoded strings (simplified for testing)
    const base64UrlEncode = (obj: any): string => {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(tokenPayload);
    const signature = 'mock-signature';

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
};

/**
 * Generate an expired mock JWT token
 * @param expiredBySeconds - Number of seconds the token has been expired (default: 60)
 * @param payload - Additional payload fields to include in the token
 * @returns An expired mock JWT token string
 */
export const generateExpiredMockJWT = (
    expiredBySeconds: number = 60,
    payload: Record<string, any> = {}
): string => {
    return generateMockJWT(-expiredBySeconds, payload);
};

/**
 * Generate a malformed JWT token for testing error handling
 * @param type - Type of malformation: 'missing-parts', 'invalid-json', 'invalid-base64'
 * @returns A malformed JWT token string
 */
export const generateMalformedJWT = (
    type: 'missing-parts' | 'invalid-json' | 'invalid-base64' = 'missing-parts'
): string => {
    switch (type) {
        case 'missing-parts':
            return 'header.payload'; // Missing signature
        case 'invalid-json':
            return 'aGVhZGVy.aW52YWxpZC1qc29u.signature'; // 'invalid-json' in base64
        case 'invalid-base64':
            return 'not-base64!@#.not-base64!@#.signature';
        default:
            return 'malformed';
    }
};

/**
 * Mock axios instance for testing with configurable interceptors
 */
export interface MockAxiosInstance {
    get: MockFn;
    post: MockFn;
    put: MockFn;
    delete: MockFn;
    patch: MockFn;
    request: MockFn;
    interceptors: {
        request: {
            use: MockFn;
            eject: MockFn;
            handlers: Array<{
                fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
                rejected: (error: unknown) => unknown;
            }>;
        };
        response: {
            use: MockFn;
            eject: MockFn;
            handlers: Array<{
                fulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
                rejected: (error: unknown) => unknown;
            }>;
        };
    };
}

/**
 * Create a mock axios instance with interceptor support
 * @returns A mock axios instance with jest mocks for all methods
 */
export const createMockAxiosInstance = (): MockAxiosInstance => {
    const requestHandlers: Array<{
        fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
        rejected: (error: unknown) => unknown;
    }> = [];

    const responseHandlers: Array<{
        fulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
        rejected: (error: unknown) => unknown;
    }> = [];

    const mockInstance: MockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
        request: vi.fn(),
        interceptors: {
            request: {
                use: vi.fn((
                    fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
                    rejected: (error: unknown) => unknown,
                ) => {
                    requestHandlers.push({ fulfilled, rejected });
                    return requestHandlers.length - 1;
                }),
                eject: vi.fn((id: number) => {
                    requestHandlers.splice(id, 1);
                }),
                handlers: requestHandlers,
            },
            response: {
                use: vi.fn((
                    fulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
                    rejected: (error: unknown) => unknown,
                ) => {
                    responseHandlers.push({ fulfilled, rejected });
                    return responseHandlers.length - 1;
                }),
                eject: vi.fn((id: number) => {
                    responseHandlers.splice(id, 1);
                }),
                handlers: responseHandlers,
            },
        },
    };

    return mockInstance;
};

/**
 * Create a mock axios response
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @param config - Request configuration
 * @returns A mock AxiosResponse object
 */
export const createMockAxiosResponse = <T = any>(
    data: T,
    status: number = 200,
    config: Partial<AxiosRequestConfig> = {}
): AxiosResponse<T> => {
    return {
        data,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: {},
        config: config as InternalAxiosRequestConfig,
    };
};

/**
 * Create a mock axios error
 * @param message - Error message
 * @param status - HTTP status code
 * @param data - Error response data
 * @returns A mock axios error object
 */
export const createMockAxiosError = (
    message: string,
    status: number,
    data: any = {}
) => {
    const error: any = new Error(message);
    error.isAxiosError = true;
    error.response = {
        data,
        status,
        statusText: 'Error',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
    };
    error.config = {} as InternalAxiosRequestConfig;
    return error;
};

/**
 * Mock user object for testing
 */
export const createMockUser = (overrides: Partial<any> = {}) => {
    return {
        _id: 'mock-user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
        fullName: 'Test User',
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        twoFactorMethod: null,
        passwordExpiresAt: null,
        permissions: {},
        permissionsV2: {},
        mustChangePassword: false,
        redirectTo: '/dashboard',
        profile_photo: '',
        profile_completion_percentage: 100,
        user_unique_id: 'TEST-001',
        subscription: {
            status: 'active',
            plan: 'basic',
        },
        student_meta: null,
        ...overrides,
    };
};
