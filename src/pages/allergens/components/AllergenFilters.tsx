/**
 * Componente de Filtros para Alérgenos
 */
import { SearchInput } from '../../../components/ui';

interface AllergenFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function AllergenFilters({
  searchTerm,
  onSearchChange
}: AllergenFiltersProps) {
  return (
    <div className="allergen-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Buscar por nombre..."
      />
    </div>
  );
}
