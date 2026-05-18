/**
 * Componente de Filtros para Variantes de Ingrediente
 */
import { SearchInput, FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';

interface VariantFiltersProps {
  searchTerm: string;
  filterInspected: string;
  onSearchChange: (value: string) => void;
  onFilterInspectedChange: (value: string) => void;
}

const VALIDATION_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados', className: 'filter-btn-validated' },
  { value: 'NOT_VALIDATED', label: 'Sin validar', className: 'filter-btn-not-validated' },
];

export function VariantFilters({
  searchTerm,
  filterInspected,
  onSearchChange,
  onFilterInspectedChange,
}: VariantFiltersProps) {
  return (
    <div className="ingredient-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Buscar por nombre de variante o ingrediente..."
      />

      <FilterButtonGroup
        label="Estado de Validación:"
        options={VALIDATION_OPTIONS}
        value={filterInspected}
        onChange={onFilterInspectedChange}
      />
    </div>
  );
}
