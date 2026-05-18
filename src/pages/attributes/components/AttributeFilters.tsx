/**
 * Componente de Filtros para Atributos
 */
import { SearchInput, FilterButtonGroup } from '../../../components/ui';
import type { FilterOption } from '../../../components/ui';
import type { AttributeType } from '../types';
import { getAttributeTypeLabel } from '../types';

interface AttributeFiltersProps {
  searchTerm: string;
  filterInspected: string;
  filterType: string;
  filterScore: string;
  attributeTypes: AttributeType[];
  onSearchChange: (value: string) => void;
  onFilterInspectedChange: (value: string) => void;
  onFilterTypeChange: (value: string) => void;
  onFilterScoreChange: (value: string) => void;
}

const VALIDATION_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'VALIDATED', label: 'Validados', className: 'filter-btn-validated' },
  { value: 'NOT_VALIDATED', label: 'Sin validar', className: 'filter-btn-not-validated' },
];

const SCORE_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'HIGH', label: 'Alto (8-10)', className: 'filter-btn-score-high' },
  { value: 'MEDIUM', label: 'Medio (5-7)', className: 'filter-btn-score-medium' },
  { value: 'LOW', label: 'Bajo (3-4)', className: 'filter-btn-score-low' },
  { value: 'VERY_LOW', label: 'Muy bajo (1-2)', className: 'filter-btn-score-vlow' },
];

export function AttributeFilters({
  searchTerm,
  filterInspected,
  filterType,
  filterScore,
  attributeTypes,
  onSearchChange,
  onFilterInspectedChange,
  onFilterTypeChange,
  onFilterScoreChange,
}: AttributeFiltersProps) {
  const typeOptions: FilterOption[] = [
    { value: 'ALL', label: 'Todos' },
    ...attributeTypes.map(t => ({
      value: t.id,
      label: getAttributeTypeLabel(t.type),
    })),
  ];

  return (
    <div className="attribute-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Buscar por nombre o justificación..."
      />

      <FilterButtonGroup
        label="Estado de Validación:"
        options={VALIDATION_OPTIONS}
        value={filterInspected}
        onChange={onFilterInspectedChange}
      />

      {attributeTypes.length > 0 && (
        <FilterButtonGroup
          label="Tipo de Atributo:"
          options={typeOptions}
          value={filterType}
          onChange={onFilterTypeChange}
        />
      )}

      <FilterButtonGroup
        label="Puntuación:"
        options={SCORE_OPTIONS}
        value={filterScore}
        onChange={onFilterScoreChange}
      />
    </div>
  );
}
