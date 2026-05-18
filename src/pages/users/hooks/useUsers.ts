/**
 * Hook personalizado para gestión de usuarios
 */
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import type { User, UserFilters } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    active: null,
    lastAccessFrom: undefined,
    lastAccessTo: undefined,
  });
  const limit = 10;

  const fetchUsers = useCallback(async (page: number, currentFilters: UserFilters) => {
    if (import.meta.env.DEV) console.log('Iniciando fetch de usuarios...', { page, filters: currentFilters });
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (currentFilters.search && currentFilters.search.trim() !== '') {
        params.append('search', currentFilters.search.trim());
      }

      if (currentFilters.active !== null && currentFilters.active !== undefined) {
        params.append('active', currentFilters.active.toString());
      }

      if (currentFilters.lastAccessFrom) {
        params.append('lastAccessFrom', currentFilters.lastAccessFrom);
      }

      if (currentFilters.lastAccessTo) {
        params.append('lastAccessTo', currentFilters.lastAccessTo);
      }

      const response = await apiService.get<any>(`/users?${params.toString()}`);
      if (import.meta.env.DEV) console.log('Usuarios cargados:', response);
      
      // El backend devuelve {success: true, data: {...}}
      const data = response.data || response;
      
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cargar usuarios:', err.message);
      
      if (err.response?.status === 401) {
        setError('No autorizado. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para acceder a esta información.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al cargar usuarios');
      }
    } finally {
      setLoading(false);
      if (import.meta.env.DEV) console.log('Fetch de usuarios completado');
    }
  }, [limit]);

  useEffect(() => {
    if (import.meta.env.DEV) console.log('UsersPage montado, cargando usuarios...');
    fetchUsers(1, filters);
  }, []);

  const handleFiltersChange = useCallback((newFilters: UserFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    fetchUsers(1, newFilters);
  }, [fetchUsers]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchUsers(page, filters);
  }, [fetchUsers, filters]);

  return {
    users,
    total,
    currentPage,
    totalPages,
    loading,
    error,
    filters,
    setError,
    handleFiltersChange,
    handlePageChange,
  };
}
