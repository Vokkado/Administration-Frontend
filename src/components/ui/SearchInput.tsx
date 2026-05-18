/**
 * Componente SearchInput
 * Campo de búsqueda reutilizable con icono integrado
 */

import './SearchInput.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
  maxLength?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = '🔍 Buscar...',
  fullWidth = true,
  maxLength = 200,
}: SearchInputProps) {
  return (
    <div className={`search-input-wrapper ${fullWidth ? 'search-input-fullwidth' : ''}`}>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
    </div>
  );
}
