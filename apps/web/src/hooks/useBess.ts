import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { BessAsset } from 'shared';

export function useBess() {
  const [assets, setAssets] = useState<BessAsset[]>([]);
  const [currentAsset, setCurrentAsset] = useState<BessAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref-like approach: don't include currentAsset in deps to avoid stale closures.
  // The guard below checks local state via setCurrentAsset's functional form instead.
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/bess');
      setAssets(data);
      // Only set the first asset if none is currently selected
      setCurrentAsset(prev => {
        if (prev === null && data.length > 0) {
          return data[0];
        }
        return prev;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch BESS assets');
    } finally {
      setLoading(false);
    }
  }, []); // No deps — uses functional state setter to access current value safely

  const selectAsset = useCallback((asset: BessAsset) => {
    setCurrentAsset(asset);
  }, []);

  const getAssetById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/bess/${id}`);
      setCurrentAsset(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch asset');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    currentAsset,
    loading,
    error,
    selectAsset,
    fetchAssets,
    getAssetById,
  };
}
