"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const auth_1 = __importDefault(require("./plugins/auth"));
const bess_routes_1 = require("./routes/bess.routes");
const telemetry_routes_1 = require("./routes/telemetry.routes");
const state_routes_1 = require("./routes/state.routes");
const forecasts_routes_1 = require("./routes/forecasts.routes");
const decisions_routes_1 = require("./routes/decisions.routes");
function buildApp() {
    const app = (0, fastify_1.default)({
        logger: {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        },
    });
    // Enable CORS
    app.register(cors_1.default, {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    });
    // Register Auth Plugin
    app.register(auth_1.default);
    // Register Routes under /api/v1 prefix
    app.register(async (apiInstance) => {
        apiInstance.register(bess_routes_1.bessRoutes);
        apiInstance.register(telemetry_routes_1.telemetryRoutes);
        apiInstance.register(state_routes_1.stateRoutes);
        apiInstance.register(forecasts_routes_1.forecastsRoutes);
        apiInstance.register(decisions_routes_1.decisionsRoutes);
    }, { prefix: '/api/v1' });
    // Health route (unauthenticated)
    app.get('/api/v1/health', async () => {
        return {
            status: 'ok',
            api: 'ok',
            database: 'ok',
            engine: 'ok',
        };
    });
    return app;
}
