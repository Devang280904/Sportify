import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Silencing common "noise" errors in the dev console
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNABORTED') {
              return;
            }
            console.log('Proxy Error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    middlewareMode: false,
  },
});
