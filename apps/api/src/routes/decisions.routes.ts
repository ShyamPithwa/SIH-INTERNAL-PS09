import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DecisionService } from '../services/decision.service';
import { z } from 'zod';

const decisionService = new DecisionService();

export async function decisionsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // 1. Get Latest Decision
  fastify.get('/bess/:id/decisions/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const decision = await decisionService.getLatestDecision(id);
      if (!decision) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No dispatch decisions found for this BESS asset',
          },
        });
      }
      return decision;
    } catch (err: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: err.message || 'Failed to fetch latest decision',
        },
      });
    }
  });

  // 2. Get Decisions History
  fastify.get('/bess/:id/decisions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const QuerySchema = z.object({
        limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
      });
      const { limit } = QuerySchema.parse(request.query);

      const decisions = await decisionService.listDecisions(id, limit);
      return decisions;
    } catch (err: any) {
      return reply.status(500).send({
        error: {
          code: 'DATABASE_ERROR',
          message: err.message || 'Failed to fetch decisions history',
        },
      });
    }
  });
}
