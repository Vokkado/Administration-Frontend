/**
 * Componente de Filtros para Ingredientes
 */
import { SearchInput, FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';
import { RISK_LABELS } from '../types';

interface IngredientFiltersProps {
  searchTerm: string;
  filterRisk: string;
  filterInspected: string;
  filterReason: string;
  onSearchChange: (value: string) => void;
  onFilterRiskChange: (risk: string) => void;
  onFilterInspectedChange: (inspected: string) => void;
  onFilterReasonChange: (reason: string) => void;
}

const VALIDATION_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados', className: 'filter-btn-validated' },
  { value: 'NOT_VALIDATED', label: 'Sin validar', className: 'filter-btn-not-validated' },
];

const REASON_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'WITH_REASON', label: '📝 Con' },
  { value: 'WITHOUT_REASON', label: 'Sin' },
];

const RISK_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  ...Object.entries(RISK_LABELS).map(([value, label]) => ({
    value,
    label,
    className: `filter-btn-risk-${value}`,
  })),
];

export function IngredientFilters({
  searchTerm,
  filterRisk,
  filterInspected,
  filterReason,
  onSearchChange,
  onFilterRiskChange,
  onFilterInspectedChange,
  onFilterReasonChange
}: IngredientFiltersProps) {
  return (
    <div className="ingredient-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Buscar por nombre..."
      />

      <FilterButtonGroup
        label="Estado de Validación:"
        options={VALIDATION_OPTIONS}
        value={filterInspected}
        onChange={onFilterInspectedChange}
      />

      <FilterButtonGroup
        label="Justificación:"
        options={REASON_OPTIONS}
        value={filterReason}
        onChange={onFilterReasonChange}
      />

      <FilterButtonGroup
        label="Nivel de Riesgo:"
        options={RISK_OPTIONS}
        value={filterRisk}
        onChange={onFilterRiskChange}
      />
    </div>
  );
}
