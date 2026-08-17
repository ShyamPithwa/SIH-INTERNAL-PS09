#include "json_io.h"
#include <nlohmann/json.hpp>
#include <iostream>

using json = nlohmann::json;

EngineInput parseInputJson(const std::string& jsonStr) {
    auto j = json::parse(jsonStr);
    EngineInput input;

    input.operation = j.value("operation", "analyze");
    input.version = j.value("version", "1");

    // Parse Asset Config
    auto jAsset = j["asset"];
    input.asset.ratedEnergyKwh = jAsset.value("ratedEnergyKwh", 500.0);
    input.asset.usableEnergyKwh = jAsset.value("usableEnergyKwh", 450.0);
    input.asset.ratedPowerKw = jAsset.value("ratedPowerKw", 250.0);
    input.asset.maxChargePowerKw = jAsset.value("maxChargePowerKw", 200.0);
    input.asset.maxDischargePowerKw = jAsset.value("maxDischargePowerKw", 200.0);
    input.asset.nominalVoltageV = jAsset.value("nominalVoltageV", 720.0);
    input.asset.minVoltageV = jAsset.value("minVoltageV", 620.0);
    input.asset.maxVoltageV = jAsset.value("maxVoltageV", 820.0);
    input.asset.maxChargeCurrentA = jAsset.value("maxChargeCurrentA", 300.0);
    input.asset.maxDischargeCurrentA = jAsset.value("maxDischargeCurrentA", 300.0);
    input.asset.minTemperatureC = jAsset.value("minTemperatureC", 0.0);
    input.asset.maxTemperatureC = jAsset.value("maxTemperatureC", 50.0);
    input.asset.roundTripEfficiency = jAsset.value("roundTripEfficiency", 0.92);
    input.asset.socMin = jAsset.value("socMin", 0.10);
    input.asset.socMax = jAsset.value("socMax", 0.90);
    input.asset.nominalGridFrequencyHz = jAsset.value("nominalGridFrequencyHz", 50.0);
    input.asset.frequencyDeadbandHz = jAsset.value("frequencyDeadbandHz", 0.05);
    input.asset.droopGainKwPerHz = jAsset.value("droopGainKwPerHz", 100.0);
    input.asset.degradationCoefficient = jAsset.value("degradationCoefficient", 0.0001);

    // Parse Previous State
    if (j.contains("previousState") && !j["previousState"].is_null()) {
        auto jState = j["previousState"];
        input.previousState.soc = jState.value("soc", 0.50);
        input.previousState.soh = jState.value("soh", 1.00);
        input.previousState.efc = jState.value("efc", 0.0);
        input.previousState.internalResistanceOhm = jState.value("internalResistanceOhm", 0.015);
        input.previousState.usableCapacityKwh = jState.value("usableCapacityKwh", input.asset.usableEnergyKwh);
        input.previousState.availableEnergyKwh = jState.value("availableEnergyKwh", 225.0);
        input.previousState.chargePowerAvailableKw = jState.value("chargePowerAvailableKw", input.asset.maxChargePowerKw);
        input.previousState.dischargePowerAvailableKw = jState.value("dischargePowerAvailableKw", input.asset.maxDischargePowerKw);
        input.previousState.cumulativeEnergyThroughputKwh = jState.value("cumulativeEnergyThroughputKwh", 0.0);
    } else {
        // Defaults
        input.previousState.soc = 0.50;
        input.previousState.soh = 1.00;
        input.previousState.efc = 0.0;
        input.previousState.internalResistanceOhm = 0.015;
        input.previousState.usableCapacityKwh = input.asset.usableEnergyKwh;
        input.previousState.availableEnergyKwh = 225.0;
        input.previousState.chargePowerAvailableKw = input.asset.maxChargePowerKw;
        input.previousState.dischargePowerAvailableKw = input.asset.maxDischargePowerKw;
        input.previousState.cumulativeEnergyThroughputKwh = 0.0;
    }

    // Parse Telemetry
    auto jTelem = j["telemetry"];
    input.telemetry.recordedAt = jTelem.value("recordedAt", "");
    input.telemetry.batteryVoltageV = jTelem.value("batteryVoltageV", 720.0);
    input.telemetry.batteryCurrentA = jTelem.value("batteryCurrentA", 0.0);
    input.telemetry.batteryPowerKw = jTelem.value("batteryPowerKw", 0.0);
    input.telemetry.batteryTemperatureC = jTelem.value("batteryTemperatureC", 25.0);
    input.telemetry.gridFrequencyHz = jTelem.value("gridFrequencyHz", 50.0);
    input.telemetry.gridVoltageV = jTelem.value("gridVoltageV", 415.0);
    input.telemetry.renewablePowerKw = jTelem.value("renewablePowerKw", 0.0);
    input.telemetry.loadPowerKw = jTelem.value("loadPowerKw", 0.0);
    input.telemetry.deltaTimeHours = jTelem.value("deltaTimeHours", 5.0 / 3600.0); // default to 5s in hours

    // Parse History
    if (j.contains("history") && j["history"].is_array()) {
        for (auto& item : j["history"]) {
            HistoricalSample sample;
            sample.t = item.value("t", 0.0);
            sample.gridFrequencyHz = item.value("gridFrequencyHz", 50.0);
            sample.renewablePowerKw = item.value("renewablePowerKw", 0.0);
            sample.loadPowerKw = item.value("loadPowerKw", 0.0);
            input.history.push_back(sample);
        }
    }

    // Parse Forecast Config
    if (j.contains("forecast") && !j["forecast"].is_null()) {
        auto jForecast = j["forecast"];
        input.forecast.enabled = jForecast.value("enabled", true);
        input.forecast.maxDegree = jForecast.value("maxDegree", 3);
        input.forecast.tolerance = jForecast.value("tolerance", 0.01);
        input.forecast.horizonSteps = jForecast.value("horizonSteps", 12);
        input.forecast.stepSeconds = jForecast.value("stepSeconds", 300);
    } else {
        input.forecast.enabled = false;
        input.forecast.maxDegree = 3;
        input.forecast.tolerance = 0.01;
        input.forecast.horizonSteps = 12;
        input.forecast.stepSeconds = 300;
    }

    return input;
}

