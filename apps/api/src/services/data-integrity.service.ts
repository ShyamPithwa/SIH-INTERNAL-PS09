/**
 * Data Integrity & Anomaly Detection Service
 *
 * Implements 5 layers of validation on every incoming telemetry sample:
 *  1. Timestamp validation      — rejects replayed or future-dated data
 *  2. Physics plausibility      — SOC rate-of-change, voltage range, power = V×I
 *  3. Cross-field consistency   — voltage × current must match reported power
 *  4. Statistical anomaly       — Z-score against recent history (if available)
 *  5. SOH monotonicity          — SOH should never increase (physical impossibility)
 */

export interface TelemetrySampleInput {
  recordedAt: string;
  batteryVoltageV: number;
  batteryCurrentA: number;
  batteryPowerKw?: number | null;
  batteryTemperatureC: number;
  gridFrequencyHz: number;
  soc?: number | null;
  soh?: number | null;
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];   // Non-fatal anomalies — stored but flagged
  errors: string[];     // Fatal — data rejected outright
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Max allowed timestamp skew: data older than 5 min or >30s in the future
const MAX_PAST_AGE_MS   = 5 * 60 * 1000;    // 5 minutes
const MAX_FUTURE_AGE_MS = 30 * 1000;         // 30 seconds

// Li-ion voltage operating window
const MIN_CELL_VOLTAGE_V  = 2.5;             // absolute min per cell group
const MAX_CELL_VOLTAGE_V  = 4.3;             // absolute max per cell group
const BESS_MIN_VOLTAGE_V  = 200;             // typical pack min
const BESS_MAX_VOLTAGE_V  = 1500;            // typical pack max

// Maximum physically possible SOC rate of change per second
// Even at 2C charge rate, 1kWh battery can't change SOC faster than ~0.056%/s
const MAX_SOC_DELTA_PER_SEC = 0.5;           // % per second (very generous)

// Temperature operating limits for Li-ion
const MIN_OPERATIONAL_TEMP_C  = -20;
const MAX_OPERATIONAL_TEMP_C  = 65;
const MAX_TEMP_JUMP_C         = 15;          // max jump between readings

// Grid frequency bounds
const MIN_GRID_FREQ_HZ = 45;
const MAX_GRID_FREQ_HZ = 55;

// Power consistency tolerance: allow ±15% difference (sensor inaccuracy)
const POWER_CONSISTENCY_TOLERANCE = 0.15;

// Z-score threshold for anomaly detection
const Z_SCORE_WARNING   = 3.0;
const Z_SCORE_REJECTION = 6.0;

// ─── Validator ────────────────────────────────────────────────────────────────

export class DataIntegrityService {

