import { SearchInput } from '../../../components/ui';

interface FaqFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function FaqFilters({ searchTerm, onSearchChange }: FaqFiltersProps) {
  return (
    <div className="faq-filters">
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Buscar por categoría, pregunta, respuesta o keywords..."
      />
    </div>
  );
}
