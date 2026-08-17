#include "domain.h"
#include "json_io.h"
#include "state_estimation.h"
#include "performance_estimation.h"
#include "grid_analysis.h"
#include "polynomial_regression.h"
#include "decision_engine.h"
#include <iostream>
#include <sstream>
#include <vector>
#include <string>

int main() {
    // Read stdin until EOF
    std::stringstream buffer;
    buffer << std::cin.rdbuf();
    std::string inputStr = buffer.str();

    EngineOutput output;
    output.ok = true;
    output.errorMessage = "";

    try {
        if (inputStr.empty()) {
            throw std::runtime_error("Empty input received on stdin");
        }

        EngineInput input = parseInputJson(inputStr);

        // 1. State Estimation
        // Since we don't track historical voltage/current in state table, delta is set to 0.0
        output.state = estimateState(
            input.asset,
            input.previousState,
            input.telemetry,
            input.telemetry.deltaTimeHours,
            0.0,
            0.0
        );

        // 2. Performance Limits (available power)
        estimatePerformance(
            input.asset,
            output.state,
            input.telemetry.batteryTemperatureC
        );

        // 3. Grid Analysis (deviations and imbalances)
        output.grid = analyzeGrid(
            input.asset,
            input.telemetry
        );

        // 4. Polynomial Forecasting Integration
        if (input.forecast.enabled && !input.history.empty()) {
            std::vector<double> t_vec;
            std::vector<double> freq_vec;
            std::vector<double> ren_vec;
            std::vector<double> load_vec;

            for (auto const& sample : input.history) {
                t_vec.push_back(sample.t);
                freq_vec.push_back(sample.gridFrequencyHz);
                ren_vec.push_back(sample.renewablePowerKw);
                load_vec.push_back(sample.loadPowerKw);
            }

            // Append current telemetry as the last point in the history window
            double current_t = t_vec.empty() ? 0.0 : t_vec.back() + 1.0;
            t_vec.push_back(current_t);
            freq_vec.push_back(input.telemetry.gridFrequencyHz);
            ren_vec.push_back(input.telemetry.renewablePowerKw);
            load_vec.push_back(input.telemetry.loadPowerKw);

            // Fit and forecast each target
            int maxDeg = input.forecast.maxDegree;
            double tol = input.forecast.tolerance;

            // Grid Frequency
            try {
                auto fitFreq = fitPolynomialLeastSquares(t_vec, freq_vec, maxDeg, tol);
                SingleForecastResult res;
                res.degree = fitFreq.degree;
                res.residualNorm = fitFreq.residualNorm;
                for (int step = 1; step <= input.forecast.horizonSteps; ++step) {
                    double t_future = current_t + step;
                    res.values.push_back(evaluatePolynomial(fitFreq.coefficients, t_future));
                }
                output.forecasts["GRID_FREQUENCY"] = res;
            } catch (...) {}

            // Renewable Power
            try {
                auto fitRen = fitPolynomialLeastSquares(t_vec, ren_vec, maxDeg, tol);
                SingleForecastResult res;
                res.degree = fitRen.degree;
                res.residualNorm = fitRen.residualNorm;
                for (int step = 1; step <= input.forecast.horizonSteps; ++step) {
                    double t_future = current_t + step;
                    double val = evaluatePolynomial(fitRen.coefficients, t_future);
                    res.values.push_back(std::max(0.0, val)); // Clip negative forecasts
                }
                output.forecasts["RENEWABLE_POWER"] = res;
            } catch (...) {}

            // Load Power
            try {
                auto fitLoad = fitPolynomialLeastSquares(t_vec, load_vec, maxDeg, tol);
                SingleForecastResult res;
                res.degree = fitLoad.degree;
                res.residualNorm = fitLoad.residualNorm;
                for (int step = 1; step <= input.forecast.horizonSteps; ++step) {
                    double t_future = current_t + step;
                    double val = evaluatePolynomial(fitLoad.coefficients, t_future);
                    res.values.push_back(std::max(0.0, val)); // Clip negative forecasts
                }
                output.forecasts["LOAD_POWER"] = res;
            } catch (...) {}
        }

        // 5. Constrained Dispatch Decision
        output.decision = makeDecision(
            input.asset,
            output.state,
            input.telemetry,
            output.grid
        );

    } catch (const std::exception& e) {
        output.ok = false;
        output.errorMessage = e.what();
    } catch (...) {
        output.ok = false;
        output.errorMessage = "Unknown exception in C++ engine core";
    }

    // Write final output JSON to stdout
    std::cout << serializeOutputJson(output) << std::endl;
    return 0;
}
