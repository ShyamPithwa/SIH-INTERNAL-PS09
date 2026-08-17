import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { supabase } from './supabase';

// Augment FastifyRequest and FastifyInstance in a single declaration block
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized: Invalid token',
        },
      });
      return;
    }

    request.user = {
      id: user.id,
      email: user.email,
    };
  });
};

export default fp(authPlugin);
