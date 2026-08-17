#include "grid_analysis.h"
#include <cmath>

GridAnalysisResult analyzeGrid(
    const BessAssetConfig& config,
    const TelemetrySampleModel& telemetry
) {
    GridAnalysisResult result;
    
    // 1. Renewable-load balance
    result.energyBalanceKw = telemetry.renewablePowerKw - telemetry.loadPowerKw;

    // 2. Frequency deviation and droop response calculation
    result.frequencyDeviationHz = telemetry.gridFrequencyHz - config.nominalGridFrequencyHz;

    if (std::abs(result.frequencyDeviationHz) <= config.frequencyDeadbandHz) {
        result.frequencySupportRequestKw = 0.0;
    } else {
        // Droop control formula: P_support = -K * deltaF
        // e.g. low frequency -> deltaF < 0 -> P_support > 0 (discharge)
        // high frequency -> deltaF > 0 -> P_support < 0 (charge)
        result.frequencySupportRequestKw = -config.droopGainKwPerHz * result.frequencyDeviationHz;
    }

    return result;
}
