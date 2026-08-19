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

  // 5. Export Telemetry as CSV
  fastify.get('/bess/:id/telemetry/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const ownerId = request.user!.id;
      const query = request.query as { from?: string; to?: string; limit?: string };
      const limit = query.limit ? parseInt(query.limit) : 1000;

      const samples = await telemetryService.listTelemetry(ownerId, id, {
        from: query.from,
        to: query.to,
        limit,
      });

      // Build CSV
      const headers = [
        'id', 'recorded_at', 'battery_voltage_v', 'battery_current_a',
        'battery_power_kw', 'battery_temperature_c', 'grid_frequency_hz',
        'grid_voltage_v', 'renewable_power_kw', 'load_power_kw', 'quality', 'source',
      ];

      const escape = (val: any) => {
        if (val == null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      };

      const rows = samples.map(s => [
        s.id, s.recordedAt, s.batteryVoltageV, s.batteryCurrentA,
        s.batteryPowerKw ?? '', s.batteryTemperatureC, s.gridFrequencyHz,
        s.gridVoltageV ?? '', s.renewablePowerKw ?? '', s.loadPowerKw ?? '',
        s.quality, s.source,
      ].map(escape).join(','));

      const csv = [headers.join(','), ...rows].join('\r\n');

      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="bess-${id}-telemetry.csv"`)
        .send(csv);
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
        message: 'Schema validation failed',
        details: err.flatten().fieldErrors,
      },
    });
  }

  // Data integrity rejection (fake/tampered/anomalous data)
  if (err.code === 'DATA_INTEGRITY_VIOLATION') {
    return reply.status(422).send({
      error: {
        code: 'DATA_INTEGRITY_VIOLATION',
        message: err.message,
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

