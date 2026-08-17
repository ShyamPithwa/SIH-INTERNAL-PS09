#pragma once
#ifndef DECISION_ENGINE_H
#define DECISION_ENGINE_H

#include "domain.h"

DecisionResult makeDecision(
    const BessAssetConfig& config,
    const BatteryStateModel& state,
    const TelemetrySampleModel& telemetry,
    const GridAnalysisResult& grid
);

#endif
