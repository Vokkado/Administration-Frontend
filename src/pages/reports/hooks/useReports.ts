/**
 * Hook personalizado para listado de reportes (Admin)
 */

import { useCallback, useEffect, useState } from 'react';
import type { AdminReportListItem, AdminReportsFilters, ReportStatus, ReportType } from '../types';
import { ReportsService } from '../../../services/reports.service';

export function useReports() {
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<AdminReportsFilters>({
    type: 'ALL',
    status: 'ALL',
  });

  const limit = 10;

  const fetchReports = useCallback(
    async (page: number, currentFilters: AdminReportsFilters) => {
      setLoading(true);
      setError('');

      try {
        const offset = (page - 1) * limit;
        const type = currentFilters.type === 'ALL' ? undefined : (currentFilters.type as ReportType);
        const status = currentFilters.status === 'ALL' ? undefined : (currentFilters.status as ReportStatus);

        const data = await ReportsService.listAdminReports({
          limit,
          offset,
          type,
          status,
        });

        setItems(data.items || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / limit)));
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('No autorizado. Por favor, inicia sesión nuevamente.');
        } else if (err.response?.status === 403) {
          setError('No tienes permisos para acceder a esta información.');
        } else {
          setError(err.response?.data?.message || err.message || 'Error al cargar reportes');
        }
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchReports(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters: AdminReportsFilters) => {
      setFilters(newFilters);
      setCurrentPage(1);
      fetchReports(1, newFilters);
    },
    [fetchReports]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchReports(page, filters);
    },
    [fetchReports, filters]
  );

  const retry = useCallback(() => {
    fetchReports(currentPage, filters);
  }, [fetchReports, currentPage, filters]);

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
    retry,
  };
 }
