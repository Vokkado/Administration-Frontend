/**
 * Componente FilterButtonGroup
 * Grupo de botones de filtro reutilizable (Todos / Validados / Sin validar, etc.)
 */

import './FilterButtonGroup.css';

export interface FilterOption {
  value: string;
  label: string;
  /** Clase CSS adicional para el botón, ej: 'filter-btn-validated' */
  className?: string;
}

interface FilterButtonGroupProps {
  label?: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterButtonGroup({
  label,
  options,
  value,
  onChange,
}: FilterButtonGroupProps) {
  return (
    <div className="filter-button-group">
      {label && <label className="filter-group-label">{label}</label>}
      <div className="filter-buttons">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={[
              'filter-btn',
              option.className || '',
              value === option.value ? 'active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
