/**
 * Componente de Filtros para Restricciones
 */
import { SearchInput, FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';
import { RESTRICTION_TYPE_LABELS } from '../types';

interface RestrictionFiltersProps {
  searchTerm: string;
  filterType: string;
  filterStatus: string;
  filterAbsolute: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onAbsoluteChange: (value: string) => void;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas', className: 'filter-btn-active' },
  { value: 'INACTIVE', label: 'Inactivas', className: 'filter-btn-inactive' },
];

const TYPE_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todas' },
  ...Object.entries(RESTRICTION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const ABSOLUTE_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ABSOLUTE', label: 'Absolutas' },
  { value: 'NON_ABSOLUTE', label: 'No absolutas' },
];

export function RestrictionFilters({
  searchTerm,
  filterType,
  filterStatus,
  filterAbsolute,
  onSearchChange,
  onFilterChange,
  onStatusChange,
  onAbsoluteChange
}: RestrictionFiltersProps) {
  return (
    <div className="restriction-filters">
      <div className="filters-row">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o descripción..."
        />
        <FilterButtonGroup
          label="Estado"
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={onStatusChange}
        />
      </div>
      <FilterButtonGroup
        label="Tipo:"
        options={TYPE_OPTIONS}
        value={filterType}
        onChange={onFilterChange}
      />
      <FilterButtonGroup
        label="Absoluta:"
        options={ABSOLUTE_OPTIONS}
        value={filterAbsolute}
        onChange={onAbsoluteChange}
      />
    </div>
  );
}

