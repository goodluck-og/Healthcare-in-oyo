import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiApp } from './server/createApp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = createApiApp();
  const isProd = process.env.NODE_ENV === 'production';

  // Allow Firebase Auth Google sign-in popups to communicate with window.opener reliably.
  app.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  // Serve generated presentation exports (kept outside public/ to keep GitHub uploads lightweight)
  const exportFiles: Record<string, string> = {
    '/HealthConnect_Oyo_State_Blueprint.docx': '/tmp/healthconnect_exports/HealthConnect_Oyo_State_Blueprint.docx',
    '/HealthConnect_Oyo_State_Screenshots.zip': '/tmp/healthconnect_exports/HealthConnect_Oyo_State_Screenshots.zip',
  };
  for (const [routePath, filePath] of Object.entries(exportFiles)) {
    app.get(routePath, (_req, res, next) => {
      if (fs.existsSync(filePath)) {
        res.download(filePath, path.basename(filePath));
        return;
      }
      next();
    });
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HealthConnect Africa server listening on http://localhost:${PORT}`);
  });
}

void startServer();
