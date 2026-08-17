import { z } from 'zod';

export const BessAssetConfigSchema = z.object({
  ratedEnergyKwh: z.number(),
  usableEnergyKwh: z.number(),
  ratedPowerKw: z.number(),
  maxChargePowerKw: z.number(),
  maxDischargePowerKw: z.number(),
  nominalVoltageV: z.number(),
  minVoltageV: z.number(),
  maxVoltageV: z.number(),
  maxChargeCurrentA: z.number(),
  maxDischargeCurrentA: z.number(),
  minTemperatureC: z.number(),
  maxTemperatureC: z.number(),
  roundTripEfficiency: z.number(),
  socMin: z.number(),
  socMax: z.number(),
  nominalGridFrequencyHz: z.number(),
  frequencyDeadbandHz: z.number(),
  droopGainKwPerHz: z.number(),
  degradationCoefficient: z.number(),
});

export const BatteryStateModelSchema = z.object({
  soc: z.number().min(0).max(1),
  soh: z.number().min(0).max(1),
  efc: z.number(),
  internalResistanceOhm: z.number().nullable().optional(),
  usableCapacityKwh: z.number(),
  availableEnergyKwh: z.number(),
  chargePowerAvailableKw: z.number(),
  dischargePowerAvailableKw: z.number(),
  cumulativeEnergyThroughputKwh: z.number(),
});

export const TelemetrySampleModelSchema = z.object({
  recordedAt: z.string(),
  batteryVoltageV: z.number(),
  batteryCurrentA: z.number(),
  batteryPowerKw: z.number(),
  batteryTemperatureC: z.number(),
  gridFrequencyHz: z.number(),
  gridVoltageV: z.number().nullable().optional(),
  renewablePowerKw: z.number().nullable().optional(),
  loadPowerKw: z.number().nullable().optional(),
  deltaTimeHours: z.number(),
});

export const HistoricalSampleSchema = z.object({
  t: z.number(),
  gridFrequencyHz: z.number(),
  renewablePowerKw: z.number(),
  loadPowerKw: z.number(),
});

export const ForecastConfigSchema = z.object({
  enabled: z.boolean(),
  maxDegree: z.number().int().min(1).max(5),
  tolerance: z.number(),
  horizonSteps: z.number().int().positive(),
  stepSeconds: z.number().int().positive(),
});

export const EngineInputSchema = z.object({
  operation: z.string().default('analyze'),
  version: z.string().default('1'),
  asset: BessAssetConfigSchema,
  previousState: BatteryStateModelSchema,
  telemetry: TelemetrySampleModelSchema,
  history: z.array(HistoricalSampleSchema),
  forecast: ForecastConfigSchema,
});

export const SingleForecastResultSchema = z.object({
  degree: z.number().int(),
  residualNorm: z.number(),
  values: z.array(z.number()),
});

export const GridAnalysisResultSchema = z.object({
  energyBalanceKw: z.number(),
  frequencyDeviationHz: z.number(),
  frequencySupportRequestKw: z.number(),
});

export const DecisionResultSchema = z.object({
  action: z.enum(['CHARGE', 'DISCHARGE', 'HOLD', 'FREQUENCY_SUPPORT']),
  targetPowerKw: z.number(),
  score: z.number(),
  reasonCode: z.string(),
  reasonText: z.string(),
  constraints: z.object({
    socAllowed: z.boolean(),
    temperatureAllowed: z.boolean(),
    voltageAllowed: z.boolean(),
    powerClipped: z.boolean(),
  }),
});

export const EngineOutputSchema = z.object({
  ok: z.boolean(),
  errorMessage: z.string().optional().nullable(),
  state: BatteryStateModelSchema.optional(),
  grid: GridAnalysisResultSchema.optional(),
  forecasts: z.record(SingleForecastResultSchema).optional(),
  decision: DecisionResultSchema.optional(),
});

export type EngineInput = z.infer<typeof EngineInputSchema>;
export type EngineOutput = z.infer<typeof EngineOutputSchema>;
