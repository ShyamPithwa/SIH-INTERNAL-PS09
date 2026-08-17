import { z } from 'zod';

export const TelemetrySampleSchema = z.object({
  recordedAt: z.string().datetime({ message: 'recordedAt must be a valid ISO 8601 timestamp' }),
  batteryVoltageV: z.number().positive('batteryVoltageV must be positive'),
  batteryCurrentA: z.number(),
  batteryPowerKw: z.number().optional().nullable(),
  batteryTemperatureC: z.number().min(-50, 'Temperature is physically absurd').max(150, 'Temperature is physically absurd'),
  gridFrequencyHz: z.number().positive('gridFrequencyHz must be positive'),
  gridVoltageV: z.number().positive('gridVoltageV must be positive').optional().nullable(),
  renewablePowerKw: z.number().min(0, 'renewablePowerKw cannot be negative').optional().nullable(),
  loadPowerKw: z.number().min(0, 'loadPowerKw cannot be negative').optional().nullable(),
  source: z.string().default('api'),
  quality: z.string().default('GOOD'),
});

export const TelemetryBatchSchema = z.object({
  samples: z.array(TelemetrySampleSchema).min(1, 'At least one telemetry sample is required'),
});
