export interface BessAsset {
  id: string;
  ownerId: string;
  bessCode: string;
  manufacturer: string | null;
  model: string | null;
  batteryChemistry: string | null;
  moduleCount: number | null;
  cellsPerModule: number | null;
  ratedEnergyKwh: number;
  usableEnergyKwh: number;
  ratedPowerKw: number;
  maxChargePowerKw: number;
  maxDischargePowerKw: number;
  nominalVoltageV: number;
  minVoltageV: number;
  maxVoltageV: number;
  maxChargeCurrentA: number;
  maxDischargeCurrentA: number;
  minTemperatureC: number;
  maxTemperatureC: number;
  roundTripEfficiency: number;
  socMin: number;
  socMax: number;
  socInitial: number;
  sohInitial: number;
  nominalGridFrequencyHz: number;
  frequencyDeadbandHz: number;
  droopGainKwPerHz: number;
  degradationCoefficient: number;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetrySample {
  id?: number;
  bessId: string;
  recordedAt: string;
  batteryVoltageV: number;
  batteryCurrentA: number;
  batteryPowerKw: number | null;
  batteryTemperatureC: number;
  gridFrequencyHz: number;
  gridVoltageV: number | null;
  renewablePowerKw: number | null;
  loadPowerKw: number | null;
  source: string;
  quality: string;
  createdAt?: string;
}

export interface BatteryState {
  id?: number;
  bessId: string;
  telemetryId: number | null;
  calculatedAt: string;
  soc: number;
  soh: number;
  efc: number;
  internalResistanceOhm: number | null;
  usableCapacityKwh: number;
  availableEnergyKwh: number;
  chargePowerAvailableKw: number;
  dischargePowerAvailableKw: number;
  cumulativeEnergyThroughputKwh: number;
  calculationVersion: string;
  createdAt?: string;
}

export interface Forecast {
  id: string;
  bessId: string;
  target: 'GRID_FREQUENCY' | 'RENEWABLE_POWER' | 'LOAD_POWER' | 'SOC';
  generatedAt: string;
  horizonMinutes: number;
  stepMinutes: number;
  polynomialDegree: number | null;
  residualNorm: number | null;
  inputWindowStart: string | null;
  inputWindowEnd: string | null;
  modelVersion: string;
  createdAt?: string;
}

export interface ForecastPoint {
  id?: number;
  forecastId: string;
  predictedAt: string;
  predictedValue: number;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface DispatchDecision {
  id: string;
  bessId: string;
  batteryStateId: number | null;
  decidedAt: string;
  action: 'CHARGE' | 'DISCHARGE' | 'HOLD' | 'FREQUENCY_SUPPORT';
  targetPowerKw: number;
  energyBalanceKw: number | null;
  frequencyDeviationHz: number | null;
  score: number | null;
  reasonCode: string;
  reasonText: string;
  constraints: Record<string, any>;
  inputs: Record<string, any>;
  engineVersion: string;
  createdAt?: string;
}
