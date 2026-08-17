import { BessService } from '../services/bess.service';
import { TelemetryRepository } from '../repositories/telemetry.repository';
import { StateService } from '../services/state.service';
import { ForecastService } from '../services/forecast.service';
import { DecisionService } from '../services/decision.service';
import { EngineService } from '../services/engine.service';
import { TelemetrySample, BatteryState } from 'shared';
import { EngineInput } from '../schemas/engine.schema';
import { supabase } from '../plugins/supabase';

const bessService = new BessService();
const telemetryRepository = new TelemetryRepository();
const stateService = new StateService();
const forecastService = new ForecastService();
const decisionService = new DecisionService();
const engineService = new EngineService();

export async function runAnalysisJob(
  bessId: string,
  currentTelemetry: TelemetrySample
): Promise<any> {
  console.log(`[Job Orchestrator] Starting analysis job for BESS: ${bessId}...`);

  try {
    // 1. Fetch BESS physical config (owner ID check bypassed for internal write)
    // To get the asset, we can list assets and select, or query directly.
    // The asset config contains RLS owner parameters. We retrieve using service role.
    const { data: dbAsset, error: assetErr } = await supabase
      .from('bess_assets')
      .select()
      .eq('id', bessId)
      .single();

    if (assetErr || !dbAsset) {
      throw new Error(`Asset not found: ${assetErr?.message || 'BESS ID does not exist'}`);
    }

    // 2. Fetch latest previous state
    const previousState = await stateService.getLatestState(bessId);

    // 3. Fetch recent historical telemetry window (for forecasting)
    // We want the last 60 samples to construct the Vandermonde matrix
    const historyTelemetry = await telemetryRepository.list(bessId, { limit: 60 });
    
    // Remove the current sample if it was fetched in the list
    const filteredHistory = historyTelemetry.filter(
      h => h.recordedAt !== currentTelemetry.recordedAt
    );

    // 4. Calculate delta time (in hours) since the previous telemetry sample
    let deltaTimeHours = 5.0 / 3600.0; // default 5 seconds
    if (filteredHistory.length > 0) {
      const prevTime = new Date(filteredHistory[filteredHistory.length - 1].recordedAt).getTime();
      const currTime = new Date(currentTelemetry.recordedAt).getTime();
      const diffMs = currTime - prevTime;
      if (diffMs > 0) {
        deltaTimeHours = diffMs / (1000.0 * 60.0 * 60.0);
      }
    }

    // 5. Build previousState model for C++ (using standard defaults if first run)
    const prevModel = {
      soc: previousState?.soc ?? dbAsset.soc_initial ?? 0.50,
      soh: previousState?.soh ?? dbAsset.soh_initial ?? 1.00,
      efc: previousState?.efc ?? 0.0,
      internalResistanceOhm: previousState?.internalResistanceOhm ?? 0.015,
      usableCapacityKwh: previousState?.usableCapacityKwh ?? dbAsset.usable_energy_kwh,
      availableEnergyKwh: previousState?.availableEnergyKwh ?? 225.0,
      chargePowerAvailableKw: previousState?.chargePowerAvailableKw ?? dbAsset.max_charge_power_kw,
      dischargePowerAvailableKw: previousState?.dischargePowerAvailableKw ?? dbAsset.max_discharge_power_kw,
      cumulativeEnergyThroughputKwh: previousState?.cumulativeEnergyThroughputKwh ?? 0.0,
    };

    // 6. Build normalized history time inputs (x = 0, 1, 2, ..., N-1)
    const historyInputs = filteredHistory.map((item, idx) => ({
      t: idx,
      gridFrequencyHz: item.gridFrequencyHz,
      renewablePowerKw: item.renewablePowerKw || 0.0,
      loadPowerKw: item.loadPowerKw || 0.0,
    }));

    // 7. Format input for C++ engine execution
    const engineInput: EngineInput = {
      operation: 'analyze',
      version: '1',
      asset: {
        ratedEnergyKwh: dbAsset.rated_energy_kwh,
        usableEnergyKwh: dbAsset.usable_energy_kwh,
        ratedPowerKw: dbAsset.rated_power_kw,
        maxChargePowerKw: dbAsset.max_charge_power_kw,
        maxDischargePowerKw: dbAsset.max_discharge_power_kw,
        nominalVoltageV: dbAsset.nominal_voltage_v,
        minVoltageV: dbAsset.min_voltage_v,
        maxVoltageV: dbAsset.max_voltage_v,
        maxChargeCurrentA: dbAsset.max_charge_current_a,
        maxDischargeCurrentA: dbAsset.max_discharge_current_a,
        minTemperatureC: dbAsset.min_temperature_c,
        maxTemperatureC: dbAsset.max_temperature_c,
        roundTripEfficiency: dbAsset.round_trip_efficiency,
        socMin: dbAsset.soc_min,
        socMax: dbAsset.soc_max,
        nominalGridFrequencyHz: dbAsset.nominal_grid_frequency_hz,
        frequencyDeadbandHz: dbAsset.frequency_deadband_hz,
        droopGainKwPerHz: dbAsset.droop_gain_kw_per_hz,
        degradationCoefficient: dbAsset.degradation_coefficient,
      },
      previousState: prevModel,
      telemetry: {
        recordedAt: currentTelemetry.recordedAt,
        batteryVoltageV: currentTelemetry.batteryVoltageV,
        batteryCurrentA: currentTelemetry.batteryCurrentA,
        batteryPowerKw: currentTelemetry.batteryPowerKw || 0.0,
        batteryTemperatureC: currentTelemetry.batteryTemperatureC,
        gridFrequencyHz: currentTelemetry.gridFrequencyHz,
        gridVoltageV: currentTelemetry.gridVoltageV || 415.0,
        renewablePowerKw: currentTelemetry.renewablePowerKw || 0.0,
        loadPowerKw: currentTelemetry.loadPowerKw || 0.0,
        deltaTimeHours,
      },
      history: historyInputs,
      forecast: {
        enabled: filteredHistory.length >= 5, // Enable forecasting only when history exists
        maxDegree: 3,
        tolerance: 0.01,
        horizonSteps: 12,
        stepSeconds: 300, // 5 min steps
      },
    };

    // 8. Execute C++ engine process
    const result = await engineService.runEngine(engineInput);

    // 9. Persist battery state
    const newState = await stateService.saveState(bessId, currentTelemetry.id!, {
      calculatedAt: currentTelemetry.recordedAt,
      soc: result.state!.soc,
      soh: result.state!.soh,
      efc: result.state!.efc,
      internalResistanceOhm: result.state!.internalResistanceOhm,
      usableCapacityKwh: result.state!.usableCapacityKwh,
      availableEnergyKwh: result.state!.availableEnergyKwh,
      chargePowerAvailableKw: result.state!.chargePowerAvailableKw,
      dischargePowerAvailableKw: result.state!.dischargePowerAvailableKw,
      cumulativeEnergyThroughputKwh: result.state!.cumulativeEnergyThroughputKwh,
      calculationVersion: 'poly-qr-v1',
    });

    // 10. Persist forecasts & points if generated
    if (result.forecasts) {
      for (const targetName of Object.keys(result.forecasts)) {
        const fc = result.forecasts[targetName];
        
        // Generate timestamps for forecast points
        const points = fc.values.map((val, stepIdx) => {
          const predictedAt = new Date(
            new Date(currentTelemetry.recordedAt).getTime() + (stepIdx + 1) * 5 * 60 * 1000
          ).toISOString();
          return { predictedAt, predictedValue: val };
        });

        await forecastService.saveForecast(bessId, {
          target: targetName as any,
          generatedAt: currentTelemetry.recordedAt,
          horizonMinutes: 60,
          stepMinutes: 5,
          polynomialDegree: fc.degree,
          residualNorm: fc.residualNorm,
          modelVersion: 'poly-qr-v1',
        }, points);
      }
    }

    // 11. Persist Dispatch Decision
    const decision = await decisionService.saveDecision(bessId, newState.id!, {
      decidedAt: currentTelemetry.recordedAt,
      action: result.decision!.action,
      targetPowerKw: result.decision!.targetPowerKw,
      energyBalanceKw: result.grid!.energyBalanceKw,
      frequencyDeviationHz: result.grid!.frequencyDeviationHz,
      score: result.decision!.score,
      reasonCode: result.decision!.reasonCode,
      reasonText: result.decision!.reasonText,
      constraints: result.decision!.constraints,
      inputs: {
        renewablePowerKw: currentTelemetry.renewablePowerKw,
        loadPowerKw: currentTelemetry.loadPowerKw,
        gridFrequencyHz: currentTelemetry.gridFrequencyHz,
      },
      engineVersion: 'poly-qr-v1',
    });

    console.log(`[Job Orchestrator] Job completed successfully for BESS ${bessId}. Action: ${decision.action}`);

    return {
      success: true,
      newState,
      decision,
    };
  } catch (err: any) {
    console.error(`[Job Orchestrator] Error executing analysis job for BESS ${bessId}:`, err.message);
    throw err;
  }
}
export default runAnalysisJob;
