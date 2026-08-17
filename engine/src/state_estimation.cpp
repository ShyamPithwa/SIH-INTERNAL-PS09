#include "state_estimation.h"
#include <cmath>
#include <algorithm>

BatteryStateModel estimateState(
    const BessAssetConfig& config,
    const BatteryStateModel& previousState,
    const TelemetrySampleModel& telemetry,
    double deltaTimeHours,
    double deltaVoltage,
    double deltaCurrent
) {
    BatteryStateModel newState = previousState;

    // 1. Coulomb counting SOC
    double C_Ah = (config.ratedEnergyKwh * 1000.0) / config.nominalVoltageV;
    
    // directional efficiency
    double eta = 1.0;
    if (telemetry.batteryCurrentA < 0) { // Charging
        eta = std::sqrt(config.roundTripEfficiency);
    } else if (telemetry.batteryCurrentA > 0) { // Discharging
        eta = 1.0 / std::sqrt(config.roundTripEfficiency);
    }

    double deltaSOC = -(telemetry.batteryCurrentA * deltaTimeHours * eta) / C_Ah;
    newState.soc = std::max(0.0, std::min(1.0, previousState.soc + deltaSOC));

    // 2. Cumulative throughput
    double powerKw = telemetry.batteryPowerKw;
    if (std::abs(powerKw) < 1e-6) {
        powerKw = (telemetry.batteryVoltageV * telemetry.batteryCurrentA) / 1000.0;
    }
    double throughputIncrementKwh = std::abs(powerKw) * deltaTimeHours;
    newState.cumulativeEnergyThroughputKwh = previousState.cumulativeEnergyThroughputKwh + throughputIncrementKwh;

    // 3. Equivalent Full Cycles (EFC)
    newState.efc = newState.cumulativeEnergyThroughputKwh / (2.0 * config.ratedEnergyKwh);

    // 4. State of Health (SOH)
    newState.soh = std::max(0.0, std::min(1.0, 1.0 - config.degradationCoefficient * newState.efc));

    // 5. Usable capacity current
    newState.usableCapacityKwh = config.usableEnergyKwh * newState.soh;

    // 6. Available energy (above SOC_min)
    newState.availableEnergyKwh = std::max(0.0, (newState.soc - config.socMin) * newState.usableCapacityKwh);

    // 7. Internal resistance estimation
    if (std::abs(deltaCurrent) > 5.0) {
        double r_est = std::abs(deltaVoltage / deltaCurrent);
        if (r_est > 0.001 && r_est < 2.0) {
            if (previousState.internalResistanceOhm > 0.0) {
                newState.internalResistanceOhm = 0.95 * previousState.internalResistanceOhm + 0.05 * r_est;
            } else {
                newState.internalResistanceOhm = r_est;
            }
        }
    }
    
    if (newState.internalResistanceOhm <= 0.0) {
        newState.internalResistanceOhm = 0.015; // standard default
    }

    return newState;
}
