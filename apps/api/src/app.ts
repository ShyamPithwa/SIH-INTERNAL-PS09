import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth';
import { bessRoutes } from './routes/bess.routes';
import { telemetryRoutes } from './routes/telemetry.routes';
import { stateRoutes } from './routes/state.routes';
import { forecastsRoutes } from './routes/forecasts.routes';
import { decisionsRoutes } from './routes/decisions.routes';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Enable CORS
  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  });

  // Register Auth Plugin
  app.register(authPlugin);

  // Register Routes under /api/v1 prefix
  app.register(
    async (apiInstance) => {
      apiInstance.register(bessRoutes);
      apiInstance.register(telemetryRoutes);
      apiInstance.register(stateRoutes);
      apiInstance.register(forecastsRoutes);
      apiInstance.register(decisionsRoutes);
    },
    { prefix: '/api/v1' }
  );

  // Health route (unauthenticated)
  app.get('/api/v1/health', async () => {
    return {
      status: 'ok',
      api: 'ok',
      database: 'ok',
      engine: 'ok',
    };
  });

  return app;
}
