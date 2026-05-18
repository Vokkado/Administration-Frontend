/**
 * Hook personalizado para gestión de restricciones (server-side pagination)
 */
import { useCallback, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { RestrictionsService } from '../../../services/restrictions.service';
import { usePaginatedList, type PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Restriction } from '../types';

export function useRestrictions() {
  // Local filter state
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAbsolute, setFilterAbsolute] = useState<string>('ALL');

  // Convert filters to API params
  const type = filterType === 'ALL' ? undefined : filterType;
  const active = filterStatus === 'ALL' ? undefined : filterStatus === 'ACTIVE';
  const isAbsolute = filterAbsolute === 'ALL' ? undefined : filterAbsolute === 'ABSOLUTE';

  // Fetch function wrapped in useCallback depending on filter values
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      RestrictionsService.listAdminRestrictions({ ...params, type, active, isAbsolute }),
    [type, active, isAbsolute],
  );

  const {
    items,
    total,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    setSearchTerm,
    setCurrentPage,
    setError,
    refetch,
  } = usePaginatedList<Restriction>({ fetchFn });

  // Fetch all restrictions (for dropdowns and other components that need the full list)
  const fetchAllRestrictions = async (): Promise<Restriction[]> => {
    const response = await apiService.get<any>('/restrictions');
    const data = response.data || response;
    return Array.isArray(data) ? data : [];
  };

  // CRUD operations — refetch current page after mutation
  const createRestriction = async (data: any) => {
    await apiService.post('/restrictions', data);
    await refetch();
  };

  const updateRestriction = async (id: string, data: any) => {
    await apiService.put(`/restrictions/${id}`, data);
    await refetch();
  };

  const deleteRestriction = async (id: string) => {
    try {
      await apiService.delete(`/restrictions/${id}`);
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar restricción');
      throw err;
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await apiService.put(`/restrictions/${id}`, { active: !currentActive });
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado de restricción');
    }
  };

  // Compatibility aliases
  const restrictions = items;
  const paginatedRestrictions = items;
  const filteredRestrictions = items;

  return {
    restrictions,
    filteredRestrictions,
    paginatedRestrictions,
    total,
    loading,
    error,
    searchTerm,
    filterType,
    filterStatus,
    filterAbsolute,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterType,
    setFilterStatus,
    setFilterAbsolute,
    setCurrentPage,
    setError,
    createRestriction,
    updateRestriction,
    deleteRestriction,
    toggleActive,
    fetchAllRestrictions,
  };
}