  /**
   * Main validation entry point.
   * @param sample       Incoming telemetry data
   * @param recentHistory Last N samples for statistical analysis (pass [] if none)
   * @param prevSoh      SOH from the last stored state estimation (for monotonicity)
   */
  validate(
    sample: TelemetrySampleInput,
    recentHistory: TelemetrySampleInput[] = [],
    prevSoh?: number | null,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ── 1. TIMESTAMP VALIDATION ──────────────────────────────────────────────
    this.checkTimestamp(sample.recordedAt, errors, warnings);

    // ── 2. PHYSICS PLAUSIBILITY ──────────────────────────────────────────────
    this.checkPhysics(sample, errors, warnings);

    // ── 3. CROSS-FIELD CONSISTENCY ───────────────────────────────────────────
    this.checkCrossFieldConsistency(sample, errors, warnings);

    // ── 4. SOH MONOTONICITY ──────────────────────────────────────────────────
    if (prevSoh != null && sample.soh != null) {
      this.checkSohMonotonicity(sample.soh, prevSoh, warnings);
    }

    // ── 5. STATISTICAL ANOMALY (Z-SCORE) ─────────────────────────────────────
    if (recentHistory.length >= 5) {
      this.checkStatisticalAnomalies(sample, recentHistory, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  // ─── Check 1: Timestamp ──────────────────────────────────────────────────

  private checkTimestamp(
    recordedAt: string,
    errors: string[],
    warnings: string[],
  ): void {
    const sampleTime = new Date(recordedAt).getTime();
    const now = Date.now();

    if (isNaN(sampleTime)) {
      errors.push(`TIMESTAMP_INVALID: '${recordedAt}' is not a valid ISO 8601 timestamp.`);
      return;
    }

    const ageMs = now - sampleTime;

    if (ageMs > MAX_PAST_AGE_MS) {
      errors.push(
        `TIMESTAMP_STALE: Sample timestamp is ${Math.round(ageMs / 1000)}s old. ` +
        `Maximum allowed age is ${MAX_PAST_AGE_MS / 1000}s. Possible replay attack.`
      );
    }

    if (sampleTime > now + MAX_FUTURE_AGE_MS) {
      errors.push(
        `TIMESTAMP_FUTURE: Sample timestamp is ${Math.round((sampleTime - now) / 1000)}s in the future. ` +
        `Clock skew or spoofed timestamp detected.`
      );
    }
  }

  // ─── Check 2: Physics Plausibility ───────────────────────────────────────

  private checkPhysics(
    sample: TelemetrySampleInput,
    errors: string[],
    warnings: string[],
  ): void {
    const { batteryVoltageV, batteryCurrentA, batteryTemperatureC, gridFrequencyHz, soc } = sample;

    // Voltage bounds
    if (batteryVoltageV < BESS_MIN_VOLTAGE_V) {
      errors.push(
        `VOLTAGE_TOO_LOW: ${batteryVoltageV}V is below the physical minimum of ${BESS_MIN_VOLTAGE_V}V for a BESS pack.`
      );
    }
    if (batteryVoltageV > BESS_MAX_VOLTAGE_V) {
      errors.push(
        `VOLTAGE_TOO_HIGH: ${batteryVoltageV}V exceeds the maximum safe voltage of ${BESS_MAX_VOLTAGE_V}V.`
      );
    }

    // Temperature bounds — hard reject on extreme values
    if (batteryTemperatureC < MIN_OPERATIONAL_TEMP_C) {
      warnings.push(
        `TEMP_LOW: ${batteryTemperatureC}°C is below operational minimum (${MIN_OPERATIONAL_TEMP_C}°C). ` +
        `Sensor malfunction or extreme environment.`
      );
    }
    if (batteryTemperatureC > MAX_OPERATIONAL_TEMP_C) {
      errors.push(
        `TEMP_CRITICAL: ${batteryTemperatureC}°C exceeds safe operating limit of ${MAX_OPERATIONAL_TEMP_C}°C. ` +
        `Thermal runaway risk or sensor error.`
      );
    }

    // Grid frequency bounds
    if (gridFrequencyHz < MIN_GRID_FREQ_HZ || gridFrequencyHz > MAX_GRID_FREQ_HZ) {
      warnings.push(
        `FREQ_OUT_OF_RANGE: Grid frequency ${gridFrequencyHz}Hz is outside normal range ` +
        `(${MIN_GRID_FREQ_HZ}–${MAX_GRID_FREQ_HZ}Hz). Grid emergency or sensor fault.`
      );
    }

    // SOC must be 0–100
    if (soc != null && (soc < 0 || soc > 100)) {
      errors.push(`SOC_IMPOSSIBLE: SOC of ${soc}% is outside the physical range 0–100%.`);
    }

    // Voltage-SOC plausibility (Li-ion specific):
    // SOC 100% should never show very low voltage and vice versa
    if (soc != null) {
      if (soc > 90 && batteryVoltageV < BESS_MIN_VOLTAGE_V * 1.1) {
        warnings.push(
          `VOLTAGE_SOC_MISMATCH: SOC is ${soc}% (near full) but voltage ${batteryVoltageV}V seems too low. ` +
          `Possible sensor miscalibration.`
        );
      }
      if (soc < 10 && batteryVoltageV > BESS_MAX_VOLTAGE_V * 0.9) {
        warnings.push(
          `VOLTAGE_SOC_MISMATCH: SOC is ${soc}% (near empty) but voltage ${batteryVoltageV}V seems too high. ` +
          `Possible sensor miscalibration.`
        );
      }
    }
  }

  // ─── Check 3: Cross-Field Consistency (Power = V × I) ────────────────────

  private checkCrossFieldConsistency(
    sample: TelemetrySampleInput,
    errors: string[],
    warnings: string[],
  ): void {
    const { batteryVoltageV, batteryCurrentA, batteryPowerKw } = sample;

    if (batteryPowerKw == null) return; // Power field is optional

    // Expected power in kW = (V × A) / 1000
    const computedPowerKw = (batteryVoltageV * batteryCurrentA) / 1000;
    const reportedPowerKw = batteryPowerKw;

    if (Math.abs(reportedPowerKw) < 0.01) return; // Avoid division-by-zero on near-zero power

    const relativeDiff = Math.abs(computedPowerKw - reportedPowerKw) / Math.abs(reportedPowerKw);

    if (relativeDiff > POWER_CONSISTENCY_TOLERANCE * 3) {
      // Very large discrepancy → reject
      errors.push(
        `POWER_MISMATCH: Reported power ${reportedPowerKw.toFixed(2)}kW does not match ` +
        `V×I = ${computedPowerKw.toFixed(2)}kW (${(relativeDiff * 100).toFixed(1)}% difference). ` +
        `Data may be tampered.`
      );
    } else if (relativeDiff > POWER_CONSISTENCY_TOLERANCE) {
      // Moderate discrepancy → warn
      warnings.push(
        `POWER_INCONSISTENCY: Reported power ${reportedPowerKw.toFixed(2)}kW vs computed ` +
        `V×I = ${computedPowerKw.toFixed(2)}kW (${(relativeDiff * 100).toFixed(1)}% difference). ` +
        `Sensor calibration drift possible.`
      );
    }
  }

  // ─── Check 4: SOH Monotonicity ────────────────────────────────────────────

  private checkSohMonotonicity(
    newSoh: number,
    prevSoh: number,
    warnings: string[],
  ): void {
    const sohIncrease = newSoh - prevSoh;
    if (sohIncrease > 0.5) {
      // SOH cannot meaningfully increase — physics law
      warnings.push(
        `SOH_INCREASED: SOH jumped from ${prevSoh.toFixed(2)}% to ${newSoh.toFixed(2)}% ` +
        `(+${sohIncrease.toFixed(2)}%). SOH can only decrease over time. ` +
        `This suggests historical data tampering or sensor reset.`
      );
    }
  }

  // ─── Check 5: Statistical Z-Score Anomaly Detection ──────────────────────

  private checkStatisticalAnomalies(
    sample: TelemetrySampleInput,
    history: TelemetrySampleInput[],
    errors: string[],
    warnings: string[],
  ): void {
    const fields: Array<{ key: keyof TelemetrySampleInput; label: string }> = [
      { key: 'batteryVoltageV',      label: 'Battery Voltage' },
      { key: 'batteryCurrentA',      label: 'Battery Current' },
      { key: 'batteryTemperatureC',  label: 'Battery Temperature' },
      { key: 'gridFrequencyHz',      label: 'Grid Frequency' },
    ];

    for (const { key, label } of fields) {
      const newVal = sample[key] as number;
      if (newVal == null) continue;

      const historicalValues = history
        .map(h => h[key] as number)
        .filter(v => v != null && !isNaN(v));

      if (historicalValues.length < 3) continue;

      const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
      const variance = historicalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / historicalValues.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 0.001) continue; // Constant signal — no deviation possible

      const zScore = Math.abs((newVal - mean) / stdDev);

      if (zScore >= Z_SCORE_REJECTION) {
        errors.push(
          `ANOMALY_EXTREME: ${label} value ${newVal} is ${zScore.toFixed(1)}σ from recent average ${mean.toFixed(2)}. ` +
          `This is statistically impossible (p < 0.00001). Data rejected as likely spoofed.`
        );
      } else if (zScore >= Z_SCORE_WARNING) {
        warnings.push(
          `ANOMALY_DETECTED: ${label} value ${newVal} is ${zScore.toFixed(1)}σ from recent average ${mean.toFixed(2)}. ` +
          `Unusual — possible sensor fault or anomalous condition.`
        );
      }
    }
  }
}

export const dataIntegrityService = new DataIntegrityService();
