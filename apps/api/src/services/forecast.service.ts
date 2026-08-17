import { ForecastRepository } from '../repositories/forecast.repository';
import { Forecast, ForecastPoint } from 'shared';

const forecastRepository = new ForecastRepository();

export class ForecastService {
  async saveForecast(
    bessId: string,
    forecast: Partial<Forecast>,
    points: { predictedAt: string; predictedValue: number }[]
  ): Promise<Forecast> {
    return forecastRepository.insert(bessId, forecast, points);
  }

  async getLatestForecast(
    bessId: string,
    target: 'GRID_FREQUENCY' | 'RENEWABLE_POWER' | 'LOAD_POWER' | 'SOC'
  ): Promise<{ forecast: Forecast; points: ForecastPoint[] } | null> {
    return forecastRepository.getLatestForecastForTarget(bessId, target);
  }
}
