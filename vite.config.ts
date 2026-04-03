import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import { registerApiRoutes } from './server.js';

function expressPlugin() {
    return {
        name: 'express-plugin',
        configureServer(server) {
            const app = express();
            registerApiRoutes(app);
            server.middlewares.use(app);
        }
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), expressPlugin()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
