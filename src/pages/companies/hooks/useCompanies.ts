/**
 * Hook para gestión de Empresas (Companies) - server-side pagination
 * Refactored to use the generic usePaginatedList hook.
 */
import { useCallback, useState, useEffect } from 'react';
import { apiService } from '../../../services/api.service';
import { CompaniesService } from '../../../services/companies.service';
import { usePaginatedList, type PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type { Company, CreateCompanyData, UpdateCompanyData } from '../types';

export function useCompanies() {
  // Local filter state
  const [filterInspected, setFilterInspected] = useState<string>('ALL');
  const [filterCountry, setFilterCountry] = useState<string>('ALL');

  // Country list (fetched once on mount from all companies)
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  // Derive API param values from filter state
  const inspected = filterInspected === 'ALL'
    ? undefined
    : filterInspected === 'VALIDATED';

  const countryCode = filterCountry === 'ALL'
    ? undefined
    : filterCountry;

  // Fetch function that captures current filter values
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      CompaniesService.listAdminCompanies({
        ...params,
        inspected,
        countryCode,
      }),
    [inspected, countryCode],
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
  } = usePaginatedList<Company>({ fetchFn });

  // Fetch all companies once on mount for country list
  const fetchAllCompanies = async (): Promise<Company[]> => {
    const response = await apiService.get<any>('/companies');
    const data = response?.data?.data || response?.data || response;
    const normalizedData = Array.isArray(data) ? data : [];
    return normalizedData;
  };

  useEffect(() => {
    fetchAllCompanies().then(all => {
      const countries = Array.from(
        new Set(all.map(c => c.countryCode).filter(Boolean))
      ).sort() as string[];
      setAvailableCountries(countries);
    }).catch(() => {
      // Silently fail; country list will be empty
    });
  }, []);

  // CRUD operations — call refetch() after each mutation
  const createCompany = async (data: CreateCompanyData) => {
    await apiService.post('/companies', data);
    await refetch();
  };

  const updateCompany = async (id: string, data: UpdateCompanyData) => {
    await apiService.put(`/companies/${id}`, data);
    await refetch();
  };

  const deleteCompany = async (id: string) => {
    await apiService.delete(`/companies/${id}`);
    await refetch();
  };

  const validateCompany = async (id: string, isInspected: boolean) => {
    await apiService.put(`/companies/${id}`, { isInspected });
    await refetch();
  };

  // Compatibility aliases
  const companies = items;
  const paginatedCompanies = items;
  const filteredCompanies = items;

  return {
    companies,
    filteredCompanies,
    paginatedCompanies,
    total,
    loading,
    error,
    searchTerm,
    filterInspected,
    filterCountry,
    currentPage,
    totalPages,
    availableCountries,
    setSearchTerm,
    setFilterInspected,
    setFilterCountry,
    setCurrentPage,
    setError,
    createCompany,
    updateCompany,
    deleteCompany,
    validateCompany,
    fetchAllCompanies,
  };
}
