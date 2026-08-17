"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryRoutes = telemetryRoutes;
const telemetry_service_1 = require("../services/telemetry.service");
const telemetry_schema_1 = require("../schemas/telemetry.schema");
const zod_1 = require("zod");
const telemetryService = new telemetry_service_1.TelemetryService();
const TelemetryQuerySchema = zod_1.z.object({
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
});
async function telemetryRoutes(fastify) {
    // Apply authentication to all telemetry routes
    fastify.addHook('preHandler', fastify.authenticate);
    // 1. Ingest Single Telemetry Sample
    fastify.post('/bess/:id/telemetry', async (request, reply) => {
        try {
            const { id } = request.params;
            const ownerId = request.user.id;
            const parsedBody = telemetry_schema_1.TelemetrySampleSchema.parse(request.body);
            const sample = await telemetryService.addTelemetry(ownerId, id, parsedBody);
            return reply.status(201).send(sample);
        }
        catch (err) {
            return handleRouteError(err, reply);
        }
    });
    // 2. Ingest Telemetry Batch
    fastify.post('/bess/:id/telemetry/batch', async (request, reply) => {
        try {
            const { id } = request.params;
            const ownerId = request.user.id;
            const parsedBody = telemetry_schema_1.TelemetryBatchSchema.parse(request.body);
            const samples = await telemetryService.addTelemetryBatch(ownerId, id, parsedBody.samples);
            return reply.status(201).send(samples);
        }
        catch (err) {
            return handleRouteError(err, reply);
        }
    });
    // 3. Get Telemetry History
    fastify.get('/bess/:id/telemetry', async (request, reply) => {
        try {
            const { id } = request.params;
            const ownerId = request.user.id;
            const parsedQuery = TelemetryQuerySchema.parse(request.query);
            const telemetry = await telemetryService.listTelemetry(ownerId, id, parsedQuery);
            return telemetry;
        }
        catch (err) {
            return handleRouteError(err, reply);
        }
    });
    // 4. Get Latest Telemetry
    fastify.get('/bess/:id/telemetry/latest', async (request, reply) => {
        try {
            const { id } = request.params;
            const ownerId = request.user.id;
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
        }
        catch (err) {
            return handleRouteError(err, reply);
        }
    });
}
function handleRouteError(err, reply) {
    if (err instanceof zod_1.ZodError) {
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
