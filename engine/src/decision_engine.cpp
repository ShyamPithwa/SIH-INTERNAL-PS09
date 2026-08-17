#include "decision_engine.h"
#include <cmath>
#include <algorithm>
#include <sstream>

DecisionResult makeDecision(
    const BessAssetConfig& config,
    const BatteryStateModel& state,
    const TelemetrySampleModel& telemetry,
    const GridAnalysisResult& grid
) {
    DecisionResult result;
    result.constraints.socAllowed = true;
    result.constraints.temperatureAllowed = true;
    result.constraints.voltageAllowed = true;
    result.constraints.powerClipped = false;
    
    // Default action is HOLD
    result.action = "HOLD";
    result.targetPowerKw = 0.0;
    result.score = 1.0;
    result.reasonCode = "BALANCED_SYSTEM";
    result.reasonText = "System is in a balanced state. Battery is idle.";

    // 1. Safety Gate: Temperature
    if (telemetry.batteryTemperatureC <= config.minTemperatureC || 
        telemetry.batteryTemperatureC >= config.maxTemperatureC) {
        result.constraints.temperatureAllowed = false;
        result.action = "HOLD";
        result.targetPowerKw = 0.0;
        result.reasonCode = "SAFETY_TEMPERATURE";
        
        std::stringstream ss;
        ss << "Safety violation: Battery temperature of " 
           << telemetry.batteryTemperatureC << "°C is outside allowed limits ("
           << config.minTemperatureC << "°C to " << config.maxTemperatureC << "°C). Operations suspended.";
        result.reasonText = ss.str();
        return result;
    }

    // 2. Safety Gate: Voltage
    if (telemetry.batteryVoltageV <= config.minVoltageV || 
        telemetry.batteryVoltageV >= config.maxVoltageV) {
        result.constraints.voltageAllowed = false;
        result.action = "HOLD";
        result.targetPowerKw = 0.0;
        result.reasonCode = "SAFETY_VOLTAGE";
        
        std::stringstream ss;
        ss << "Safety violation: Battery voltage of " 
           << telemetry.batteryVoltageV << " V is outside allowed range ("
           << config.minVoltageV << " V to " << config.maxVoltageV << " V). Operations suspended.";
        result.reasonText = ss.str();
        return result;
    }

    // 3. Frequency Support Response (High Priority)
    if (std::abs(grid.frequencyDeviationHz) > config.frequencyDeadbandHz) {
        double reqPower = grid.frequencySupportRequestKw;
        double constrainedPower = 0.0;
        
        if (reqPower > 0.0) { // Discharge needed (Low frequency)
            if (state.soc <= config.socMin) {
                result.constraints.socAllowed = false;
                result.action = "HOLD";
                result.targetPowerKw = 0.0;
                result.reasonCode = "SOC_AT_MIN";
                result.reasonText = "Frequency support requires discharging, but State of Charge is below the minimum threshold.";
                return result;
            }
            constrainedPower = std::min(reqPower, state.dischargePowerAvailableKw);
            result.action = "FREQUENCY_SUPPORT";
            result.targetPowerKw = constrainedPower;
            result.reasonCode = "FREQUENCY_LOW";
            
            std::stringstream ss;
            ss << "Low grid frequency (" << telemetry.gridFrequencyHz 
               << " Hz) detected. Discharging " << constrainedPower << " kW to support grid stabilization.";
            result.reasonText = ss.str();
            
            if (constrainedPower < reqPower) {
                result.constraints.powerClipped = true;
            }
            return result;
        } 
        else if (reqPower < 0.0) { // Charge needed (High frequency)
            if (state.soc >= config.socMax) {
                result.constraints.socAllowed = false;
                result.action = "HOLD";
                result.targetPowerKw = 0.0;
                result.reasonCode = "SOC_AT_MAX";
                result.reasonText = "Frequency support requires charging, but State of Charge is at the maximum threshold.";
                return result;
            }
            // Charging power is negative in our convention
            constrainedPower = -std::min(std::abs(reqPower), state.chargePowerAvailableKw);
            result.action = "FREQUENCY_SUPPORT";
            result.targetPowerKw = constrainedPower;
            result.reasonCode = "FREQUENCY_HIGH";
            
            std::stringstream ss;
            ss << "High grid frequency (" << telemetry.gridFrequencyHz 
               << " Hz) detected. Charging BESS with " << std::abs(constrainedPower) << " kW to support grid stabilization.";
            result.reasonText = ss.str();
            
            if (std::abs(constrainedPower) < std::abs(reqPower)) {
                result.constraints.powerClipped = true;
            }
            return result;
        }
    }

    // 4. Renewable Surplus / Deficit (Standard operation)
    double balance = grid.energyBalanceKw;
    double balanceDeadbandKw = 5.0; // 5 kW deadband

    if (balance > balanceDeadbandKw) { // Renewable Surplus
        if (state.soc >= config.socMax) {
            result.constraints.socAllowed = false;
            result.action = "HOLD";
            result.targetPowerKw = 0.0;
            result.reasonCode = "SOC_AT_MAX";
            result.reasonText = "Renewable surplus is available, but battery is fully charged to its maximum limit.";
        } 
        else if (state.chargePowerAvailableKw > 0) {
            // Charging power is negative
            double target = -std::min(balance, state.chargePowerAvailableKw);
            result.action = "CHARGE";
            result.targetPowerKw = target;
            result.reasonCode = "RENEWABLE_SURPLUS";
            
            std::stringstream ss;
            ss << "Renewable generation exceeds load by " << balance 
               << " kW. Charging BESS at " << std::abs(target) << " kW.";
            result.reasonText = ss.str();
            
            if (std::abs(target) < balance) {
                result.constraints.powerClipped = true;
            }
        }
    } 
    else if (balance < -balanceDeadbandKw) { // Deficit
        if (state.soc <= config.socMin) {
            result.constraints.socAllowed = false;
            result.action = "HOLD";
            result.targetPowerKw = 0.0;
            result.reasonCode = "SOC_AT_MIN";
            result.reasonText = "Local energy deficit exists, but battery SOC is at the minimum allowed boundary.";
        } 
        else if (state.dischargePowerAvailableKw > 0) {
            double target = std::min(std::abs(balance), state.dischargePowerAvailableKw);
            result.action = "DISCHARGE";
            result.targetPowerKw = target;
            result.reasonCode = "ENERGY_DEFICIT";
            
            std::stringstream ss;
            ss << "Local load exceeds renewable generation by " << std::abs(balance) 
               << " kW. Discharging BESS at " << target << " kW.";
            result.reasonText = ss.str();
            
            if (target < std::abs(balance)) {
                result.constraints.powerClipped = true;
            }
        }
    }

    return result;
}
