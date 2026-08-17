"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const supabase_1 = require("./supabase");
const authPlugin = async (fastify) => {
    fastify.decorateRequest('user', null);
    fastify.decorate('authenticate', async (request, reply) => {
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
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
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
exports.default = (0, fastify_plugin_1.default)(authPlugin);
