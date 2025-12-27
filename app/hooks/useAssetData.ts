// app/hooks/useAssetData.ts
import { useState, useEffect, useCallback } from 'react';
import { DashboardData } from '../types';

export function useAssetData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    const url = force ? '/api/index?force=true' : '/api/index';

    try {
      const res = await fetch(url);
      if (!res.ok) {
         const text = await res.text();
         throw new Error(`Erro API: ${res.status} - ${text.substring(0, 50)}...`);
      }
      const d = await res.json();
      
      if(d.status === 'Erro') throw new Error(d.detalhe || d.msg);
      
      setData(d);
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível conectar ao servidor. Verifique o terminal.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    try {
        const hRes = await fetch('/api/history');
        const hData = await hRes.json();
        setHistory(hData);
    } catch (e) {
        console.error("Erro ao buscar histórico", e);
    }
  }, []);

  useEffect(() => { 
      fetchData(); 
  }, [fetchData]);

  return { data, history, loading, refreshing, error, refetch: fetchData };
}