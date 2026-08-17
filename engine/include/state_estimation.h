#pragma once
#ifndef STATE_ESTIMATION_H
#define STATE_ESTIMATION_H

#include "domain.h"

BatteryStateModel estimateState(
    const BessAssetConfig& config,
    const BatteryStateModel& previousState,
    const TelemetrySampleModel& telemetry,
    double deltaTimeHours,
    double deltaVoltage,
    double deltaCurrent
);

#endif
