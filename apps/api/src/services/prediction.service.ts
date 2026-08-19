import { supabase } from '../plugins/supabase';

/**
 * Battery End-of-Life Prediction Service
 *
 * Uses linear regression on historical SOH values to predict:
 *  - Current degradation rate (% per day)
 *  - Estimated date when SOH hits the end-of-life threshold (default 80%)
 *  - Remaining useful life in days
 *  - Confidence level based on data points available
 */

export interface PredictionResult {
  bessId: string;
  currentSoh: number;
  degradationRatePerDay: number;     // % SOH lost per day
  degradationRatePerCycle: number;   // % SOH lost per equivalent full cycle
  eolThresholdPct: number;           // threshold for "end of life" (default 80%)
  daysUntilEol: number | null;       // null if degradation rate is 0 or positive
  predictedEolDate: string | null;   // ISO date string
  remainingUsefulLifePct: number;    // (currentSOH - eolThreshold) / (100 - eolThreshold) * 100
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'; // based on number of data points
  dataPoints: number;                // how many SOH observations were used
  generatedAt: string;
}

const EOL_THRESHOLD = 80; // % SOH below which battery is considered end-of-life

export class PredictionService {

  async predictEol(bessId: string): Promise<PredictionResult | null> {
    // Fetch historical battery states with SOH values
    const { data, error } = await supabase
      .from('battery_states')
      .select('soh, computed_at')
      .eq('bess_id', bessId)
      .order('computed_at', { ascending: true })
      .limit(500);

    if (error || !data || data.length === 0) return null;

    // Filter valid SOH readings
    const sohHistory = data
      .filter(row => row.soh != null && row.soh > 0 && row.soh <= 1)
      .map(row => ({
        sohPct: row.soh * 100,
        timestamp: new Date(row.computed_at).getTime(),
      }));

    if (sohHistory.length < 2) return null;

    const currentSoh = sohHistory[sohHistory.length - 1].sohPct;
    const firstTimestamp = sohHistory[0].timestamp;

    // Normalize timestamps to days from first reading
    const points = sohHistory.map(h => ({
      x: (h.timestamp - firstTimestamp) / (1000 * 60 * 60 * 24), // days
      y: h.sohPct,
    }));

    // Linear regression: y = mx + b
    const { slope, intercept } = this.linearRegression(points);

    // slope = % SOH change per day (should be negative for degradation)
    const degradationRatePerDay = -slope; // positive means losing SOH

    // Days from now until SOH hits EOL_THRESHOLD
    const latestDays = points[points.length - 1].x;
    let daysUntilEol: number | null = null;
    let predictedEolDate: string | null = null;

    if (slope < 0) { // degradation is happening
      // Solve: EOL_THRESHOLD = slope * x + intercept → x = (EOL_THRESHOLD - intercept) / slope
      const xEol = (EOL_THRESHOLD - intercept) / slope;
      const daysFromNow = xEol - latestDays;

      if (daysFromNow > 0) {
        daysUntilEol = Math.round(daysFromNow);
        const eolDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
        predictedEolDate = eolDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        daysUntilEol = 0; // Already past EOL
        predictedEolDate = new Date().toISOString().split('T')[0];
      }
    }

    // Remaining useful life as percentage
    const remainingUsefulLifePct = Math.max(0,
      ((currentSoh - EOL_THRESHOLD) / (100 - EOL_THRESHOLD)) * 100
    );

    // Degradation per cycle (rough approximation: 1 day ≈ 0.5 cycles for typical BESS)
    const degradationRatePerCycle = degradationRatePerDay / 0.5;

    // Confidence based on data points
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    if (sohHistory.length >= 50) confidence = 'HIGH';
    else if (sohHistory.length >= 10) confidence = 'MEDIUM';
    else confidence = 'LOW';

    return {
      bessId,
      currentSoh: parseFloat(currentSoh.toFixed(3)),
      degradationRatePerDay: parseFloat(Math.abs(degradationRatePerDay).toFixed(6)),
      degradationRatePerCycle: parseFloat(Math.abs(degradationRatePerCycle).toFixed(6)),
      eolThresholdPct: EOL_THRESHOLD,
      daysUntilEol,
      predictedEolDate,
      remainingUsefulLifePct: parseFloat(remainingUsefulLifePct.toFixed(1)),
      confidence,
      dataPoints: sohHistory.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }
}

export const predictionService = new PredictionService();
