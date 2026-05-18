/**
 * Hook personalizado para gestión de ingredientes (server-side pagination)
 */
import { useState, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { IngredientsService } from '../../../services/ingredients.service';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Ingredient, CreateIngredientData, UpdateIngredientData } from '../types';
import { normalizeRiskLevel } from '../types';

export function useIngredients() {
  // Local filter state
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterInspected, setFilterInspected] = useState<string>('ALL');
  const [filterReason, setFilterReason] = useState<string>('ALL');

  // Derived API params
  const toxicityLevel = filterRisk === 'ALL' ? undefined : filterRisk;
  const inspected = filterInspected === 'ALL'
    ? undefined
    : filterInspected === 'VALIDATED';
  const reason = filterReason === 'ALL'
    ? undefined
    : (filterReason as 'WITH_REASON' | 'WITHOUT_REASON');

  const normalizeIngredient = (ingredient: any): Ingredient => ({
    ...ingredient,
    toxicityLevel: ingredient.toxicityLevel ? normalizeRiskLevel(ingredient.toxicityLevel) : undefined,
    isNutritive: ingredient.isNutritive ?? false,
  });

  // Fetch function wrapped in useCallback with filter dependencies
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      IngredientsService.listAdminIngredients({
        ...params,
        toxicityLevel,
        inspected,
        reason,
      }),
    [toxicityLevel, inspected, reason],
  );

  const {
    items: ingredients,
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
  } = usePaginatedList<Ingredient>({
    fetchFn,
    normalize: normalizeIngredient,
  });

  // Fetch all ingredients (for merge modal)
  const fetchAllIngredients = async (): Promise<Ingredient[]> => {
    const response = await apiService.get<any>('/ingredients');
    const data = response?.data?.data || response?.data || response;
    return Array.isArray(data) ? data.map(normalizeIngredient) : [];
  };

  // CRUD operations — refetch current page after mutation
  const createIngredient = async (data: CreateIngredientData) => {
    await apiService.post('/ingredients', data);
    await refetch();
  };

  const updateIngredient = async (id: string, data: UpdateIngredientData) => {
    await apiService.put(`/ingredients/${id}`, data);
    await refetch();
  };

  const deleteIngredient = async (id: string) => {
    try {
      await apiService.delete(`/ingredients/${id}`);
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar ingrediente');
    }
  };

  const validateIngredient = async (id: string, inspectedValue: boolean) => {
    await apiService.put(`/ingredients/${id}`, { isInspected: inspectedValue });
    await refetch();
  };

  return {
    ingredients,
    total,
    loading,
    error,
    searchTerm,
    filterRisk,
    filterInspected,
    filterReason,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterRisk,
    setFilterInspected,
    setFilterReason,
    setCurrentPage,
    setError,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    validateIngredient,
    fetchAllIngredients,
  };
}
