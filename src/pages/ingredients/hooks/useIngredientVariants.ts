/**
 * Hook personalizado para gestión de variantes de ingrediente (server-side pagination)
 * Usa el hook genérico usePaginatedList.
 */
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { IngredientVariantsService } from '../../../services/ingredient-variants.service';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Ingredient, IngredientVariant, AttributeForVariant, AttributeTypeForVariant } from '../types';

export function useIngredientVariants() {
  // Local filter state
  const [filterInspected, setFilterInspected] = useState<string>('ALL');

  // Lookup data
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [attributes, setAttributes] = useState<AttributeForVariant[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeTypeForVariant[]>([]);

  // Convert filterInspected to boolean param
  const inspected = filterInspected === 'ALL'
    ? undefined
    : filterInspected === 'VALIDATED';

  // Fetch function wrapped in useCallback depending on [inspected]
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      IngredientVariantsService.listAdminVariants({ ...params, inspected }),
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
  } = usePaginatedList<IngredientVariant>({ fetchFn });

  // Fetch lookup data (ingredients, attributes, attributeTypes) once on mount
  const fetchLookups = async () => {
    try {
      const [ingredientsRes, attributesRes, typesRes] = await Promise.all([
        apiService.get<any>('/ingredients'),
        apiService.get<any>('/attributes'),
        apiService.get<any>('/attribute-types'),
      ]);

      const ingredientsData = ingredientsRes?.data?.data || ingredientsRes?.data || ingredientsRes;
      const attributesData = attributesRes?.data?.data || attributesRes?.data || attributesRes;
      const typesData = typesRes?.data?.data || typesRes?.data || typesRes;

      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : []);
      setAttributes(Array.isArray(attributesData) ? attributesData : []);
      setAttributeTypes(Array.isArray(typesData) ? typesData : []);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar datos de lookup:', err);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  // Lookup helpers
  const getIngredientName = (ingredientId: string): string => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    return ingredient?.name || 'Desconocido';
  };

  const getAttributeName = (attributeId: string): string => {
    const attr = attributes.find(a => a.id === attributeId);
    return attr?.name || 'Desconocido';
  };

  const getAttributeTypeName = (typeId: string): string => {
    const at = attributeTypes.find(t => t.id === typeId);
    return at?.type || 'Desconocido';
  };

  // Fetch all variants (for merge modal)
  const fetchAllVariants = async (): Promise<IngredientVariant[]> => {
    const response = await apiService.get<any>('/ingredient-variants');
    const data = response?.data?.data || response?.data || response;
    return Array.isArray(data) ? data : [];
  };

  // CRUD operations — call refetch() after mutation
  const createVariant = async (data: {
    ingredientId: string;
    name: string;
    isInspected?: boolean;
    attributeIds?: string[];
  }) => {
    await apiService.post('/ingredient-variants', data);
    await refetch();
  };

  const updateVariant = async (id: string, data: {
    ingredientId?: string;
    name?: string;
    isInspected?: boolean;
    attributeIds?: string[];
  }) => {
    await apiService.put(`/ingredient-variants/${id}`, data);
    await refetch();
  };

  const deleteVariant = async (id: string) => {
    await apiService.delete(`/ingredient-variants/${id}`);
    await refetch();
  };

  const validateVariant = async (id: string, isInspected: boolean) => {
    await apiService.put(`/ingredient-variants/${id}`, { isInspected });
    await refetch();
  };

  const mergeIngredientVariants = async (parentId: string, childrenIds: string[]) => {
    await apiService.post('/ingredient-variants/merge', { parentId, childrenIds });
    await refetch();
  };

  return {
    variants: items,
    total,
    ingredients,
    attributes,
    attributeTypes,
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
    getIngredientName,
    getAttributeName,
    getAttributeTypeName,
    fetchAllVariants,
    createVariant,
    updateVariant,
    deleteVariant,
    validateVariant,
    mergeIngredientVariants,
  };
}
