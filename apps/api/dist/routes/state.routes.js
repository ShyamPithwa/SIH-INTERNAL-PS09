"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateRoutes = stateRoutes;
const state_service_1 = require("../services/state.service");
const telemetry_service_1 = require("../services/telemetry.service");
const analysis_job_1 = require("../jobs/analysis.job");
const stateService = new state_service_1.StateService();
const telemetryService = new telemetry_service_1.TelemetryService();
async function stateRoutes(fastify) {
    fastify.addHook('preHandler', fastify.authenticate);
    // 1. Get Latest Battery State
    fastify.get('/bess/:id/state/latest', async (request, reply) => {
        try {
            const { id } = request.params;
            const ownerId = request.user.id;
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
        }
        catch (err) {
            return reply.status(500).send({
                error: {
                    code: 'DATABASE_ERROR',
                    message: err.message || 'Failed to fetch latest state',
                },
            });
        }
    });
    // 2. Force Dispatch Analysis Pipeline
    fastify.post('/bess/:id/analyze', async (request, reply) => {
        try {
            const { id } = request.params;
            const ownerId = request.user.id;
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
            const analysisResult = await (0, analysis_job_1.runAnalysisJob)(id, latestTelemetry);
            return analysisResult;
        }
        catch (err) {
            return reply.status(500).send({
                error: {
                    code: 'ENGINE_FAILURE',
                    message: err.message || 'C++ execution core reported a processing error',
                },
            });
        }
    });
}
