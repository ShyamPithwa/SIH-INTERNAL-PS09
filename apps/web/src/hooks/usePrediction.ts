import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface PredictionResult {
  bessId: string;
  currentSoh: number;
  degradationRatePerDay: number;
  degradationRatePerCycle: number;
  eolThresholdPct: number;
  daysUntilEol: number | null;
  predictedEolDate: string | null;
  remainingUsefulLifePct: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  dataPoints: number;
  generatedAt: string;
}

export function usePrediction(bessId?: string) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bessId) { setPrediction(null); return; }

    setLoading(true);
    api.get(`/bess/${bessId}/prediction`)
      .then(setPrediction)
      .catch(() => setPrediction(null))
      .finally(() => setLoading(false));
  }, [bessId]);

  return { prediction, loading };
}
