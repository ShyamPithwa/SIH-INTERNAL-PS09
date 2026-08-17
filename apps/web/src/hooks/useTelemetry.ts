import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { TelemetrySample } from 'shared';

export function useTelemetry(bessId: string | undefined) {
  const [telemetry, setTelemetry] = useState<TelemetrySample[]>([]);
  const [latestSample, setLatestSample] = useState<TelemetrySample | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (limit = 60) => {
    if (!bessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/bess/${bessId}/telemetry?limit=${limit}`);
      setTelemetry(data);
      if (data.length > 0) {
        setLatestSample(data[data.length - 1]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch telemetry history');
    } finally {
      setLoading(false);
    }
  }, [bessId]);

  const fetchLatest = useCallback(async () => {
    if (!bessId) return;
    try {
      const data = await api.get(`/bess/${bessId}/telemetry/latest`);
      setLatestSample(data);
      setTelemetry(prev => {
        if (prev.length > 0 && prev[prev.length - 1].recordedAt === data.recordedAt) {
          return prev;
        }
        const updated = [...prev, data];
        if (updated.length > 100) {
          updated.shift();
        }
        return updated;
      });
    } catch (err: any) {
      console.error('Failed to fetch latest telemetry:', err.message);
    }
  }, [bessId]);

  useEffect(() => {
    if (!bessId) return;

    fetchHistory();

    // Subscribe to realtime telemetry inserts
    const channel = supabase
      .channel(`telemetry-stream-${bessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_samples',
          filter: `bess_id=eq.${bessId}`,
        },
        (payload) => {
          const newSample: TelemetrySample = {
            id: payload.new.id,
            bessId: payload.new.bess_id,
            recordedAt: payload.new.recorded_at,
            batteryVoltageV: payload.new.battery_voltage_v,
            batteryCurrentA: payload.new.battery_current_a,
            batteryPowerKw: payload.new.battery_power_kw,
            batteryTemperatureC: payload.new.battery_temperature_c,
            gridFrequencyHz: payload.new.grid_frequency_hz,
            gridVoltageV: payload.new.grid_voltage_v,
            renewablePowerKw: payload.new.renewable_power_kw,
            loadPowerKw: payload.new.load_power_kw,
            source: payload.new.source,
            quality: payload.new.quality,
          };
          
          setLatestSample(newSample);
          setTelemetry(prev => {
            if (prev.some(p => p.recordedAt === newSample.recordedAt)) {
              return prev;
            }
            const updated = [...prev, newSample];
            if (updated.length > 100) {
              updated.shift();
            }
            return updated;
          });
        }
      )
      .subscribe();

    // Polling fallback
    const interval = setInterval(() => {
      fetchLatest();
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [bessId, fetchHistory, fetchLatest]);

  return {
    telemetry,
    latestSample,
    loading,
    error,
    fetchHistory,
    fetchLatest,
  };
}
