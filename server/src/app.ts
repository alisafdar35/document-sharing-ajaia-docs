import express from 'express';
import cors from 'cors';
import { usersRouter } from './routes/users';
import { documentsRouter } from './routes/documents';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { sendOk } from './lib/http';

/**
 * Builds the Express app. Kept separate from the server bootstrap so tests can
 * mount it with supertest without binding a port.
 */
export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/tooling requests (curl, health checks) which send no Origin.
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      allowedHeaders: ['Content-Type', 'x-user-id'],
    })
  );

  // Imports are capped at 1 MB; the extra headroom covers JSON escaping.
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) =>
    sendOk(res, { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
  );

  app.use('/api/users', usersRouter);
  app.use('/api/documents', documentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
