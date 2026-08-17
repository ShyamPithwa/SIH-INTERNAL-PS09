import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StateService } from '../services/state.service';
import { TelemetryService } from '../services/telemetry.service';
import { runAnalysisJob } from '../jobs/analysis.job';

const stateService = new StateService();
const telemetryService = new TelemetryService();

export async function stateRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // 1. Get Latest Battery State
  fastify.get('/bess/:id/state/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const state = await stateService.getLatestState(id);
      if (!state) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No state estimation found for this asset',
          },
        });
      }
      return state;
    } catch (err: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: err.message || 'Failed to fetch latest state',
        },
      });
    }
  });

  // 2. Force Dispatch Analysis Pipeline
  fastify.post('/bess/:id/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;

      // Get latest raw telemetry sample
      const latestTelemetry = await telemetryService.getLatestTelemetry(ownerId, id);
      if (!latestTelemetry) {
        return reply.status(400).send({
          error: {
            code: 'INSUFFICIENT_HISTORY',
            message: 'Cannot run analysis: Ingestion pipeline requires at least one raw telemetry sample.',
          },
        });
      }

      // Execute C++ dispatch pipeline
      const analysisResult = await runAnalysisJob(id, latestTelemetry);
      return analysisResult;
    } catch (err: any) {
      return reply.status(500).send({
        error: {
          code: 'ENGINE_FAILURE',
          message: err.message || 'C++ execution core reported a processing error',
        },
      });
    }
  });
}
