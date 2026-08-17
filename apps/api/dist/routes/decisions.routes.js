"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionsRoutes = decisionsRoutes;
const decision_service_1 = require("../services/decision.service");
const zod_1 = require("zod");
const decisionService = new decision_service_1.DecisionService();
async function decisionsRoutes(fastify) {
    fastify.addHook('preHandler', fastify.authenticate);
    // 1. Get Latest Decision
    fastify.get('/bess/:id/decisions/latest', async (request, reply) => {
        try {
            const { id } = request.params;
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
        }
        catch (err) {
            return reply.status(500).send({
                error: {
                    code: 'DATABASE_ERROR',
                    message: err.message || 'Failed to fetch latest decision',
                },
            });
        }
    });
    // 2. Get Decisions History
    fastify.get('/bess/:id/decisions', async (request, reply) => {
        try {
            const { id } = request.params;
            const QuerySchema = zod_1.z.object({
                limit: zod_1.z.string().regex(/^\d+$/).transform(Number).default('50'),
            });
            const { limit } = QuerySchema.parse(request.query);
            const decisions = await decisionService.listDecisions(id, limit);
            return decisions;
        }
        catch (err) {
            return reply.status(500).send({
                error: {
                    code: 'DATABASE_ERROR',
                    message: err.message || 'Failed to fetch decisions history',
                },
            });
        }
    });
}
