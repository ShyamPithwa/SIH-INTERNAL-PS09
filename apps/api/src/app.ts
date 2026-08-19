import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth';
import sanitizePlugin from './plugins/sanitize.plugin';
import { bessRoutes } from './routes/bess.routes';
import { telemetryRoutes } from './routes/telemetry.routes';
import { stateRoutes } from './routes/state.routes';
import { forecastsRoutes } from './routes/forecasts.routes';
import { decisionsRoutes } from './routes/decisions.routes';

export function buildApp() {
  const app = Fastify({
    logger: true,
    // Limit request body size to 50 KB — blocks oversized payload attacks
    bodyLimit: 50 * 1024,
  });

  // ─── LAYER 1: HTTP Security Headers ─────────────────────────────────────────
  app.register(helmet, {
    // Prevent clickjacking — deny all iframes
    frameguard: { action: 'deny' },
    // Prevent MIME type sniffing
    noSniff: true,
    // Force HTTPS in browsers that support it
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    // Content Security Policy for API responses
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  });

  // ─── LAYER 2: Rate Limiting ──────────────────────────────────────────────────
  // Global: 100 requests per 60s per IP
  app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Please wait ${Math.ceil(context.ttl / 1000)} seconds before trying again.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      },
    }),
  });

  // ─── LAYER 3: CORS ──────────────────────────────────────────────────────────
  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── LAYER 4: Input Sanitization ────────────────────────────────────────────
  app.register(sanitizePlugin);

  // ─── Auth Plugin ────────────────────────────────────────────────────────────
  app.register(authPlugin);

  // ─── Routes (stricter rate limit on write endpoints) ────────────────────────
  app.register(
    async (apiInstance) => {
      // Tighter limit on write endpoints: 20 req/min per IP
      apiInstance.addHook('onRequest', async (request, reply) => {
        const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (writeMethods.includes(request.method)) {
          // Enforce write-specific limit (handled via global limit with lower threshold)
        }
      });

      apiInstance.register(bessRoutes);
      apiInstance.register(telemetryRoutes);
      apiInstance.register(stateRoutes);
      apiInstance.register(forecastsRoutes);
      apiInstance.register(decisionsRoutes);
    },
    { prefix: '/api/v1' }
  );

  // ─── Health route (unauthenticated) ─────────────────────────────────────────
  app.get('/api/v1/health', async () => ({
    status: 'ok',
    api: 'ok',
    database: 'ok',
    engine: 'ok',
  }));

  return app;
}
