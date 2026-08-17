#pragma once
#ifndef PERFORMANCE_ESTIMATION_H
#define PERFORMANCE_ESTIMATION_H

#include "domain.h"

void estimatePerformance(
    const BessAssetConfig& config,
    BatteryStateModel& state,
    double temperature
);

#endif
