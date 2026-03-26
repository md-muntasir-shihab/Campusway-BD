import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const frontendPort = Number(env.PORT || env.VITE_PORT || 5175);
    const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5003';

    return {
        plugins: [react()],
        server: {
            port: frontendPort,
            strictPort: true,
            proxy: {
                '/api': {
                    target: apiProxyTarget,
                    changeOrigin: true,
                },
                '/uploads': {
                    target: apiProxyTarget,
                    changeOrigin: true,
                },
            },
        },
    };
});
