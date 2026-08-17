#include "performance_estimation.h"
#include <algorithm>

void estimatePerformance(
    const BessAssetConfig& config,
    BatteryStateModel& state,
    double temperature
) {
    // 1. Charge Power Capability
    double chargeLimit = config.maxChargePowerKw;

    // Current limit
    double currentLimitedCharge = (state.soc > 0.0) 
        ? (720.0 * config.maxChargeCurrentA / 1000.0) // nominal voltage fallback
        : 0.0;
    
    // SOC limits
    double socChargeLimit = config.maxChargePowerKw;
    if (state.soc >= config.socMax) {
        socChargeLimit = 0.0;
    } else if (state.soc > config.socMax - 0.05) {
        // Linearly derate in the last 5% SOC to prevent overshoot
        double factor = (config.socMax - state.soc) / 0.05;
        socChargeLimit = config.maxChargePowerKw * factor;
    }

    // Thermal limit with linear derating near boundaries
    double thermalChargeLimit = config.maxChargePowerKw;
    if (temperature <= config.minTemperatureC || temperature >= config.maxTemperatureC) {
        thermalChargeLimit = 0.0;
    } else if (temperature < config.minTemperatureC + 5.0) {
        double factor = (temperature - config.minTemperatureC) / 5.0;
        thermalChargeLimit = config.maxChargePowerKw * factor;
    } else if (temperature > config.maxTemperatureC - 5.0) {
        double factor = (config.maxTemperatureC - temperature) / 5.0;
        thermalChargeLimit = config.maxChargePowerKw * factor;
    }

    state.chargePowerAvailableKw = std::max(0.0, std::min({
        chargeLimit,
        currentLimitedCharge,
        socChargeLimit,
        thermalChargeLimit
    }));

    // 2. Discharge Power Capability
    double dischargeLimit = config.maxDischargePowerKw;

    // Current limit
    double currentLimitedDischarge = (720.0 * config.maxDischargeCurrentA / 1000.0);

    // SOC limits
    double socDischargeLimit = config.maxDischargePowerKw;
    if (state.soc <= config.socMin) {
        socDischargeLimit = 0.0;
    } else if (state.soc < config.socMin + 0.05) {
        // Linearly derate near empty
        double factor = (state.soc - config.socMin) / 0.05;
        socDischargeLimit = config.maxDischargePowerKw * factor;
    }

    // Thermal limits
    double thermalDischargeLimit = config.maxDischargePowerKw;
    if (temperature <= config.minTemperatureC || temperature >= config.maxTemperatureC) {
        thermalDischargeLimit = 0.0;
    } else if (temperature < config.minTemperatureC + 5.0) {
        double factor = (temperature - config.minTemperatureC) / 5.0;
        thermalDischargeLimit = config.maxDischargePowerKw * factor;
    } else if (temperature > config.maxTemperatureC - 5.0) {
        double factor = (config.maxTemperatureC - temperature) / 5.0;
        thermalDischargeLimit = config.maxDischargePowerKw * factor;
    }

    state.dischargePowerAvailableKw = std::max(0.0, std::min({
        dischargeLimit,
        currentLimitedDischarge,
        socDischargeLimit,
        thermalDischargeLimit
    }));
}
