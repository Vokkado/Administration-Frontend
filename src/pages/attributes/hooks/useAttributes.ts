/**
 * Hook para gestión de Atributos (Attributes) y Tipos de Atributo (AttributeTypes)
 * Server-side pagination & filtering via usePaginatedList
 */
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api.service';
import { AttributesService } from '../../../services/attributes.service';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import type { PaginatedFetchParams } from '../../../hooks/usePaginatedList';
import type {
  Attribute,
  AttributeType,
  CreateAttributeData,
  UpdateAttributeData,
  CreateAttributeTypeData,
  UpdateAttributeTypeData,
} from '../types';
import { getAttributeTypeLabel } from '../types';

const normalizeAttribute = (a: any): Attribute => ({
  ...a,
  restrictionIds: a.restrictionIds || a.restriction_ids || [],
});

export function useAttributes() {
  // ── Local filter state ──────────────────────────────────────────────
  const [filterInspected, setFilterInspected] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterScore, setFilterScore] = useState<string>('ALL');

  // ── AttributeTypes state (dual-entity) ──────────────────────────────
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);

  // ── Derived API params ──────────────────────────────────────────────
  const inspected =
    filterInspected === 'ALL' ? undefined : filterInspected === 'VALIDATED';
  const typeId = filterType === 'ALL' ? undefined : filterType;
  const scoreRange = filterScore === 'ALL' ? undefined : filterScore;

  // ── Fetch function for usePaginatedList ─────────────────────────────
  const fetchFn = useCallback(
    (params: PaginatedFetchParams) =>
      AttributesService.listAdminAttributes({
        ...params,
        inspected,
        typeId,
        scoreRange,
      }),
    [inspected, typeId, scoreRange],
  );

  // ── Paginated list ──────────────────────────────────────────────────
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
  } = usePaginatedList<Attribute>({
    fetchFn,
    normalize: normalizeAttribute,
  });

  // Aliases
  const attributes = items;
  const paginatedAttributes = items;
  const filteredAttributes = items;

  // ── Fetch attribute types on mount ──────────────────────────────────
  const fetchAttributeTypes = async () => {
    try {
      const response = await apiService.get<any>('/attribute-types');
      const data = response?.data?.data || response?.data || response;
      setAttributeTypes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Error al cargar tipos de atributo',
      );
    }
  };

  useEffect(() => {
    fetchAttributeTypes();
  }, []);

  // ── Fetch all attributes (for dropdowns/modals) ────────────────────
  const fetchAllAttributes = async (): Promise<Attribute[]> => {
    const response = await apiService.get<any>('/attributes');
    const data = response?.data?.data || response?.data || response;
    const attributeList = Array.isArray(data) ? data : [];
    return attributeList.map(normalizeAttribute);
  };

  // ── Attribute CRUD ──────────────────────────────────────────────────
  const createAttribute = async (data: CreateAttributeData) => {
    await apiService.post('/attributes', data);
    await refetch();
  };

  const updateAttribute = async (id: string, data: UpdateAttributeData) => {
    await apiService.put(`/attributes/${id}`, data);
    await refetch();
  };

  const deleteAttribute = async (id: string) => {
    await apiService.delete(`/attributes/${id}`);
    await refetch();
  };

  const validateAttribute = async (id: string, isInspected: boolean) => {
    await apiService.put(`/attributes/${id}`, { isInspected });
    await refetch();
  };

  // ── AttributeType CRUD ──────────────────────────────────────────────
  const createAttributeType = async (data: CreateAttributeTypeData) => {
    const response = await apiService.post<any>('/attribute-types', data);
    await fetchAttributeTypes();
    return response?.data || response;
  };

  const updateAttributeType = async (
    id: string,
    data: UpdateAttributeTypeData,
  ) => {
    await apiService.put(`/attribute-types/${id}`, data);
    await fetchAttributeTypes();
  };

  const deleteAttributeType = async (id: string) => {
    try {
      await apiService.delete(`/attribute-types/${id}`);
      await fetchAttributeTypes();
    } catch (err: any) {
      throw new Error(
        err.response?.data?.message || 'Error al eliminar tipo de atributo',
      );
    }
  };

  const validateAttributeType = async (
    id: string,
    isInspected: boolean,
  ) => {
    await apiService.put(`/attribute-types/${id}`, { isInspected });
    await fetchAttributeTypes();
  };

  // ── Helper: get type name by ID ─────────────────────────────────────
  const getTypeName = (typeId: string): string => {
    const type = attributeTypes.find((t) => t.id === typeId);
    return type ? getAttributeTypeLabel(type.type) : 'Desconocido';
  };

  return {
    attributes,
    attributeTypes,
    filteredAttributes,
    paginatedAttributes,
    total,
    loading,
    error,
    searchTerm,
    filterInspected,
    filterType,
    filterScore,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterInspected,
    setFilterType,
    setFilterScore,
    setCurrentPage,
    setError,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    validateAttribute,
    createAttributeType,
    updateAttributeType,
    deleteAttributeType,
    validateAttributeType,
    getTypeName,
    fetchAllAttributes,
    fetchAttributes: refetch,
    fetchAttributeTypes,
  };
}
