/**
 * Hook personalizado para gestión de productos (server-side pagination)
 */
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { ProductsService } from '../../../services/products.service';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Product } from '../types';

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentCategoryId: string | null;
  isAssignable: boolean;
}

const normalizeProduct = (product: any): Product => {
  const rawAllergens = product.allergens ?? product.allergenData ?? [];
  const normalizedAllergens = Array.isArray(rawAllergens)
    ? rawAllergens
        .map((allergen: any) => ({
          allergenId: allergen.allergenId ?? allergen.id,
          name: allergen.name,
          presence: allergen.presence,
        }))
        .filter((allergen: any) => !!allergen.allergenId)
    : [];

  const rawIngredientVariants =
    product.ingredientVariants ?? product.ingredientVariantIds ?? product.ingredientVariantData ?? [];
  const normalizedIngredientVariants = Array.isArray(rawIngredientVariants)
    ? rawIngredientVariants
        .map((variant: any) => {
          if (typeof variant === 'string') {
            return { ingredientVariantId: variant };
          }

          return {
            ingredientVariantId: variant.ingredientVariantId ?? variant.id,
            name: variant.name,
          };
        })
        .filter((variant: any) => !!variant.ingredientVariantId)
    : [];

  return {
    ...product,
    allergens: normalizedAllergens,
    ingredientVariants: normalizedIngredientVariants,
    fatAlert: product.fatAlert ?? product.isFatAlert ?? false,
    saturatedFatAlert: product.saturatedFatAlert ?? product.isSaturatedFatAlert ?? false,
    sugarAlert: product.sugarAlert ?? product.isSugarAlert ?? false,
    sodiumAlert: product.sodiumAlert ?? product.isSodiumAlert ?? false,
    inspected: product.inspected ?? product.isInspected ?? false,
    aiGenerated: product.aiGenerated ?? product.isAiGenerated ?? false,
    isReference: product.isReference ?? product.is_reference ?? false,
    source: product.source ?? null,
    isUltraProcessed: product.isUltraProcessed ?? product.is_ultra_processed ?? false,
    alcoholGraduation: product.alcoholGraduation ?? product.alcohol_graduation ?? null,
    servingSizeQuantity: product.servingSizeQuantity ?? product.servingSizeAmount ?? product.servingSizeQuantity,
  };
};

export function useProducts() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterParentCategory, setFilterParentCategory] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterInspected, setFilterInspected] = useState<string>('ALL');
  // 'NORMAL' (default) => productos normales | 'REFERENCE' => solo fichas reference (curaduría)
  const [filterReference, setFilterReference] = useState<string>('NORMAL');

  const categoryId = filterCategory === 'ALL'
    ? undefined
    : filterCategory === 'NONE'
      ? null
      : filterCategory;

  const inspected = filterInspected === 'ALL'
    ? undefined
    : filterInspected === 'VALIDATED';

  const isReference = filterReference === 'REFERENCE' ? true : undefined;

  const fetchFn = useCallback(
    (params: PaginatedFetchParams) => {
      // Compute categoryIds for parent category filtering:
      // When subcategory is "ALL" but a parent category is selected,
      // filter by all assignable children of that parent
      let resolvedCategoryIds: string[] | undefined = undefined;
      if (filterCategory === 'ALL' && filterParentCategory !== 'ALL') {
        const childIds = categories
          .filter(cat => cat.parentCategoryId === filterParentCategory && cat.isAssignable)
          .map(cat => cat.id);
        if (childIds.length > 0) {
          resolvedCategoryIds = childIds;
        }
      }

      return ProductsService.listAdminProducts({
        ...params,
        categoryId,
        categoryIds: resolvedCategoryIds,
        inspected,
        isReference,
      });
    },
    [categoryId, filterCategory, filterParentCategory, categories, inspected, isReference],
  );

  const {
    items: products,
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
  } = usePaginatedList<Product>({
    fetchFn,
    itemsPerPage: 10,
    normalize: normalizeProduct,
  });

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.get('/categories') as { data: Category[] };
        setCategories(response.data);
      } catch (err: any) {
        if (import.meta.env.DEV) console.error('Error al cargar categorías:', err);
      }
    };
    fetchCategories();
  }, []);

  // Reset subcategory when parent category changes
  useEffect(() => {
    setFilterCategory('ALL');
  }, [filterParentCategory]);

  // CRUD operations — refetch current page after mutation
  const createProduct = async (data: any) => {
    await apiService.post('/products', data);
    await refetch();
  };

  const updateProduct = async (id: string, data: any) => {
    await apiService.put(`/products/${id}`, data);
    await refetch();
  };

  const deleteProduct = async (id: string) => {
    try {
      await apiService.delete(`/products/${id}`);
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const validateProduct = async (id: string, inspectedValue: boolean) => {
    await apiService.put(`/products/${id}`, { isInspected: inspectedValue });
    await refetch();
  };

  const rebuildAllSnapshots = async (): Promise<{ rebuilt: number }> => {
    const response = await apiService.post('/products/rebuild-snapshots', {}) as { data: { rebuilt: number } };
    await refetch();
    return response.data;
  };

  const calculateScore = async (id: string): Promise<any> => {
    const response = await apiService.post(`/products/${id}/calculate-score`, {}) as { data: any };
    await refetch();
    return response.data;
  };

  const calculateScoresBulk = async (mode: 'all' | 'outdated'): Promise<{ calculated: number; skipped: number; errors: number }> => {
    const response = await apiService.post('/products/calculate-scores-bulk', { mode }) as { data: { calculated: number; skipped: number; errors: number } };
    await refetch();
    return response.data;
  };

  return {
    products,
    total,
    categories,
    loading,
    error,
    searchTerm,
    filterParentCategory,
    filterCategory,
    filterInspected,
    filterReference,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterParentCategory,
    setFilterCategory,
    setFilterInspected,
    setFilterReference,
    setCurrentPage,
    setError,
    createProduct,
    updateProduct,
    deleteProduct,
    validateProduct,
    rebuildAllSnapshots,
    calculateScore,
    calculateScoresBulk,
  };
}
