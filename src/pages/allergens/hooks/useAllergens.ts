/**
 * Hook personalizado para gestión de alérgenos (server-side pagination)
 */
import { useState, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { AllergensService } from '../../../services/allergens.service';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Allergen } from '../types';

const normalizeAllergen = (a: any): Allergen => ({
  ...a,
  inspected: a.isInspected ?? a.inspected ?? false,
  restrictionIds: a.restrictionIds || a.restriction_ids || [],
});

export function useAllergens() {
  // Local filter state
  const [filterInspected, setFilterInspected] = useState<string>('ALL');

  // Derive the boolean param from the raw filter
  const inspected = filterInspected === 'ALL'
    ? undefined
    : filterInspected === 'VALIDATED';

  // Wrap service call in useCallback that depends on [inspected]
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      AllergensService.listAdminAllergens({ ...params, inspected }),
    [inspected],
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
  } = usePaginatedList<Allergen>({ fetchFn, normalize: normalizeAllergen });

  // Fetch all allergens (for merge modal and other dropdowns)
  const fetchAllAllergens = async (): Promise<Allergen[]> => {
    const response = await apiService.get<any>('/allergens');
    const data = response.data || response;
    const allergenList = Array.isArray(data) ? data : [];
    return allergenList.map(normalizeAllergen);
  };

  // CRUD operations — call refetch() after mutation
  const createAllergen = async (data: any) => {
    await apiService.post('/allergens', data);
    await refetch();
  };

  const updateAllergen = async (id: string, data: any) => {
    await apiService.put(`/allergens/${id}`, data);
    await refetch();
  };

  const deleteAllergen = async (id: string) => {
    try {
      await apiService.delete(`/allergens/${id}`);
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar alérgeno');
    }
  };

  const validateAllergen = async (id: string, inspectedVal: boolean) => {
    await apiService.put(`/allergens/${id}`, { isInspected: inspectedVal });
    await refetch();
  };

  // Backward-compatibility aliases
  const allergens = items;
  const paginatedAllergens = items;
  const filteredAllergens = items;

  return {
    allergens,
    filteredAllergens,
    paginatedAllergens,
    total,
    loading,
    error,
    searchTerm,
    filterInspected,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterInspected,
    setCurrentPage,
    setError,
    createAllergen,
    updateAllergen,
    deleteAllergen,
    validateAllergen,
    fetchAllAllergens,
  };
}
