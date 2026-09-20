import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function botsailorApiPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    if (req.url && (req.url === '/api/whatsapp/send' || req.url.startsWith('/api/whatsapp/send?')) && req.method === 'POST') {
      let bodyStr = '';
      req.on('data', (chunk: any) => {
        bodyStr += chunk;
      });
      req.on('end', async () => {
        try {
          let parsed: any = {};
          try {
            parsed = JSON.parse(bodyStr);
          } catch {
            parsed = Object.fromEntries(new URLSearchParams(bodyStr));
          }

          const apiToken = parsed.apiToken || '23554|jPN2BOmfK2izqxzHMuZ6GAdMeFFju4TWCedCrm5fad0ac045';
          const phone_number_id = parsed.phone_number_id || '1240239752513619';
          const message = parsed.message || '';
          const phone_number = String(parsed.phone_number || '').replace(/\D/g, '');

          const formData = new URLSearchParams();
          formData.append('apiToken', apiToken);
          formData.append('phone_number_id', phone_number_id);
          formData.append('message', message);
          formData.append('phone_number', phone_number);

          const botRes = await fetch('https://botsailor.com/api/v1/whatsapp/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          const data = await botRes.json();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({ status: '0', message: err?.message || 'Server proxy error' }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'botsailor-api-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    botsailorApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
      manifest: {
        id: '/',
        name: 'CIMB Cash Plus',
        short_name: 'CIMB Cash',
        description: 'Aplikasi permohonan pinjaman peribadi CIMB Cash Plus, pemantauan status pinjaman, pengurusan bil ansuran bulanan, dan pengesahan pembayaran.',
        theme_color: '#E31B23',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        importScripts: ['/sw-push.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    proxy: {
      '/api/botsailor': {
        target: 'https://botsailor.com',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api\/botsailor/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
