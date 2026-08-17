import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface DispatchDecision {
  id: string;
  bessId: string;
  stateId: string;
  decidedAt: string;
  action: 'CHARGE' | 'DISCHARGE' | 'HOLD' | 'SUSPENDED';
  targetPowerKw: number;
  energyBalanceKw: number;
  frequencyDeviationHz: number;
  score: number;
  reasonCode: string;
  reasonText: string;
  constraints: any;
  inputs: any;
  engineVersion: string;
  createdAt: string;
}

export function useDecision(bessId: string | undefined) {
  const [decision, setDecision] = useState<DispatchDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestDecision = useCallback(async () => {
    if (!bessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/bess/${bessId}/decisions/latest`);
      setDecision(data);
    } catch (err: any) {
      // 404 means no decisions yet — that's OK, not an error
      if (!err.message?.includes('404') && !err.message?.includes('No dispatch')) {
        setError(err.message || 'Failed to fetch decision');
      }
      setDecision(null);
    } finally {
      setLoading(false);
    }
  }, [bessId]);

  useEffect(() => {
    if (!bessId) return;
    fetchLatestDecision();

    // Poll for updated decisions every 10 seconds
    const interval = setInterval(fetchLatestDecision, 10000);
    return () => clearInterval(interval);
  }, [bessId, fetchLatestDecision]);

  return { decision, loading, error, refetch: fetchLatestDecision };
}
