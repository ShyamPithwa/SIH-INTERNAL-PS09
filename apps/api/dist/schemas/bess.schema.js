"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBessAssetSchema = exports.BessAssetSchema = void 0;
const zod_1 = require("zod");
const BessAssetBaseSchema = zod_1.z.object({
    bessCode: zod_1.z.string().min(1, 'bessCode is required'),
    manufacturer: zod_1.z.string().nullable().optional(),
    model: zod_1.z.string().nullable().optional(),
    batteryChemistry: zod_1.z.string().nullable().optional(),
    moduleCount: zod_1.z.number().int().positive().nullable().optional(),
    cellsPerModule: zod_1.z.number().int().positive().nullable().optional(),
    ratedEnergyKwh: zod_1.z.number().positive('ratedEnergyKwh must be positive'),
    usableEnergyKwh: zod_1.z.number().positive('usableEnergyKwh must be positive'),
    ratedPowerKw: zod_1.z.number().positive('ratedPowerKw must be positive'),
    maxChargePowerKw: zod_1.z.number().positive('maxChargePowerKw must be positive'),
    maxDischargePowerKw: zod_1.z.number().positive('maxDischargePowerKw must be positive'),
    nominalVoltageV: zod_1.z.number(),
    minVoltageV: zod_1.z.number(),
    maxVoltageV: zod_1.z.number(),
    maxChargeCurrentA: zod_1.z.number(),
    maxDischargeCurrentA: zod_1.z.number(),
    minTemperatureC: zod_1.z.number(),
    maxTemperatureC: zod_1.z.number(),
    roundTripEfficiency: zod_1.z.number().gt(0).lte(1),
    socMin: zod_1.z.number().min(0).max(1).default(0.10),
    socMax: zod_1.z.number().min(0).max(1).default(0.90),
    socInitial: zod_1.z.number().min(0).max(1).default(0.50),
    sohInitial: zod_1.z.number().min(0).max(1).default(1.00),
    nominalGridFrequencyHz: zod_1.z.number().default(50.0),
    frequencyDeadbandHz: zod_1.z.number().default(0.05),
    droopGainKwPerHz: zod_1.z.number().default(50.0),
    degradationCoefficient: zod_1.z.number().default(0.0001),
});
exports.BessAssetSchema = BessAssetBaseSchema.refine(data => data.usableEnergyKwh <= data.ratedEnergyKwh, {
    message: 'usableEnergyKwh cannot exceed ratedEnergyKwh',
    path: ['usableEnergyKwh'],
}).refine(data => data.minVoltageV < data.nominalVoltageV, {
    message: 'minVoltageV must be less than nominalVoltageV',
    path: ['minVoltageV'],
}).refine(data => data.nominalVoltageV < data.maxVoltageV, {
    message: 'nominalVoltageV must be less than maxVoltageV',
    path: ['nominalVoltageV'],
}).refine(data => data.minTemperatureC < data.maxTemperatureC, {
    message: 'minTemperatureC must be less than maxTemperatureC',
    path: ['minTemperatureC'],
}).refine(data => data.socMin < data.socMax, {
    message: 'socMin must be less than socMax',
    path: ['socMin'],
});
exports.UpdateBessAssetSchema = BessAssetBaseSchema.partial();
