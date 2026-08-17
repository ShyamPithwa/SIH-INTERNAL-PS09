import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ForecastService } from '../services/forecast.service';

const forecastService = new ForecastService();

export async function forecastsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Get latest forecast results for all targets
  fastify.get('/bess/:id/forecasts/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const gridFrequency = await forecastService.getLatestForecast(id, 'GRID_FREQUENCY');
      const renewablePower = await forecastService.getLatestForecast(id, 'RENEWABLE_POWER');
      const loadPower = await forecastService.getLatestForecast(id, 'LOAD_POWER');

      return {
        gridFrequency: gridFrequency ? {
          degree: gridFrequency.forecast.polynomialDegree,
          residualNorm: gridFrequency.forecast.residualNorm,
          values: gridFrequency.points.map(p => p.predictedValue),
          timestamps: gridFrequency.points.map(p => p.predictedAt),
        } : null,
        renewablePower: renewablePower ? {
          degree: renewablePower.forecast.polynomialDegree,
          residualNorm: renewablePower.forecast.residualNorm,
          values: renewablePower.points.map(p => p.predictedValue),
          timestamps: renewablePower.points.map(p => p.predictedAt),
        } : null,
        loadPower: loadPower ? {
          degree: loadPower.forecast.polynomialDegree,
          residualNorm: loadPower.forecast.residualNorm,
          values: loadPower.points.map(p => p.predictedValue),
          timestamps: loadPower.points.map(p => p.predictedAt),
        } : null,
      };
    } catch (err: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: err.message || 'Failed to fetch latest forecasts',
        },
      });
    }
  });
}