std::string serializeOutputJson(const EngineOutput& output) {
    json j;
    j["ok"] = output.ok;
    if (!output.ok) {
        j["errorMessage"] = output.errorMessage;
        return j.dump();
    }

    // State mapping
    j["state"]["soc"] = output.state.soc;
    j["state"]["soh"] = output.state.soh;
    j["state"]["efc"] = output.state.efc;
    j["state"]["internalResistanceOhm"] = output.state.internalResistanceOhm;
    j["state"]["usableCapacityKwh"] = output.state.usableCapacityKwh;
    j["state"]["availableEnergyKwh"] = output.state.availableEnergyKwh;
    j["state"]["chargePowerAvailableKw"] = output.state.chargePowerAvailableKw;
    j["state"]["dischargePowerAvailableKw"] = output.state.dischargePowerAvailableKw;
    j["state"]["cumulativeEnergyThroughputKwh"] = output.state.cumulativeEnergyThroughputKwh;

    // Grid mapping
    j["grid"]["energyBalanceKw"] = output.grid.energyBalanceKw;
    j["grid"]["frequencyDeviationHz"] = output.grid.frequencyDeviationHz;
    j["grid"]["frequencySupportRequestKw"] = output.grid.frequencySupportRequestKw;

    // Forecasts mapping
    j["forecasts"] = json::object();
    for (auto const& pair : output.forecasts) {
        const std::string& key = pair.first;
        const SingleForecastResult& val = pair.second;
        j["forecasts"][key]["degree"] = val.degree;
        j["forecasts"][key]["residualNorm"] = val.residualNorm;
        j["forecasts"][key]["values"] = val.values;
    }

    // Decision mapping
    j["decision"]["action"] = output.decision.action;
    j["decision"]["targetPowerKw"] = output.decision.targetPowerKw;
    j["decision"]["score"] = output.decision.score;
    j["decision"]["reasonCode"] = output.decision.reasonCode;
    j["decision"]["reasonText"] = output.decision.reasonText;
    j["decision"]["constraints"]["socAllowed"] = output.decision.constraints.socAllowed;
    j["decision"]["constraints"]["temperatureAllowed"] = output.decision.constraints.temperatureAllowed;
    j["decision"]["constraints"]["voltageAllowed"] = output.decision.constraints.voltageAllowed;
    j["decision"]["constraints"]["powerClipped"] = output.decision.constraints.powerClipped;

    return j.dump();
}
