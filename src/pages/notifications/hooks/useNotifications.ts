import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../../services/api.service';
import type { BroadcastResult, DeviceStats } from '../types';

export function useNotifications() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DeviceStats>({ total: 0, active: 0, inactive: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await apiService.get<any>('/admin/notifications/stats');
      const data = response.data || response;
      setStats({
        total: data.total ?? 0,
        active: data.active ?? 0,
        inactive: data.inactive ?? 0,
      });
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar estadísticas:', err.message);
      setStats({ total: 0, active: 0, inactive: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const sendBroadcast = async (data: { title: string; body: string }): Promise<BroadcastResult> => {
    setSending(true);
    setError('');

    try {
      const response = await apiService.post<any>('/admin/notifications/broadcast', {
        title: data.title,
        body: data.body,
      });
      // Refresh stats after sending
      await fetchStats();
      return response.data || response;
    } finally {
      setSending(false);
    }
  };

  return {
    sending,
    error,
    setError,
    sendBroadcast,
    stats,
    loadingStats,
  };
}
