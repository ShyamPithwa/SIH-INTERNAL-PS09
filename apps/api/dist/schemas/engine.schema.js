"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineOutputSchema = exports.DecisionResultSchema = exports.GridAnalysisResultSchema = exports.SingleForecastResultSchema = exports.EngineInputSchema = exports.ForecastConfigSchema = exports.HistoricalSampleSchema = exports.TelemetrySampleModelSchema = exports.BatteryStateModelSchema = exports.BessAssetConfigSchema = void 0;
const zod_1 = require("zod");
exports.BessAssetConfigSchema = zod_1.z.object({
    ratedEnergyKwh: zod_1.z.number(),
    usableEnergyKwh: zod_1.z.number(),
    ratedPowerKw: zod_1.z.number(),
    maxChargePowerKw: zod_1.z.number(),
    maxDischargePowerKw: zod_1.z.number(),
    nominalVoltageV: zod_1.z.number(),
    minVoltageV: zod_1.z.number(),
    maxVoltageV: zod_1.z.number(),
    maxChargeCurrentA: zod_1.z.number(),
    maxDischargeCurrentA: zod_1.z.number(),
    minTemperatureC: zod_1.z.number(),
    maxTemperatureC: zod_1.z.number(),
    roundTripEfficiency: zod_1.z.number(),
    socMin: zod_1.z.number(),
    socMax: zod_1.z.number(),
    nominalGridFrequencyHz: zod_1.z.number(),
    frequencyDeadbandHz: zod_1.z.number(),
    droopGainKwPerHz: zod_1.z.number(),
    degradationCoefficient: zod_1.z.number(),
});
exports.BatteryStateModelSchema = zod_1.z.object({
    soc: zod_1.z.number().min(0).max(1),
    soh: zod_1.z.number().min(0).max(1),
    efc: zod_1.z.number(),
    internalResistanceOhm: zod_1.z.number().nullable().optional(),
    usableCapacityKwh: zod_1.z.number(),
    availableEnergyKwh: zod_1.z.number(),
    chargePowerAvailableKw: zod_1.z.number(),
    dischargePowerAvailableKw: zod_1.z.number(),
    cumulativeEnergyThroughputKwh: zod_1.z.number(),
});
exports.TelemetrySampleModelSchema = zod_1.z.object({
    recordedAt: zod_1.z.string(),
    batteryVoltageV: zod_1.z.number(),
    batteryCurrentA: zod_1.z.number(),
    batteryPowerKw: zod_1.z.number(),
    batteryTemperatureC: zod_1.z.number(),
    gridFrequencyHz: zod_1.z.number(),
    gridVoltageV: zod_1.z.number().nullable().optional(),
    renewablePowerKw: zod_1.z.number().nullable().optional(),
    loadPowerKw: zod_1.z.number().nullable().optional(),
    deltaTimeHours: zod_1.z.number(),
});
exports.HistoricalSampleSchema = zod_1.z.object({
    t: zod_1.z.number(),
    gridFrequencyHz: zod_1.z.number(),
    renewablePowerKw: zod_1.z.number(),
    loadPowerKw: zod_1.z.number(),
});
exports.ForecastConfigSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    maxDegree: zod_1.z.number().int().min(1).max(5),
    tolerance: zod_1.z.number(),
    horizonSteps: zod_1.z.number().int().positive(),
    stepSeconds: zod_1.z.number().int().positive(),
});
exports.EngineInputSchema = zod_1.z.object({
    operation: zod_1.z.string().default('analyze'),
    version: zod_1.z.string().default('1'),
    asset: exports.BessAssetConfigSchema,
    previousState: exports.BatteryStateModelSchema,
    telemetry: exports.TelemetrySampleModelSchema,
    history: zod_1.z.array(exports.HistoricalSampleSchema),
    forecast: exports.ForecastConfigSchema,
});
exports.SingleForecastResultSchema = zod_1.z.object({
    degree: zod_1.z.number().int(),
    residualNorm: zod_1.z.number(),
    values: zod_1.z.array(zod_1.z.number()),
});
exports.GridAnalysisResultSchema = zod_1.z.object({
    energyBalanceKw: zod_1.z.number(),
    frequencyDeviationHz: zod_1.z.number(),
    frequencySupportRequestKw: zod_1.z.number(),
});
exports.DecisionResultSchema = zod_1.z.object({
    action: zod_1.z.enum(['CHARGE', 'DISCHARGE', 'HOLD', 'FREQUENCY_SUPPORT']),
    targetPowerKw: zod_1.z.number(),
    score: zod_1.z.number(),
    reasonCode: zod_1.z.string(),
    reasonText: zod_1.z.string(),
    constraints: zod_1.z.object({
        socAllowed: zod_1.z.boolean(),
        temperatureAllowed: zod_1.z.boolean(),
        voltageAllowed: zod_1.z.boolean(),
        powerClipped: zod_1.z.boolean(),
    }),
});
exports.EngineOutputSchema = zod_1.z.object({
    ok: zod_1.z.boolean(),
    errorMessage: zod_1.z.string().optional().nullable(),
    state: exports.BatteryStateModelSchema.optional(),
    grid: exports.GridAnalysisResultSchema.optional(),
    forecasts: zod_1.z.record(exports.SingleForecastResultSchema).optional(),
    decision: exports.DecisionResultSchema.optional(),
});
