"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryBatchSchema = exports.TelemetrySampleSchema = void 0;
const zod_1 = require("zod");
exports.TelemetrySampleSchema = zod_1.z.object({
    recordedAt: zod_1.z.string().datetime({ message: 'recordedAt must be a valid ISO 8601 timestamp' }),
    batteryVoltageV: zod_1.z.number().positive('batteryVoltageV must be positive'),
    batteryCurrentA: zod_1.z.number(),
    batteryPowerKw: zod_1.z.number().optional().nullable(),
    batteryTemperatureC: zod_1.z.number().min(-50, 'Temperature is physically absurd').max(150, 'Temperature is physically absurd'),
    gridFrequencyHz: zod_1.z.number().positive('gridFrequencyHz must be positive'),
    gridVoltageV: zod_1.z.number().positive('gridVoltageV must be positive').optional().nullable(),
    renewablePowerKw: zod_1.z.number().min(0, 'renewablePowerKw cannot be negative').optional().nullable(),
    loadPowerKw: zod_1.z.number().min(0, 'loadPowerKw cannot be negative').optional().nullable(),
    source: zod_1.z.string().default('api'),
    quality: zod_1.z.string().default('GOOD'),
});
exports.TelemetryBatchSchema = zod_1.z.object({
    samples: zod_1.z.array(exports.TelemetrySampleSchema).min(1, 'At least one telemetry sample is required'),
});
