/**
 * Componente de Filtros para Empresas
 */
import { SearchInput, FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';
import { getCountryName } from '../types';

interface CompanyFiltersProps {
  searchTerm: string;
  filterInspected: string;
  filterCountry: string;
  availableCountries: string[];
  onSearchChange: (value: string) => void;
  onFilterInspectedChange: (value: string) => void;
  onFilterCountryChange: (value: string) => void;
}

const VALIDATION_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados', className: 'filter-btn-validated' },
  { value: 'NOT_VALIDATED', label: 'Sin validar', className: 'filter-btn-not-validated' },
];

export function CompanyFilters({
  searchTerm,
  filterInspected,
  filterCountry,
  availableCountries,
  onSearchChange,
  onFilterInspectedChange,
  onFilterCountryChange,
}: CompanyFiltersProps) {
  const countryOptions: FilterOption[] = [
    { value: 'ALL', label: 'Todos' },
    ...availableCountries.map(code => ({
      value: code,
      label: getCountryName(code),
    })),
  ];

  return (
    <div className="company-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Buscar por nombre o dirección..."
      />

      <FilterButtonGroup
        label="Estado de Validación:"
        options={VALIDATION_OPTIONS}
        value={filterInspected}
        onChange={onFilterInspectedChange}
      />

      {availableCountries.length > 0 && (
        <FilterButtonGroup
          label="País:"
          options={countryOptions}
          value={filterCountry}
          onChange={onFilterCountryChange}
        />
      )}
    </div>
  );
}
