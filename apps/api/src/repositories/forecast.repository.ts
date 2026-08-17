import { supabase } from '../plugins/supabase';
import { Forecast, ForecastPoint } from 'shared';

export class ForecastRepository {
  async insert(
    bessId: string,
    forecast: Partial<Forecast>,
    points: { predictedAt: string; predictedValue: number }[]
  ): Promise<Forecast> {
    // 1. Insert forecast header
    const dbForecast = {
      bess_id: bessId,
      target: forecast.target,
      generated_at: forecast.generatedAt || new Date().toISOString(),
      horizon_minutes: forecast.horizonMinutes || 60,
      step_minutes: forecast.stepMinutes || 5,
      polynomial_degree: forecast.polynomialDegree,
      residual_norm: forecast.residualNorm,
      input_window_start: forecast.inputWindowStart,
      input_window_end: forecast.inputWindowEnd,
      model_version: forecast.modelVersion || 'poly-qr-v1',
    };

    const { data: headerData, error: headerError } = await supabase
      .from('forecasts')
      .insert(dbForecast)
      .select()
      .single();

    if (headerError) throw headerError;
    const forecastId = headerData.id;

    // 2. Insert forecast points
    const dbPoints = points.map(pt => ({
      forecast_id: forecastId,
      predicted_at: pt.predictedAt,
      predicted_value: pt.predictedValue,
    }));

    const { error: pointsError } = await supabase
      .from('forecast_points')
      .insert(dbPoints);

    if (pointsError) throw pointsError;

    return {
      id: headerData.id,
      bessId: headerData.bess_id,
      target: headerData.target,
      generatedAt: headerData.generated_at,
      horizonMinutes: headerData.horizon_minutes,
      stepMinutes: headerData.step_minutes,
      polynomialDegree: headerData.polynomial_degree,
      residualNorm: headerData.residual_norm,
      inputWindowStart: headerData.input_window_start,
      inputWindowEnd: headerData.input_window_end,
      modelVersion: headerData.model_version,
    };
  }

  async getLatestForecastForTarget(
    bessId: string,
    target: 'GRID_FREQUENCY' | 'RENEWABLE_POWER' | 'LOAD_POWER' | 'SOC'
  ): Promise<{ forecast: Forecast; points: ForecastPoint[] } | null> {
    const { data: forecastData, error: forecastError } = await supabase
      .from('forecasts')
      .select()
      .eq('bess_id', bessId)
      .eq('target', target)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (forecastError) throw forecastError;
    if (!forecastData) return null;

    const { data: pointsData, error: pointsError } = await supabase
      .from('forecast_points')
      .select()
      .eq('forecast_id', forecastData.id)
      .order('predicted_at', { ascending: true });

    if (pointsError) throw pointsError;

    const forecast: Forecast = {
      id: forecastData.id,
      bessId: forecastData.bess_id,
      target: forecastData.target,
      generatedAt: forecastData.generated_at,
      horizonMinutes: forecastData.horizon_minutes,
      stepMinutes: forecastData.step_minutes,
      polynomialDegree: forecastData.polynomial_degree,
      residualNorm: forecastData.residual_norm,
      inputWindowStart: forecastData.input_window_start,
      inputWindowEnd: forecastData.input_window_end,
      modelVersion: forecastData.model_version,
    };

    const points: ForecastPoint[] = (pointsData || []).map(db => ({
      id: Number(db.id),
      forecastId: db.forecast_id,
      predictedAt: db.predicted_at,
      predictedValue: db.predicted_value,
      lowerBound: db.lower_bound,
      upperBound: db.upper_bound,
    }));

    return { forecast, points };
  }
}
export default ForecastRepository;
