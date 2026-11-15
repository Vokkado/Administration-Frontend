import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import type { AccessImpact, NutritionistFilters, NutritionistRow } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const PAGE_SIZE = 25;

/**
 * Último segundo del día elegido en hora de Montevideo (Uruguay no tiene horario de verano desde 2015).
 * Se manda con el offset: "2026-12-31" solo se leería como medianoche UTC, el 30 a las 21 en Uruguay.
 */
export function endOfDayMontevideo(date: string): string {
  return `${date}T23:59:59-03:00`;
}

/**
 * Pestaña "Nutricionistas" de Planes: qué rige para cada uno y los accesos de Vokkado (dar, extender,
 * revocar). Después de cada cambio se recarga la página actual.
 */
export function useNutritionists(filters: NutritionistFilters, page: number, onPageOutOfRange?: (lastPage: number) => void) {
  const [rows, setRows] = useState<NutritionistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Solo vale la respuesta del último pedido: con filtros o páginas cambiados rápido, una respuesta vieja
  // que llega tarde no pisa a la nueva.
  const latest = useRef(0);

  const fetchRows = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.source) params.source = filters.source;
      if (filters.planCode) params.planCode = filters.planCode;
      if (filters.expiringWithinDays) params.expiringWithinDays = filters.expiringWithinDays;
      const response = await apiService.get<ApiResponse<{ items: NutritionistRow[]; total: number }>>('/admin/billing/nutritionists', { params });
      if (id !== latest.current) return;
      const items = response.data.items ?? [];
      const count = response.data.total ?? 0;
      const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
      if (items.length === 0 && page > lastPage && onPageOutOfRange) {
        onPageOutOfRange(lastPage);
        return;
      }
      setRows(items);
      setTotal(count);
    } catch (err) {
      if (id !== latest.current) return;
      setError(getApiMessage(err, 'No se pudo cargar la lista de nutricionistas'));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [filters.search, filters.source, filters.planCode, filters.expiringWithinDays, page, onPageOutOfRange]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  /** Da un acceso (reemplaza al vigente). endsAt null = indefinido. */
  const grant = async (userId: string, planCode: string, endsAt: string | null, note: string): Promise<AccessImpact> => {
    const response = await apiService.post<ApiResponse<AccessImpact>>('/admin/billing/grants', { userId, planCode, endsAt, note });
    await fetchRows();
    return response.data;
  };

  const extend = async (accessId: string, endsAt: string | null, note: string): Promise<AccessImpact> => {
    const response = await apiService.patch<ApiResponse<AccessImpact>>(`/admin/billing/grants/${accessId}`, { endsAt, note });
    await fetchRows();
    return response.data;
  };

  const revoke = async (accessId: string, note: string): Promise<AccessImpact> => {
    const response = await apiService.delete<ApiResponse<AccessImpact>>(`/admin/billing/grants/${accessId}`, { data: { note: note || null } });
    await fetchRows();
    return response.data;
  };

  return { rows, total, loading, error, setError, grant, extend, revoke, refresh: fetchRows };
}
