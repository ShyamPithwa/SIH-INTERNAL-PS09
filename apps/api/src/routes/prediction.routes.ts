import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { predictionService } from '../services/prediction.service';

export async function predictionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /bess/:id/prediction — Battery end-of-life prediction
  fastify.get('/bess/:id/prediction', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const prediction = await predictionService.predictEol(id);
      if (!prediction) {
        return reply.status(404).send({
          error: {
            code: 'INSUFFICIENT_DATA',
            message: 'Not enough historical SOH data to generate a prediction. Ingest more telemetry samples first.',
          },
        });
      }
      return prediction;
    } catch (err: any) {
      return reply.status(500).send({ error: { code: 'PREDICTION_ERROR', message: err.message } });
    }
  });
}
