/**
 * Hook personalizado para gestión de valores nutricionales (server-side pagination)
 * Refactored to use the generic usePaginatedList hook.
 */
import { useState, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { NutritionFactsService } from '../../../services/nutrition-facts.service';
import { usePaginatedList, type PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Nutrition_Fact } from '../types';

const normalizeNutritionFact = (nf: any): Nutrition_Fact => ({
  ...nf,
  inspected: nf.isInspected ?? nf.inspected ?? false,
});

export function useNutritionFacts() {
  // Local filter state kept outside the generic hook
  const [filterInspected, setFilterInspected] = useState<string>('ALL');

  // Derive the boolean param from the string filter
  const inspected =
    filterInspected === 'ALL' ? undefined : filterInspected === 'VALIDATED';

  // fetchFn wrapped in useCallback — re-created only when `inspected` changes
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      NutritionFactsService.listAdminNutritionFacts({ ...params, inspected }),
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
  } = usePaginatedList<Nutrition_Fact>({
    fetchFn,
    normalize: normalizeNutritionFact,
  });

  // Fetch all nutrition facts (for dropdowns/modals — no pagination)
  const fetchAllNutritionFacts = async (): Promise<Nutrition_Fact[]> => {
    const response = await apiService.get<any>('/nutrition-facts');
    const data = response.data || response;
    const list = Array.isArray(data) ? data : [];
    return list.map(normalizeNutritionFact);
  };

  // CRUD operations — call refetch() after mutation
  const createNutritionFact = async (data: any) => {
    await apiService.post('/nutrition-facts', data);
    await refetch();
  };

  const updateNutritionFact = async (id: string, data: any) => {
    await apiService.put(`/nutrition-facts/${id}`, data);
    await refetch();
  };

  const deleteNutritionFact = async (id: string) => {
    try {
      await apiService.delete(`/nutrition-facts/${id}`);
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar hecho nutricional');
    }
  };

  // Compatibility aliases
  const nutritionFacts = items;
  const paginatedNutritionFacts = items;
  const filteredNutritionFacts = items;

  return {
    nutritionFacts,
    filteredNutritionFacts,
    paginatedNutritionFacts,
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
    createNutritionFact,
    updateNutritionFact,
    deleteNutritionFact,
    fetchNutritionFacts: refetch,
    fetchAllNutritionFacts,
  };
}
