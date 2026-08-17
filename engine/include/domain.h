#pragma once
#include <string>
#include <vector>
#include <map>

struct BessAssetConfig {
  double ratedEnergyKwh;
  double usableEnergyKwh;
  double ratedPowerKw;
  double maxChargePowerKw;
  double maxDischargePowerKw;
  double nominalVoltageV;
  double minVoltageV;
  double maxVoltageV;
  double maxChargeCurrentA;
  double maxDischargeCurrentA;
  double minTemperatureC;
  double maxTemperatureC;
  double roundTripEfficiency;
  double socMin;
  double socMax;
  double nominalGridFrequencyHz;
  double frequencyDeadbandHz;
  double droopGainKwPerHz;
  double degradationCoefficient;
};

struct BatteryStateModel {
  double soc;
  double soh;
  double efc;
  double internalResistanceOhm;
  double usableCapacityKwh;
  double availableEnergyKwh;
  double chargePowerAvailableKw;
  double dischargePowerAvailableKw;
  double cumulativeEnergyThroughputKwh;
};

struct TelemetrySampleModel {
  std::string recordedAt;
  double batteryVoltageV;
  double batteryCurrentA;
  double batteryPowerKw;
  double batteryTemperatureC;
  double gridFrequencyHz;
  double gridVoltageV;
  double renewablePowerKw;
  double loadPowerKw;
  double deltaTimeHours;
};

struct HistoricalSample {
  double t; // normalized time offset
  double gridFrequencyHz;
  double renewablePowerKw;
  double loadPowerKw;
};

struct ForecastConfig {
  bool enabled;
  int maxDegree;
  double tolerance;
  int horizonSteps;
  int stepSeconds;
};

struct SingleForecastResult {
  int degree;
  double residualNorm;
  std::vector<double> values;
};

struct GridAnalysisResult {
  double energyBalanceKw;
  double frequencyDeviationHz;
  double frequencySupportRequestKw;
};

struct ConstraintsStatus {
  bool socAllowed;
  bool temperatureAllowed;
  bool voltageAllowed;
  bool powerClipped;
};

struct DecisionResult {
  std::string action;
  double targetPowerKw;
  double score;
  std::string reasonCode;
  std::string reasonText;
  ConstraintsStatus constraints;
};

struct EngineInput {
  std::string operation;
  std::string version;
  BessAssetConfig asset;
  BatteryStateModel previousState;
  TelemetrySampleModel telemetry;
  std::vector<HistoricalSample> history;
  ForecastConfig forecast;
};

struct EngineOutput {
  bool ok;
  std::string errorMessage;
  BatteryStateModel state;
  GridAnalysisResult grid;
  std::map<std::string, SingleForecastResult> forecasts;
  DecisionResult decision;
};
