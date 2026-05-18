/**
 * Hook genérico para listas paginadas con búsqueda debounced.
 *
 * Encapsula: debounce (400ms), paginación, loading/error, fetch automático.
 * El consumer provee un fetchFn envuelto en useCallback que captura sus propios filtros.
 *
 * Uso:
 *   const inspected = filterInspected === 'ALL' ? undefined : filterInspected === 'VALIDATED';
 *   const fetchFn = useCallback(
 *     (p: PaginatedFetchParams) => AllergensService.listAdminAllergens({ ...p, inspected }),
 *     [inspected],
 *   );
 *   const { items, ...rest } = usePaginatedList({ fetchFn, normalize: normalizeAllergen });
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface PaginatedFetchParams {
  limit: number;
  offset: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface UsePaginatedListOptions<T> {
  fetchFn: (params: PaginatedFetchParams) => Promise<PaginatedResponse<T>>;
  itemsPerPage?: number;
  normalize?: (raw: any) => T;
}

export function usePaginatedList<T>({
  fetchFn,
  itemsPerPage = 15,
  normalize,
}: UsePaginatedListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search (400ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Stable ref for normalize to avoid re-renders
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  // Core fetch — depends on fetchFn (consumer's useCallback with filter deps) + debouncedSearch
  const doFetch = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      const response = await fetchFn({
        limit: itemsPerPage,
        offset,
        search: debouncedSearch || undefined,
      });

      const data = normalizeRef.current
        ? response.data.map(normalizeRef.current)
        : response.data;

      setItems(data);
      setTotal(response.total);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('No autorizado. Por favor, inicia sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al cargar datos');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, debouncedSearch, itemsPerPage]);

  // Fetch when page changes or doFetch identity changes (filters changed)
  useEffect(() => {
    doFetch(currentPage);
  }, [doFetch, currentPage]);

  // Reset to page 1 when filters or search change
  // doFetch changes when fetchFn or debouncedSearch change — same deps as the original hooks
  const prevDoFetchRef = useRef(doFetch);
  useEffect(() => {
    if (prevDoFetchRef.current !== doFetch) {
      prevDoFetchRef.current = doFetch;
      setCurrentPage(1);
    }
  }, [doFetch]);

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  return {
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
    refetch: () => doFetch(currentPage),
  };
}
