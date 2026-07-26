import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'uuid': path.resolve(__dirname, './tests/mocks/uuid.ts'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
        setupFiles: ['./vitest.setup.ts'],
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
        clearMocks: true,
    },
});
