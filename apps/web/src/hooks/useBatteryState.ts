import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface BatteryState {
  id: string;
  bessId: string;
  telemetrySampleId: string;
  calculatedAt: string;
  soc: number;
  soh: number;
  efc: number;
  internalResistanceOhm: number;
  usableCapacityKwh: number;
  availableEnergyKwh: number;
  chargePowerAvailableKw: number;
  dischargePowerAvailableKw: number;
  cumulativeEnergyThroughputKwh: number;
  calculationVersion: string;
  createdAt: string;
}

export function useBatteryState(bessId: string | undefined) {
  const [batteryState, setBatteryState] = useState<BatteryState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestState = useCallback(async () => {
    if (!bessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/bess/${bessId}/state/latest`);
      setBatteryState(data);
    } catch (err: any) {
      // 404 means no state computed yet — not an error
      if (!err.message?.includes('404') && !err.message?.includes('No state')) {
        setError(err.message || 'Failed to fetch battery state');
      }
      setBatteryState(null);
    } finally {
      setLoading(false);
    }
  }, [bessId]);

  useEffect(() => {
    if (!bessId) return;
    fetchLatestState();

    // Poll every 10 seconds for updated state estimations
    const interval = setInterval(fetchLatestState, 10000);
    return () => clearInterval(interval);
  }, [bessId, fetchLatestState]);

  return { batteryState, loading, error, refetch: fetchLatestState };
}
