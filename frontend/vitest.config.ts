import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test-utils/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        // The qa-properties suites import helpers from frontend/qa/ which is
        // gitignored (**/qa/ in the root .gitignore) and therefore missing from
        // checkouts. They can never resolve their imports, so exclude them.
        exclude: [
            ...configDefaults.exclude,
            'src/__tests__/qa-properties/**',
            'src/__tests__/qa-audit-bug-conditions.test.ts',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test-utils/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
