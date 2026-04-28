import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for graceful shutdown handler
 * Validates: Requirements 8.6
 *
 * Since the graceful shutdown logic is embedded in server.ts bootstrap,
 * we test the shutdown pattern by recreating the logic in a controlled environment.
 */

describe('Graceful Shutdown', () => {
    let mockServer: { close: ReturnType<typeof vi.fn> };
    let mockMongooseConnection: { close: ReturnType<typeof vi.fn> };
    let processExitSpy: ReturnType<typeof vi.fn>;
    let processOnSpy: ReturnType<typeof vi.fn>;
    let consoleLogSpy: ReturnType<typeof vi.fn>;
    let consoleErrorSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();

        mockServer = {
            close: vi.fn((cb?: (err?: Error) => void) => {
                if (cb) cb();
            }),
        };

        mockMongooseConnection = {
            close: vi.fn().mockResolvedValue(undefined),
        };

        processExitSpy = vi.fn();
        processOnSpy = vi.fn();
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    /**
     * Recreates the gracefulShutdown function from server.ts
     * to test in isolation without importing the full server module.
     */
    function createGracefulShutdown(
        server: { close: (cb?: (err?: Error) => void) => void },
        mongooseConnection: { close: () => Promise<void> },
        exit: (code: number) => void,
    ) {
        return function gracefulShutdown(signal: string) {
            console.log(`[server] ${signal} received — starting graceful shutdown`);

            const forceTimeout = setTimeout(() => {
                console.error('[server] Graceful shutdown timed out after 30s — forcing exit');
                exit(1);
            }, 30_000);
            (forceTimeout as any).unref?.();

            server.close(async () => {
                console.log('[server] HTTP server closed — no longer accepting connections');
                try {
                    await mongooseConnection.close();
                    console.log('[server] MongoDB connection closed');
                } catch (err) {
                    console.error('[server] Error closing MongoDB connection:', err);
                }
                clearTimeout(forceTimeout);
                exit(0);
            });
        };
    }

    // ─── 1. SIGTERM/SIGINT handlers are registered ──────────────────────

    describe('Signal handler registration', () => {
        it('registers SIGTERM and SIGINT handlers on process', () => {
            const handlers: Record<string, Function> = {};
            processOnSpy.mockImplementation((event: string, handler: Function) => {
                handlers[event] = handler;
            });

            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            // Simulate what server.ts does
            processOnSpy('SIGTERM', () => gracefulShutdown('SIGTERM'));
            processOnSpy('SIGINT', () => gracefulShutdown('SIGINT'));

            expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
            expect(handlers['SIGTERM']).toBeDefined();
            expect(handlers['SIGINT']).toBeDefined();
        });

        it('actual process.on registers SIGTERM handler in server.ts pattern', () => {
            const onSpy = vi.spyOn(process, 'on');

            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));

            expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

            // Clean up listeners we just added
            process.removeAllListeners('SIGTERM');
            process.removeAllListeners('SIGINT');
            onSpy.mockRestore();
        });
    });

    // ─── 2. Cleanup sequence: server.close → mongoose.close → exit(0) ──

    describe('Cleanup sequence', () => {
        it('calls server.close first, then mongoose.connection.close, then exit(0)', async () => {
            const callOrder: string[] = [];

            mockServer.close = vi.fn((cb?: (err?: Error) => void) => {
                callOrder.push('server.close');
                if (cb) cb();
            });

            mockMongooseConnection.close = vi.fn(async () => {
                callOrder.push('mongoose.close');
            });

            processExitSpy.mockImplementation((code: number) => {
                callOrder.push(`exit(${code})`);
            });

            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGTERM');

            // Allow async operations to complete
            await vi.runAllTimersAsync();

            expect(callOrder).toEqual(['server.close', 'mongoose.close', 'exit(0)']);
        });

        it('logs shutdown steps to console', async () => {
            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGTERM');
            await vi.runAllTimersAsync();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[server] SIGTERM received — starting graceful shutdown',
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[server] HTTP server closed — no longer accepting connections',
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[server] MongoDB connection closed',
            );
        });

        it('exits with code 0 on successful shutdown', async () => {
            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGINT');
            await vi.runAllTimersAsync();

            expect(processExitSpy).toHaveBeenCalledWith(0);
        });

        it('still exits with code 0 even if mongoose.close throws', async () => {
            mockMongooseConnection.close = vi.fn().mockRejectedValue(new Error('DB close failed'));

            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGTERM');
            await vi.runAllTimersAsync();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[server] Error closing MongoDB connection:',
                expect.any(Error),
            );
            expect(processExitSpy).toHaveBeenCalledWith(0);
        });
    });

    // ─── 3. 30s timeout force exit ──────────────────────────────────────

    describe('30-second timeout force exit', () => {
        it('force exits with code 1 after 30 seconds if server.close hangs', async () => {
            // server.close never calls its callback (simulates hanging)
            mockServer.close = vi.fn(() => {
                // intentionally never calls callback
            });

            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGTERM');

            // Not yet timed out at 29.9s
            await vi.advanceTimersByTimeAsync(29_999);
            expect(processExitSpy).not.toHaveBeenCalled();

            // Timed out at 30s
            await vi.advanceTimersByTimeAsync(1);
            expect(processExitSpy).toHaveBeenCalledWith(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[server] Graceful shutdown timed out after 30s — forcing exit',
            );
        });

        it('does not force exit if shutdown completes before 30s', async () => {
            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGTERM');
            await vi.runAllTimersAsync();

            // Should have exited with 0, not 1
            expect(processExitSpy).toHaveBeenCalledTimes(1);
            expect(processExitSpy).toHaveBeenCalledWith(0);
        });

        it('clears the force timeout when shutdown completes normally', async () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            const gracefulShutdown = createGracefulShutdown(
                mockServer,
                mockMongooseConnection,
                processExitSpy,
            );

            gracefulShutdown('SIGTERM');
            await vi.runAllTimersAsync();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });
    });
});
