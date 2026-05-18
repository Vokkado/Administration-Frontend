/**
 * Componente de Filtros de Usuarios
 */
import type { UserFilters as UserFiltersType } from '../types';
import { SearchInput, FilterButtonGroup, Button } from '../../../components/ui';
import './UserFilters.css';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFiltersChange: (filters: UserFiltersType) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos', className: 'filter-btn-active' },
  { value: 'false', label: 'Inactivos', className: 'filter-btn-inactive' },
];

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleActiveChange = (value: string) => {
    const active = value === '' ? null : value === 'true';
    onFiltersChange({ ...filters, active });
  };

  const handleLastAccessFromChange = (value: string) => {
    onFiltersChange({ ...filters, lastAccessFrom: value || undefined });
  };

  const handleLastAccessToChange = (value: string) => {
    onFiltersChange({ ...filters, lastAccessTo: value || undefined });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      active: null,
      lastAccessFrom: undefined,
      lastAccessTo: undefined,
    });
  };

  const currentStatusValue = filters.active === null ? '' : String(filters.active);

  return (
    <div className="filters-section">
      <SearchInput
        value={filters.search}
        onChange={handleSearchChange}
        placeholder="🔍 Buscar por nombre o correo electrónico..."
      />

      <FilterButtonGroup
        label="Estado"
        options={STATUS_OPTIONS}
        value={currentStatusValue}
        onChange={handleActiveChange}
      />

      {/* Filtro por fecha */}
      <div className="filter-section">
        <label>Último Acceso</label>
        <div className="date-filters">
          <div className="date-filter-group">
            <label htmlFor="last-access-from">Desde:</label>
            <input
              type="date"
              id="last-access-from"
              value={filters.lastAccessFrom || ''}
              onChange={(e) => handleLastAccessFromChange(e.target.value)}
              className="filter-date"
            />
          </div>
          <div className="date-filter-group">
            <label htmlFor="last-access-to">Hasta:</label>
            <input
              type="date"
              id="last-access-to"
              value={filters.lastAccessTo || ''}
              onChange={(e) => handleLastAccessToChange(e.target.value)}
              className="filter-date"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.search || filters.active !== null || filters.lastAccessFrom || filters.lastAccessTo) && (
        <div className="filter-actions">
          <Button variant="outline" size="small" onClick={handleClearFilters}>
            ✕ Limpiar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}
