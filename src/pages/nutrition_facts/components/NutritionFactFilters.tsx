/**
 * Componente de filtros para valores nutricionales
 */
import { SearchInput, FilterButtonGroup } from '../../../components/ui';

interface NutritionFactFiltersProps {
  searchTerm: string;
  filterInspected: string;
  onSearchChange: (value: string) => void;
  onFilterInspectedChange: (value: string) => void;
}

const VALIDATION_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados', className: 'filter-btn-validated' },
  { value: 'NOT_VALIDATED', label: 'Sin validar', className: 'filter-btn-not-validated' },
];

export function NutritionFactFilters({
  searchTerm,
  filterInspected,
  onSearchChange,
  onFilterInspectedChange,
}: NutritionFactFiltersProps) {
  return (
    <div className="nutrition-fact-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="🔍 Buscar por nombre..."
      />
      <FilterButtonGroup
        label="Estado de Validación"
        options={VALIDATION_OPTIONS}
        value={filterInspected}
        onChange={onFilterInspectedChange}
      />
    </div>
  );
}
