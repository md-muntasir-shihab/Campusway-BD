import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ResponseBuilder } from '../utils/responseBuilder';

/**
 * Feature: exam-management-system
 * Property 23: API Envelope Format Consistency
 *
 * **Validates: Requirements 17.4**
 *
 * For any API endpoint in the exam system, the response body should contain
 * the fields success (boolean), data (object or array), and message (string),
 * with an optional pagination object for list endpoints.
 *
 * We test the ResponseBuilder utility directly since all controllers use it
 * to build API responses. If the builder always produces the correct envelope,
 * then all API responses will be consistent.
 */

// ─── Arbitrary generators ────────────────────────────────────────────────────

/** Generate arbitrary JSON-safe data payloads */
const arbJsonData = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))),
    fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { maxLength: 10 }),
);

/** Generate arbitrary non-empty message strings */
const arbMessage = fc.string({ minLength: 1, maxLength: 200 });

/** Generate arbitrary error codes (uppercase snake_case style) */
const arbErrorCode = fc.stringMatching(/^[A-Z][A-Z0-9_]{1,30}$/);

/** Generate arbitrary pagination parameters */
const arbPage = fc.integer({ min: 1, max: 1000 });
const arbLimit = fc.integer({ min: 1, max: 100 });
const arbTotal = fc.integer({ min: 0, max: 100000 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 23: API Envelope Format Consistency', () => {
    it('ResponseBuilder.success always produces { success: true, data } with optional message', () => {
        fc.assert(
            fc.property(
                arbJsonData,
                fc.option(arbMessage, { nil: undefined }),
                (data, message) => {
                    const result = ResponseBuilder.success(data, message);

                    // success must be a boolean and true
                    expect(typeof result.success).toBe('boolean');
                    expect(result.success).toBe(true);

                    // data must be present (can be any value including null)
                    expect(result).toHaveProperty('data');
                    expect(result.data).toEqual(data);

                    // message: present as string when provided, absent when not
                    if (message !== undefined) {
                        expect(typeof result.message).toBe('string');
                        expect(result.message).toBe(message);
                    } else {
                        expect(result.message).toBeUndefined();
                    }

                    // error should not be present on success responses
                    expect(result.error).toBeUndefined();
                },
            ),
            { numRuns: 200 },
        );
    });

    it('ResponseBuilder.created always produces { success: true, data } with optional message', () => {
        fc.assert(
            fc.property(
                arbJsonData,
                fc.option(arbMessage, { nil: undefined }),
                (data, message) => {
                    const result = ResponseBuilder.created(data, message);

                    expect(typeof result.success).toBe('boolean');
                    expect(result.success).toBe(true);

                    expect(result).toHaveProperty('data');
                    expect(result.data).toEqual(data);

                    if (message !== undefined) {
                        expect(typeof result.message).toBe('string');
                        expect(result.message).toBe(message);
                    } else {
                        expect(result.message).toBeUndefined();
                    }

                    expect(result.error).toBeUndefined();
                },
            ),
            { numRuns: 200 },
        );
    });

    it('ResponseBuilder.paginated always produces { success: true, data: array, meta: { page, limit, total } }', () => {
        fc.assert(
            fc.property(
                fc.array(arbJsonData, { maxLength: 50 }),
                arbPage,
                arbLimit,
                arbTotal,
                (data, page, limit, total) => {
                    const result = ResponseBuilder.paginated(data, page, limit, total);

                    // success must be boolean true
                    expect(typeof result.success).toBe('boolean');
                    expect(result.success).toBe(true);

                    // data must be the array we passed in
                    expect(result).toHaveProperty('data');
                    expect(Array.isArray(result.data)).toBe(true);
                    expect(result.data).toEqual(data);

                    // meta (pagination) must be present with page, limit, total
                    expect(result.meta).toBeDefined();
                    expect(typeof result.meta!.page).toBe('number');
                    expect(typeof result.meta!.limit).toBe('number');
                    expect(typeof result.meta!.total).toBe('number');
                    expect(result.meta!.page).toBe(page);
                    expect(result.meta!.limit).toBe(limit);
                    expect(result.meta!.total).toBe(total);

                    // error should not be present on paginated responses
                    expect(result.error).toBeUndefined();
                },
            ),
            { numRuns: 200 },
        );
    });

    it('ResponseBuilder.error always produces { success: false, message, error: { code } } with optional details', () => {
        fc.assert(
            fc.property(
                arbErrorCode,
                arbMessage,
                fc.option(arbJsonData, { nil: undefined }),
                (code, message, details) => {
                    const result = ResponseBuilder.error(code, message, details);

                    // success must be boolean false
                    expect(typeof result.success).toBe('boolean');
                    expect(result.success).toBe(false);

                    // message must be a string
                    expect(typeof result.message).toBe('string');
                    expect(result.message).toBe(message);

                    // error must be present with code field
                    expect(result.error).toBeDefined();
                    expect(typeof result.error!.code).toBe('string');
                    expect(result.error!.code).toBe(code);

                    // details: present when provided, absent when not
                    if (details !== undefined) {
                        expect(result.error!.details).toEqual(details);
                    } else {
                        expect(result.error!.details).toBeUndefined();
                    }
                },
            ),
            { numRuns: 200 },
        );
    });

    it('all ResponseBuilder methods produce objects where success is always a boolean', () => {
        fc.assert(
            fc.property(
                arbJsonData,
                fc.option(arbMessage, { nil: undefined }),
                arbErrorCode,
                arbMessage,
                fc.array(arbJsonData, { maxLength: 10 }),
                arbPage,
                arbLimit,
                arbTotal,
                (data, optMsg, errCode, errMsg, arrData, page, limit, total) => {
                    const successResult = ResponseBuilder.success(data, optMsg);
                    const createdResult = ResponseBuilder.created(data, optMsg);
                    const paginatedResult = ResponseBuilder.paginated(arrData, page, limit, total);
                    const errorResult = ResponseBuilder.error(errCode, errMsg);

                    // Every response has success as a boolean
                    for (const result of [successResult, createdResult, paginatedResult, errorResult]) {
                        expect(typeof result.success).toBe('boolean');
                    }

                    // Success/created/paginated are true, error is false
                    expect(successResult.success).toBe(true);
                    expect(createdResult.success).toBe(true);
                    expect(paginatedResult.success).toBe(true);
                    expect(errorResult.success).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });
});
