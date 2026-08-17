#pragma once
#ifndef GRID_ANALYSIS_H
#define GRID_ANALYSIS_H

#include "domain.h"

GridAnalysisResult analyzeGrid(
    const BessAssetConfig& config,
    const TelemetrySampleModel& telemetry
);

#endif
