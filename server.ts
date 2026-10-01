import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  serverState,
  stationRouter,
  tablesRouter,
  catalogRouter,
  devicesRouter,
  eventsRouter,
  tursoRouter,
  printerDiscoveryRouter,
} from './src/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// -------------------------------------------------------------
// Structured Request Logging Middleware
// -------------------------------------------------------------
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      console.log(
        `[${new Date().toISOString()}] [API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`
      );
    }
  });
  next();
});

// -------------------------------------------------------------
// In-Memory Rate Limiting for API protection
// -------------------------------------------------------------
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300; // 300 requests per minute per IP

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const clientData = requestCounts.get(ip);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  clientData.count++;
  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry in 1 minute.',
      retryAfterSeconds: Math.ceil((clientData.resetTime - now) / 1000),
    });
  }

  next();
}

app.use('/api/', rateLimiter);

// -------------------------------------------------------------
// REST API v2 ENDPOINTS (Modular Controllers)
// -------------------------------------------------------------
app.use('/api/v2', stationRouter);
app.use('/api/v2', tablesRouter);
app.use('/api/v2', catalogRouter);
app.use('/api/v2', devicesRouter);
app.use('/api/v2', eventsRouter);
app.use('/api/v2', tursoRouter);
app.use('/api/v2', printerDiscoveryRouter);

// -------------------------------------------------------------
// Vite Middlewares (Dev) or Static Assets (Prod)
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 E-Studio Production REST API Server running on port ${PORT}`);
    console.log(`📱 Mobile Interop endpoints ready on http://0.0.0.0:${PORT}/api/v2/`);
    console.log(`🔐 Station ID: ${serverState.stationConfig.stationId} | PIN: ${serverState.stationConfig.pin}`);
  });
}

startServer();
