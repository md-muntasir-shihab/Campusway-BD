/**
 * CampusWay QA Audit — Runtime Gate E2E Tests
 *
 * টেস্ট শুরুর আগে সমস্ত runtime dependency (Frontend, Backend, MongoDB)
 * যাচাই করে। Playwright E2E test হিসেবে runtime gate validation চালায়।
 *
 * Requirements: 1.1, 1.2, 1.3, 1.7
 */

import { test, expect } from '@playwright/test';
import {
    checkFrontend,
    checkBackend,
    checkMongoDB,
    runRuntimeGate,
} from '../qa/runtime-gate';

const FRONTEND_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const BACKEND_URL = process.env.E2E_API_URL || 'http://127.0.0.1:5003';

test.describe('Runtime Gate — Dependency Health Checks', () => {
    /**
     * Req 1.1: Frontend dev server `http://127.0.0.1:5175`-এ HTTP 200 response
     */
    test('Frontend dev server is reachable (HTTP 200)', async () => {
        const result = await checkFrontend(FRONTEND_URL);

        expect(result.reachable).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.url).toBe(FRONTEND_URL);
        expect(result.error).toBeUndefined();
    });

    /**
     * Req 1.2: Backend API `http://127.0.0.1:5003/api/auth/me`-এ HTTP response (401 বা 200)
     */
    test('Backend API is reachable (HTTP 401 or 200)', async () => {
        const result = await checkBackend(BACKEND_URL);

        expect(result.reachable).toBe(true);
        expect([200, 401]).toContain(result.statusCode);
        expect(result.url).toBe(`${BACKEND_URL}/api/auth/me`);
        expect(result.error).toBeUndefined();
    });

    /**
     * Req 1.3: MongoDB `mongodb://localhost:27017`-এ সংযোগযোগ্য (TCP check)
     */
    test('MongoDB is reachable (TCP connection to port 27017)', async () => {
        const result = await checkMongoDB();

        expect(result.reachable).toBe(true);
        expect(result.error).toBeUndefined();
    });

    /**
     * Req 1.7: সমস্ত gate পাস → "Runtime Gate: PASS" status, পরবর্তী phase-এ অগ্রসর
     */
    test('Full runtime gate passes when all services are up', async () => {
        const gate = await runRuntimeGate();

        expect(gate.passed).toBe(true);
        expect(gate.errors).toHaveLength(0);

        // Frontend check
        expect(gate.frontend.reachable).toBe(true);
        expect(gate.frontend.statusCode).toBe(200);

        // Backend check
        expect(gate.backend.reachable).toBe(true);
        expect([200, 401]).toContain(gate.backend.statusCode);

        // MongoDB check
        expect(gate.mongodb.reachable).toBe(true);
    });
});
