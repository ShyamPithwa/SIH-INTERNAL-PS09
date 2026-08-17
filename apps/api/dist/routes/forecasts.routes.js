"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastsRoutes = forecastsRoutes;
const forecast_service_1 = require("../services/forecast.service");
const forecastService = new forecast_service_1.ForecastService();
async function forecastsRoutes(fastify) {
    fastify.addHook('preHandler', fastify.authenticate);
    // Get latest forecast results for all targets
    fastify.get('/bess/:id/forecasts/latest', async (request, reply) => {
        try {
            const { id } = request.params;
            const gridFrequency = await forecastService.getLatestForecast(id, 'GRID_FREQUENCY');
            const renewablePower = await forecastService.getLatestForecast(id, 'RENEWABLE_POWER');
            const loadPower = await forecastService.getLatestForecast(id, 'LOAD_POWER');
            return {
                gridFrequency: gridFrequency ? {
                    degree: gridFrequency.forecast.polynomialDegree,
                    residualNorm: gridFrequency.forecast.residualNorm,
                    values: gridFrequency.points.map(p => p.predictedValue),
                    timestamps: gridFrequency.points.map(p => p.predictedAt),
                } : null,
                renewablePower: renewablePower ? {
                    degree: renewablePower.forecast.polynomialDegree,
                    residualNorm: renewablePower.forecast.residualNorm,
                    values: renewablePower.points.map(p => p.predictedValue),
                    timestamps: renewablePower.points.map(p => p.predictedAt),
                } : null,
                loadPower: loadPower ? {
                    degree: loadPower.forecast.polynomialDegree,
                    residualNorm: loadPower.forecast.residualNorm,
                    values: loadPower.points.map(p => p.predictedValue),
                    timestamps: loadPower.points.map(p => p.predictedAt),
                } : null,
            };
        }
        catch (err) {
            return reply.status(500).send({
                error: {
                    code: 'DATABASE_ERROR',
                    message: err.message || 'Failed to fetch latest forecasts',
                },
            });
        }
    });
}
