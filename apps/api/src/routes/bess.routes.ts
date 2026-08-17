import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BessService } from '../services/bess.service';
import { BessAssetSchema, UpdateBessAssetSchema } from '../schemas/bess.schema';
import { ZodError } from 'zod';

const bessService = new BessService();

export async function bessRoutes(fastify: FastifyInstance) {
  // Apply authentication to all BESS routes
  fastify.addHook('preHandler', fastify.authenticate);

  // 1. Create BESS Asset
  fastify.post('/bess', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsedBody = BessAssetSchema.parse(request.body);
      const ownerId = request.user!.id;
      const asset = await bessService.createAsset(ownerId, parsedBody);
      return reply.status(201).send(asset);
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 2. List BESS Assets
  fastify.get('/bess', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerId = request.user!.id;
      const assets = await bessService.listAssets(ownerId);
      return assets;
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 3. Get BESS Asset by ID
  fastify.get('/bess/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const asset = await bessService.getAsset(id, ownerId);
      return asset;
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 4. Update BESS Asset
  fastify.patch('/bess/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const parsedBody = UpdateBessAssetSchema.parse(request.body);
      const asset = await bessService.updateAsset(id, ownerId, parsedBody);
      return asset;
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });

  // 5. Delete BESS Asset
  fastify.delete('/bess/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      await bessService.deleteAsset(id, ownerId);
      return reply.status(204).send();
    } catch (err) {
      return handleRouteError(err, reply);
    }
  });
}

function handleRouteError(err: any, reply: FastifyReply) {
  if (err instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'INVALID_CONFIGURATION',
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
