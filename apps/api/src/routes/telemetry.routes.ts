import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TelemetryService } from '../services/telemetry.service';
import { TelemetrySampleSchema, TelemetryBatchSchema } from '../schemas/telemetry.schema';
import { ZodError, z } from 'zod';

const telemetryService = new TelemetryService();

const TelemetryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export async function telemetryRoutes(fastify: FastifyInstance) {
  // Apply authentication to all telemetry routes
  fastify.addHook('preHandler', fastify.authenticate);

  // 1. Ingest Single Telemetry Sample
  fastify.post('/bess/:id/telemetry', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const parsedBody = TelemetrySampleSchema.parse(request.body);
      const sample = await telemetryService.addTelemetry(ownerId, id, parsedBody);
      return reply.status(201).send(sample);
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 2. Ingest Telemetry Batch
  fastify.post('/bess/:id/telemetry/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      
      const parsedBody = TelemetryBatchSchema.parse(request.body);
      const samples = await telemetryService.addTelemetryBatch(ownerId, id, parsedBody.samples);
      return reply.status(201).send(samples);
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 3. Get Telemetry History
  fastify.get('/bess/:id/telemetry', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const parsedQuery = TelemetryQuerySchema.parse(request.query);
      const telemetry = await telemetryService.listTelemetry(ownerId, id, parsedQuery);
      return telemetry;
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 4. Get Latest Telemetry
  fastify.get('/bess/:id/telemetry/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const sample = await telemetryService.getLatestTelemetry(ownerId, id);
      if (!sample) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No telemetry samples found for this BESS asset',
          },
        });
      }
      return sample;
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });
}

function handleRouteError(err: any, reply: FastifyReply) {
  if (err instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'INVALID_TELEMETRY',
        message: 'Validation failed',
        details: err.flatten().fieldErrors,
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'DATABASE_ERROR';
  return reply.status(statusCode).send({
    error: {
      code: errorCode,
      message: err.message || 'An internal error occurred',
    },
  });
}
