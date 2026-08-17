import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { BessAsset } from 'shared';

export function useBess() {
  const [assets, setAssets] = useState<BessAsset[]>([]);
  const [currentAsset, setCurrentAsset] = useState<BessAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/bess');
      setAssets(data);
      if (data.length > 0 && !currentAsset) {
        setCurrentAsset(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch BESS assets');
    } finally {
      setLoading(false);
    }
  }, [currentAsset]);

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
  }, []);

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
