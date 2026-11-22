/**
 * Selector de atributos: los elegidos como etiquetas (con ✕ para quitar) y un buscador para agregar
 * (por nombre o tipo, sin tildes ni mayúsculas). Lo usan los roles de una meta ("Fuentes de azúcar")
 * y la restricción de embarazo.
 */
import { useMemo, useState } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import type { AttributeOption } from '../../../hooks/useAttributeOptions';
import { matchesSearch } from '../../../utils/search';

interface AttributePickerProps {
  id: string;
  options: AttributeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Atributos vinculados que no están en `options` (ej. la lista todavía no cargó). */
  fallbackNames?: Record<string, string>;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_RESULTS = 8;

export function AttributePicker({ id, options, selectedIds, onChange, fallbackNames = {}, disabled, placeholder }: AttributePickerProps) {
  const [query, setQuery] = useState('');
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const selected = new Set(selectedIds);
    return options
      .filter((o) => !selected.has(o.id) && (matchesSearch(o.name, q) || matchesSearch(o.typeName, q)))
      .slice(0, MAX_RESULTS);
  }, [query, options, selectedIds]);

  const add = (attrId: string) => {
    onChange([...selectedIds, attrId]);
    setQuery('');
  };

  return (
    <div className="attr-picker">
      {selectedIds.length > 0 ? (
        <div className="attr-picker-chips">
          {selectedIds.map((attrId) => {
            const o = byId.get(attrId);
            return (
              <span key={attrId} className="attr-picker-chip">
                {o?.typeName && <span className="attr-picker-chip-type">{o.typeName} ›</span>}
                {o?.name ?? fallbackNames[attrId] ?? attrId}
                <button
                  type="button"
                  className="attr-picker-chip-remove"
                  onClick={() => onChange(selectedIds.filter((x) => x !== attrId))}
                  disabled={disabled}
                  aria-label={`Quitar ${o?.name ?? fallbackNames[attrId] ?? 'atributo'}`}
                  title="Quitar"
                >
                  <IoCloseOutline size={14} />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="goal-muted">Ninguno vinculado.</p>
      )}

      <div className="attr-picker-search">
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results[0]) add(results[0].id);
            }
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder={placeholder ?? 'Buscar atributo para agregar...'}
          disabled={disabled}
          autoComplete="off"
        />
        {query.trim() && (
          <ul className="attr-picker-results" role="listbox">
            {results.length === 0 ? (
              <li className="attr-picker-empty">Sin resultados</li>
            ) : (
              results.map((o) => (
                <li key={o.id}>
                  <button type="button" className="attr-picker-option" onClick={() => add(o.id)}>
                    <span className="attr-picker-option-name">{o.name}</span>
                    <span className="attr-picker-option-type">
                      {o.typeName}
                      {o.isAuto ? ' · se asigna solo' : ''}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
