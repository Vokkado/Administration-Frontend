/**
 * Hook personalizado para gestión de categorías (server-side pagination)
 * Usa el hook genérico usePaginatedList para paginación, búsqueda y debounce.
 */
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { CategoriesService } from '../../../services/categories.service';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Category, CategoryTree } from '../types';

export function useCategories() {
  // Local filter state
  const [filterType, setFilterType] = useState<'all' | 'allowsProducts' | 'notAllowsProducts'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  // Derived filter value
  const isAssignable = filterType === 'all'
    ? undefined
    : filterType === 'allowsProducts';

  // Paginated fetch function — depends on isAssignable
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      CategoriesService.listAdminCategories({ ...params, isAssignable }),
    [isAssignable],
  );

  const {
    items: filteredCategories,
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
  } = usePaginatedList<Category>({ fetchFn });

  // All categories (unpaginated, for dropdowns and parent name resolution)
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [productsCount, setProductsCount] = useState<Record<string, number>>({});

  // Fetch all categories without pagination (for tree view, dropdowns, parent name lookup)
  const fetchAllCategories = async () => {
    try {
      const response = await apiService.get('/categories') as { data: Category[] };
      setCategories(response.data);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar todas las categorías:', err);
    }
  };

  // Fetch category tree
  const fetchCategoryTree = async () => {
    try {
      const response = await apiService.get('/categories/tree') as { data: CategoryTree[] };
      setCategoryTree(response.data);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar árbol de categorías:', err);
    }
  };

  // Fetch products count by category
  const fetchProductsCount = async () => {
    try {
      const response = await apiService.get('/products') as { data: any[] };
      const products = response.data;

      const counts: Record<string, number> = {};
      products.forEach((product: any) => {
        if (product.categoryId) {
          counts[product.categoryId] = (counts[product.categoryId] || 0) + 1;
        }
      });

      setProductsCount(counts);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar conteo de productos:', err);
    }
  };

  // Initial load: all categories, tree, products count
  useEffect(() => {
    fetchAllCategories();
    fetchCategoryTree();
    fetchProductsCount();
  }, []);

  // CRUD operations — after mutation, refetch paginated list + all categories + tree
  const createCategory = async (data: any) => {
    await apiService.post('/categories', data);
    await refetch();
    await fetchAllCategories();
    await fetchCategoryTree();
  };

  const updateCategory = async (id: string, data: any) => {
    await apiService.put(`/categories/${id}`, data);
    await refetch();
    await fetchAllCategories();
    await fetchCategoryTree();
  };

  const deleteCategory = async (id: string) => {
    try {
      await apiService.delete(`/categories/${id}`);
      await refetch();
      await fetchAllCategories();
      await fetchCategoryTree();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error al eliminar categoría');
    }
  };

  // Get parent category name
  const getParentName = (parentId: string | null): string => {
    if (!parentId) return '-';
    const parent = categories.find(cat => cat.id === parentId);
    return parent ? parent.name : 'Desconocida';
  };

  // Get products count for a category
  const getProductsCount = (categoryId: string): number => {
    return productsCount[categoryId] || 0;
  };

  return {
    categories,
    categoryTree,
    filteredCategories,
    total,
    loading,
    error,
    searchTerm,
    viewMode,
    filterType,
    currentPage,
    totalPages,
    setSearchTerm,
    setViewMode,
    setFilterType,
    setCurrentPage,
    setError,
    createCategory,
    updateCategory,
    deleteCategory,
    getParentName,
    getProductsCount,
  };
}
