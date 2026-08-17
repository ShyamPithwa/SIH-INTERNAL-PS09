"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastService = void 0;
const forecast_repository_1 = require("../repositories/forecast.repository");
const forecastRepository = new forecast_repository_1.ForecastRepository();
class ForecastService {
    async saveForecast(bessId, forecast, points) {
        return forecastRepository.insert(bessId, forecast, points);
    }
    async getLatestForecast(bessId, target) {
        return forecastRepository.getLatestForecastForTarget(bessId, target);
    }
}
exports.ForecastService = ForecastService;
