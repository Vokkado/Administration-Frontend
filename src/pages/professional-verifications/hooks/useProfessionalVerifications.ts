/**
 * Hook para listar y revisar verificaciones profesionales
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage, getApiStatus } from '../../../services/apiError';
import type { ProfessionalVerification, VerificationFilters, VerificationListResponse } from '../types';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

const errorMessage = (err: unknown, fallback: string) =>
  getApiStatus(err) === 403 ? 'No tienes permisos para realizar esta acción.' : getApiMessage(err, fallback);

export function useProfessionalVerifications() {
  const [items, setItems] = useState<ProfessionalVerification[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<VerificationFilters>({ status: 'pending', search: '' });
  const requestSeq = useRef(0);

  const fetchItems = useCallback(async (page: number, current: VerificationFilters) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (current.status !== 'ALL') params.append('status', current.status);
      if (current.search.trim()) params.append('search', current.search.trim());

      const response = await apiService.get<{ data: VerificationListResponse }>(
        `/admin/professional-verifications?${params}`
      );
      if (seq !== requestSeq.current) return;
      const data = response.data;
      setItems(data.items || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(Math.max(1, data.totalPages || 1));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(errorMessage(err, 'Error al cargar las verificaciones'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(1, filters), filters.search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [filters, fetchItems]);

  const handleFiltersChange = useCallback((next: VerificationFilters) => {
    setFilters(next);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchItems(page, filters);
  }, [fetchItems, filters]);

  const refresh = useCallback(() => fetchItems(currentPage, filters), [fetchItems, currentPage, filters]);

  const approve = useCallback(async (id: string, organizationName: string) => {
    try {
      await apiService.post(`/admin/professional-verifications/${id}/approve`, {
        organizationName: organizationName.trim() || null,
      });
    } catch (err) {
      throw new Error(errorMessage(err, 'No se pudo aprobar la verificación'));
    }
  }, []);

  const reject = useCallback(async (id: string, note: string) => {
    try {
      await apiService.post(`/admin/professional-verifications/${id}/reject`, { note: note.trim() || null });
    } catch (err) {
      throw new Error(errorMessage(err, 'No se pudo rechazar la verificación'));
    }
  }, []);

  return {
    items,
    total,
    currentPage,
    totalPages,
    loading,
    error,
    filters,
    handleFiltersChange,
    handlePageChange,
    refresh,
    approve,
    reject,
  };
}
