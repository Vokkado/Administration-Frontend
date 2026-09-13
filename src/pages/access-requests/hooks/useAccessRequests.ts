/**
 * Hook para listar y revisar solicitudes de acceso
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage, getApiStatus } from '../../../services/apiError';
import type { AccessRequestFilters, AccessRequestListItem, AccessRequestListResponse, GrantableRole } from '../types';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

const errorMessage = (err: unknown, fallback: string) =>
  getApiStatus(err) === 403
    ? 'No tienes permisos para realizar esta acción.'
    : getApiMessage(err, fallback);

export function useAccessRequests() {
  const [items, setItems] = useState<AccessRequestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<AccessRequestFilters>({ status: 'pending', search: '' });
  const requestSeq = useRef(0);

  const fetchItems = useCallback(async (page: number, current: AccessRequestFilters) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (current.status !== 'ALL') params.append('status', current.status);
      if (current.search.trim()) params.append('search', current.search.trim());

      const response = await apiService.get<{ data: AccessRequestListResponse }>(`/admin/access-requests?${params}`);
      if (seq !== requestSeq.current) return; // respuesta vieja
      const data = response.data;
      setItems(data.items || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(Math.max(1, data.totalPages || 1));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(errorMessage(err, 'Error al cargar las solicitudes'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // Recargar al cambiar filtros (la búsqueda con debounce).
  useEffect(() => {
    const timer = setTimeout(() => fetchItems(1, filters), filters.search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [filters, fetchItems]);

  const handleFiltersChange = useCallback((next: AccessRequestFilters) => {
    setFilters(next);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchItems(page, filters);
  }, [fetchItems, filters]);

  const refresh = useCallback(() => fetchItems(currentPage, filters), [fetchItems, currentPage, filters]);

  const approve = useCallback(async (id: string, role: string) => {
    try {
      await apiService.post(`/admin/access-requests/${id}/approve`, { role });
    } catch (err) {
      throw new Error(errorMessage(err, 'No se pudo aprobar la solicitud'));
    }
  }, []);

  // Catálogo de roles (para elegir cuál otorgar al aprobar). Se pide una vez.
  const [roles, setRoles] = useState<GrantableRole[]>([]);
  const [rolesError, setRolesError] = useState('');
  useEffect(() => {
    let cancelled = false;
    apiService
      .get<{ data: GrantableRole[] }>('/admin/roles')
      .then((res) => { if (!cancelled) setRoles(res.data || []); })
      .catch((err) => { if (!cancelled) setRolesError(errorMessage(err, 'No se pudieron cargar los roles')); });
    return () => { cancelled = true; };
  }, []);

  const reject = useCallback(async (id: string, note: string) => {
    try {
      await apiService.post(`/admin/access-requests/${id}/reject`, { note: note.trim() || null });
    } catch (err) {
      throw new Error(errorMessage(err, 'No se pudo rechazar la solicitud'));
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
    roles,
    rolesError,
  };
}
