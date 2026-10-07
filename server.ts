import express from 'express';
import type { Request, Response, NextFunction } from 'express';
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
} from './src/server/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Configurable CORS with safe local network defaults
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOriginsList = allowedOriginsEnv ? allowedOriginsEnv.split(',').map((o) => o.trim()) : null;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOriginsList) {
        if (allowedOriginsList.includes(origin)) return callback(null, true);
        return callback(new Error('CORS: Origin not permitted'), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

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
// In-Memory Rate Limiting with Automatic Map Pruning
// -------------------------------------------------------------
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300; // 300 requests per minute per IP
const MAX_TRACKED_IPS = 5000;

// Periodic pruning of expired IPs to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
  if (requestCounts.size > MAX_TRACKED_IPS) {
    requestCounts.clear();
  }
}, 60 * 1000).unref();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
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
    console.log(`🔐 Station ID: ${serverState.stationConfig.stationId} | Mobile Interoperability Ready`);
  });
}

startServer();
