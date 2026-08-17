import { z } from 'zod';

const BessAssetBaseSchema = z.object({
  bessCode: z.string().min(1, 'bessCode is required'),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  batteryChemistry: z.string().nullable().optional(),
  moduleCount: z.number().int().positive().nullable().optional(),
  cellsPerModule: z.number().int().positive().nullable().optional(),
  ratedEnergyKwh: z.number().positive('ratedEnergyKwh must be positive'),
  usableEnergyKwh: z.number().positive('usableEnergyKwh must be positive'),
  ratedPowerKw: z.number().positive('ratedPowerKw must be positive'),
  maxChargePowerKw: z.number().positive('maxChargePowerKw must be positive'),
  maxDischargePowerKw: z.number().positive('maxDischargePowerKw must be positive'),
  nominalVoltageV: z.number(),
  minVoltageV: z.number(),
  maxVoltageV: z.number(),
  maxChargeCurrentA: z.number(),
  maxDischargeCurrentA: z.number(),
  minTemperatureC: z.number(),
  maxTemperatureC: z.number(),
  roundTripEfficiency: z.number().gt(0).lte(1),
  socMin: z.number().min(0).max(1).default(0.10),
  socMax: z.number().min(0).max(1).default(0.90),
  socInitial: z.number().min(0).max(1).default(0.50),
  sohInitial: z.number().min(0).max(1).default(1.00),
  nominalGridFrequencyHz: z.number().default(50.0),
  frequencyDeadbandHz: z.number().default(0.05),
  droopGainKwPerHz: z.number().default(50.0),
  degradationCoefficient: z.number().default(0.0001),
});

export const BessAssetSchema = BessAssetBaseSchema.refine(data => data.usableEnergyKwh <= data.ratedEnergyKwh, {
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

export const UpdateBessAssetSchema = BessAssetBaseSchema.partial();
